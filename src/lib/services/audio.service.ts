import { invoke } from '@tauri-apps/api/core';
import { AUDIO_PLAYBACK_LEVEL_EVENT } from '$lib/constants';
import type { AudioPlaybackLevelDetail } from '$lib/constants';
import { extractErrorMessage } from '$lib/utils';
import type { ApiConfig } from '$lib/types';

interface TtsOptions {
    endpoint?: string;
    model?: string;
    voice?: string;
    format?: string;
    extraParametersJson?: string;
}

export class AudioService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private onDataCallback: ((base64Chunk: string) => void) | null = null;
    private playbackContext: AudioContext | null = null;
    private playbackMonitorStopper: (() => void) | null = null;

    /**
     * 释放录音相关资源，避免麦克风句柄泄漏导致后续报 Device in use。
     */
    private releaseRecordingResources(forceStopRecorder: boolean = false): void {
        if (this.mediaRecorder) {
            try {
                this.mediaRecorder.ondataavailable = null;
                this.mediaRecorder.onstop = null;

                if (forceStopRecorder && this.mediaRecorder.state !== 'inactive') {
                    this.mediaRecorder.stop();
                }
            } catch (error) {
                console.warn('释放 MediaRecorder 资源时出现异常:', error);
            }
        }

        if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
        }

        this.mediaRecorder = null;
        this.stream = null;
        this.audioChunks = [];
        this.onDataCallback = null;
    }

    /**
     * 将浏览器录音启动错误归一化为可行动的提示文案。
     */
    private formatRecordingStartError(error: unknown): string {
        const rawMessage = extractErrorMessage(error, '无法启动录音');
        const name =
            error instanceof DOMException
                ? error.name
                : (typeof error === 'object' && error !== null && 'name' in error)
                    ? String((error as { name?: unknown }).name ?? '')
                    : '';
        const lower = `${name} ${rawMessage}`.toLowerCase();

        if (name === 'NotAllowedError' || lower.includes('permission denied') || lower.includes('denied')) {
            return '麦克风权限被拒绝，请在系统或浏览器权限中允许本应用访问麦克风。';
        }

        if (name === 'NotFoundError' || lower.includes('not found') || lower.includes('no device')) {
            return '未检测到可用麦克风，请检查设备连接与系统输入设备设置。';
        }

        if (
            name === 'NotReadableError' ||
            lower.includes('device in use') ||
            lower.includes('could not start audio source') ||
            lower.includes('trackstarterror')
        ) {
            return '麦克风被占用（Device in use）。请关闭占用麦克风的软件后重试，若仍失败可重启本应用。';
        }

        if (name === 'NotSupportedError' || lower.includes('not supported')) {
            return '当前环境不支持录音格式或录音接口，请检查系统与浏览器兼容性。';
        }

        return rawMessage;
    }

    /**
     * 广播当前播放音量（0-1），供 Live2D 组件驱动嘴型。
     */
    private emitPlaybackLevel(level: number): void {
        if (typeof window === 'undefined') {
            return;
        }

        const normalizedLevel = Number.isFinite(level)
            ? Math.max(0, Math.min(1, level))
            : 0;

        const detail: AudioPlaybackLevelDetail = { level: normalizedLevel };
        window.dispatchEvent(new CustomEvent<AudioPlaybackLevelDetail>(AUDIO_PLAYBACK_LEVEL_EVENT, { detail }));
    }

    /**
     * 停止上一段音频的口型监控，避免多段播放时相互干扰。
     */
    private stopPlaybackMonitor(): void {
        if (this.playbackMonitorStopper) {
            this.playbackMonitorStopper();
            this.playbackMonitorStopper = null;
            return;
        }

        this.emitPlaybackLevel(0);
    }

    /**
     * 启动播放音量监控，按帧推送音频 RMS 到口型事件。
     */
    private startPlaybackMonitor(analyser: AnalyserNode): () => void {
        const timeDomain = new Uint8Array(analyser.fftSize);
        let rafId = 0;
        let active = true;
        let lastRms = 0;
        let peakEnvelope = 0;

        const tick = () => {
            if (!active) {
                return;
            }

            analyser.getByteTimeDomainData(timeDomain);

            let sumSquares = 0;
            for (let i = 0; i < timeDomain.length; i += 1) {
                const sample = (timeDomain[i] - 128) / 128;
                sumSquares += sample * sample;
            }

            const rms = Math.sqrt(sumSquares / timeDomain.length);
            peakEnvelope = Math.max(rms, peakEnvelope * 0.82);
            const flux = Math.max(0, rms - lastRms);
            lastRms = rms;

            // 语音 RMS 在真实场景里通常偏小，先做噪声门限再非线性放大，避免口型几乎不动。
            const gatedRms = Math.max(0, rms - 0.01);
            const amplified = Math.min(1, gatedRms * 8);
            const mappedLevel = Math.pow(amplified, 0.65);
            const nowSeconds = performance.now() / 1000;
            const dynamicLift = Math.min(
                0.26,
                flux * 4.6 + Math.max(0, peakEnvelope - rms) * 1.15
            );
            const plateauWobble =
                mappedLevel > 0.72
                    ? (Math.sin(nowSeconds * 17.5) + Math.sin(nowSeconds * 9.2 + 1.2) * 0.55) * 0.045
                    : 0;
            this.emitPlaybackLevel(
                Math.min(1, Math.max(0, mappedLevel + dynamicLift + plateauWobble))
            );

            rafId = window.requestAnimationFrame(tick);
        };

        rafId = window.requestAnimationFrame(tick);

        return () => {
            if (!active) {
                return;
            }

            active = false;
            window.cancelAnimationFrame(rafId);
            this.emitPlaybackLevel(0);
        };
    }

    async startRecording(timeslice?: number, onData?: (base64Chunk: string) => void): Promise<void> {
        try {
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                throw new Error('已有录音任务正在进行，请先停止当前录音。');
            }

            // 兜底清理历史残留，避免上次异常后句柄未释放导致设备占用。
            this.releaseRecordingResources(true);

            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];
            this.onDataCallback = onData || null;

            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            if (timeslice) {
                this.mediaRecorder.start(timeslice);
            } else {
                this.mediaRecorder.start();
            }
        } catch (error) {
            console.error('Error starting audio recording:', error);

            // 启动失败后立刻清理，避免僵尸流占住麦克风。
            this.releaseRecordingResources(true);
            throw new Error(this.formatRecordingStartError(error));
        }
    }

    stopRecording(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                this.releaseRecordingResources();
                reject(new Error('No recording in progress.'));
                return;
            }

            if (this.mediaRecorder.state === 'inactive') {
                this.releaseRecordingResources();
                reject(new Error('录音已结束，请重新开始录音。'));
                return;
            }

            const recorder = this.mediaRecorder;

            recorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    const base64Audio = await this.blobToWavBase64(audioBlob);

                    resolve(base64Audio);
                } catch (error) {
                    reject(new Error(extractErrorMessage(error, '音频处理失败')));
                } finally {
                    this.releaseRecordingResources();
                }
            };

            try {
                recorder.stop();
            } catch (error) {
                this.releaseRecordingResources(true);
                reject(new Error(extractErrorMessage(error, '停止录音失败')));
            }
        });
    }

    private async blobToWavBase64(blob: Blob): Promise<string> {
        const arrayBuffer = await blob.arrayBuffer();
        const audioContext = new window.AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const wavBuffer = this.audioBufferToWav(audioBuffer);
        
        let binary = '';
        const bytes = new Uint8Array(wavBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    
    private audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
        const numChannels = 1; 
        const sampleRate = buffer.sampleRate;
        const format = 1; 
        const bitDepth = 16;
        
        let result: Float32Array;
        if (buffer.numberOfChannels > 1) {
            const left = buffer.getChannelData(0);
            const right = buffer.getChannelData(1);
            result = new Float32Array(left.length);
            for (let i = 0; i < left.length; ++i) {
                result[i] = (left[i] + right[i]) / 2;
            }
        } else {
            result = buffer.getChannelData(0);
        }
        
        const bufferLen = result.length * 2;
        const wavBuffer = new ArrayBuffer(44 + bufferLen);
        const view = new DataView(wavBuffer);
        
        const writeString = (view: DataView, offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + bufferLen, true);
        writeString(view, 8, 'WAVE');
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true);
        view.setUint16(32, numChannels * 2, true);
        view.setUint16(34, bitDepth, true);
        writeString(view, 36, 'data');
        view.setUint32(40, bufferLen, true);
        
        let offset = 44;
        for (let i = 0; i < result.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, result[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        
        return wavBuffer;
    }

    async transcribeAudio(base64Audio: string): Promise<string> {
        try {
            return await invoke('stt_transcribe_audio', { audioBase64: base64Audio, format: 'wav' });
        } catch (error) {
            console.error('Error transcribing audio:', error);
            throw new Error(extractErrorMessage(error, '语音识别失败'));
        }
    }

    /**
     * 预热播放通道，尽量在用户点击发送时调用，避免后续自动播报被策略拦截。
     */
    async primePlayback(): Promise<void> {
        try {
            await this.getPlaybackContext();
            console.info('播放通道已预热');
        } catch (error) {
            console.warn('预热播放通道失败:', error);
        }
    }

    async synthesizeSpeech(text: string, options?: TtsOptions): Promise<number[]> {
        try {
            return await invoke('tts_synthesize_speech', {
                text,
                voice: options?.voice ?? 'longxiaoxia',
                model: options?.model ?? '',
                endpoint: options?.endpoint ?? '',
                format: options?.format ?? 'wav',
                extraParametersJson: options?.extraParametersJson ?? '',
            });
        } catch (error) {
            console.error('Error synthesizing speech:', error);
            throw new Error(extractErrorMessage(error, '语音合成失败'));
        }
    }

    synthesizeSpeechWithConfig(text: string, apiConfig: ApiConfig): Promise<number[]> {
        return this.synthesizeSpeech(text, {
            endpoint: apiConfig.aliyun_tts_endpoint,
            model: apiConfig.aliyun_tts_model,
            voice: apiConfig.aliyun_tts_voice,
            format: apiConfig.aliyun_tts_format,
            extraParametersJson: apiConfig.aliyun_tts_extra_parameters_json,
        });
    }

    playAudio(audioBytes: number[]): Promise<void> {
        return new Promise((resolve) => {
            if (!audioBytes.length) {
                console.warn('播放音频被跳过：后端未返回音频数据');
                this.emitPlaybackLevel(0);
                resolve();
                return;
            }

            this.stopPlaybackMonitor();

            console.info('开始播放音频', { bytesLength: audioBytes.length });
            this.getPlaybackContext()
                .then(async (context) => {
                    const arrayBuffer = new Uint8Array(audioBytes).buffer;
                    const audioBuffer = await context.decodeAudioData(arrayBuffer.slice(0));
                    const source = context.createBufferSource();
                    const analyser = context.createAnalyser();
                    analyser.fftSize = 1024;
                    analyser.smoothingTimeConstant = 0.38;

                    source.buffer = audioBuffer;
                    source.connect(analyser);
                    analyser.connect(context.destination);

                    const stopMonitor = this.startPlaybackMonitor(analyser);
                    this.playbackMonitorStopper = stopMonitor;

                    source.onended = () => {
                        console.info('音频播放结束');

                        if (this.playbackMonitorStopper === stopMonitor) {
                            stopMonitor();
                            this.playbackMonitorStopper = null;
                        }

                        resolve();
                    };
                    source.start();
                })
                .catch((error) => {
                    console.error('Failed to play audio', error);

                    this.stopPlaybackMonitor();
                    resolve();
                });
        });
    }

    /**
     * 获取可用的播放上下文，并尽量恢复到 running 状态。
     */
    private async getPlaybackContext(): Promise<AudioContext> {
        if (!this.playbackContext) {
            this.playbackContext = new window.AudioContext({ sampleRate: 16000 });
        }

        if (this.playbackContext.state === 'suspended') {
            await this.playbackContext.resume();
        }

        return this.playbackContext;
    }
}

export const audioService = new AudioService();
