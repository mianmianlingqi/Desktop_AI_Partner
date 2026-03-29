import { invoke } from '@tauri-apps/api/core';
import { extractErrorMessage } from '$lib/utils';

export class AudioService {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private stream: MediaStream | null = null;
    private onDataCallback: ((base64Chunk: string) => void) | null = null;

    async startRecording(timeslice?: number, onData?: (base64Chunk: string) => void): Promise<void> {
        try {
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
            throw new Error(extractErrorMessage(error, '无法启动录音'));
        }
    }

    stopRecording(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('No recording in progress.'));
                return;
            }

            this.mediaRecorder.onstop = async () => {
                try {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                    const base64Audio = await this.blobToWavBase64(audioBlob);
                    
                    if (this.stream) {
                        this.stream.getTracks().forEach(track => track.stop());
                        this.stream = null;
                    }
                    this.mediaRecorder = null;
                    this.audioChunks = [];

                    resolve(base64Audio);
                } catch (error) {
                    reject(new Error(extractErrorMessage(error, '音频处理失败')));
                }
            };

            this.mediaRecorder.stop();
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

    async synthesizeSpeech(text: string): Promise<number[]> {
        try {
            return await invoke('tts_synthesize_speech', { text, voice: 'longxiaoxia' });
        } catch (error) {
            console.error('Error synthesizing speech:', error);
            throw new Error(extractErrorMessage(error, '语音合成失败'));
        }
    }

    playAudio(audioBytes: number[]): Promise<void> {
        return new Promise((resolve) => {
            const blob = new Blob([new Uint8Array(audioBytes)], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.play().catch(e => {
                console.error("Failed to play audio", e);
                resolve();
            });
        });
    }
}

export const audioService = new AudioService();
