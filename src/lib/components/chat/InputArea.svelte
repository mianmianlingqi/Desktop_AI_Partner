<!--
  InputArea.svelte — 输入区域

  TextInput + 截图按钮 + 发送按钮
  如果当前有截图，显示小缩略图
  Enter 发送，Shift+Enter 换行
-->
<script lang="ts">
  import { Camera, Send, Square, Mic } from 'lucide-svelte';
  import { TextInput, IconButton, Tooltip } from '$lib/components/shared';
  import ImagePreview from './ImagePreview.svelte';
  import { audioService } from '$lib/services/audio.service';
  import { extractErrorMessage } from '$lib/utils';
  import {
    chatState,
    addMessage,
    startStreaming,
    appendDelta,
    finishStreaming,
    setStreamError,
    setSpeechStatus,
    clearSpeechStatus,
    captureState,
    clearImage,
    setCapturing,
    configState,
  } from '$lib/stores';
  import { sendMessage, abortChat, listenChatDelta, openOverlay } from '$lib/services';
  import type { ChatMessage } from '$lib/types';
  import type { UnlistenFn } from '@tauri-apps/api/event';

  /** 用户输入文本 */
  let inputText = $state('');

  /** chat:delta 事件注销函数 */
  let unlistenDelta: UnlistenFn | null = $state(null);

  /** 正在录音状态 */
  let isRecording = $state(false);

  /** 组件卸载时清理事件监听器 —— 防止内存泄漏 */
  $effect(() => {
    return () => {
      cleanupListener();
    };
  });

  /**
   * 发送消息 —— 组装请求并发送到后端
   */
  async function handleSend(): Promise<void> {
    const text = inputText.trim();
    if (!text && !captureState.currentImage) return;
    if (chatState.isStreaming) return;

    // 先预热播放通道，避免 AI 回复回来时音频播放丢失用户手势上下文。
    void audioService.primePlayback();

    // 1. 构建用户消息
    const images = captureState.currentImage ? [captureState.currentImage.base64] : undefined;
    const userMessage = { role: 'user' as const, content: text, images };
    addMessage(userMessage);

    // 2. 清空输入和截图
    inputText = '';
    clearImage();

    // 3. 开始流式接收
    startStreaming();

    // 4. 注册 delta 事件监听
    unlistenDelta = await listenChatDelta((event) => {
      if (event.error) {
        setStreamError(event.error);
        cleanupListener();
        return;
      }
      if (event.delta) {
        appendDelta(event.delta);
      }
      if (event.done) {
        finishStreaming();
        cleanupListener();

        // 自动触发语音合成播放
        const lastMsg = chatState.messages[chatState.messages.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && lastMsg.content) {
          void synthesizeAndPlayAssistant(lastMsg.content);
        }
      }
    });

    // 5. 发送请求到后端（chatState.messages 已包含 userMessage，无需再 concat）
    try {
      const requestMessages = buildRequestMessagesWithSystemPrompt(chatState.messages);
      await sendMessage({
        messages: requestMessages,
      });
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : String(err));
      cleanupListener();
    }
  }

  /** 清理事件监听器 */
  function cleanupListener(): void {
    if (unlistenDelta) {
      unlistenDelta();
      unlistenDelta = null;
    }
  }

  /** 中断流式请求 */
  async function handleAbort(): Promise<void> {
    try {
      await abortChat();
    } catch {
      // 静默处理中断错误
    }
    finishStreaming();
    cleanupListener();
  }

  /** 打开截图 Overlay */
  async function handleCapture(): Promise<void> {
    setCapturing(true);
    try {
      await openOverlay();
    } catch (err) {
      console.error('打开截图 Overlay 失败:', err);
      setCapturing(false);
    }
  }

  /** 切换录音状态 */
  async function toggleRecording(): Promise<void> {
    if (isRecording) {
      try {
        const base64Audio = await audioService.stopRecording();
        isRecording = false;
        
        // 调用 STT 转换文本
        try {
          const text = await audioService.transcribeAudio(base64Audio);
          if (text) {
            inputText += (inputText ? ' ' : '') + text;
          }
        } catch (err) {
          console.error('语音识别失败:', err);
          const errorMsg = extractErrorMessage(err, '语音识别未知错误');
          setStreamError(`语音识别失败: ${errorMsg}`);
        }
      } catch (err) {
        console.error('停止录音失败:', err);
        setStreamError(`停止录音失败: ${extractErrorMessage(err, '未知错误')}`);
        isRecording = false;
      }
    } else {
      try {
        await audioService.startRecording();
        isRecording = true;
      } catch (err) {
        console.error('由于权限等原因无法开始录音:', err);
        setStreamError(`无法开始录音: ${extractErrorMessage(err, '请检查麦克风权限')}`);
      }
    }
  }

  /** 自动合成并播放 assistant 消息，同时展示状态避免静默等待 */
  async function synthesizeAndPlayAssistant(content: string): Promise<void> {
    try {
      setSpeechStatus('正在合成语音...');
      const audioBytes = await audioService.synthesizeSpeechWithConfig(content, configState.config.api);
      setSpeechStatus('正在播放语音...');
      await audioService.playAudio(audioBytes);
    } catch (err) {
      console.error('自动语音合成失败:', err);
      setStreamError(`语音合成失败: ${extractErrorMessage(err, '未知错误')}`);
    } finally {
      clearSpeechStatus();
    }
  }

  /**
   * 组装发送给后端的消息列表
   * - 系统提示词来自设置页
   * - 不在用户输入框和消息列表中展示
   */
  function buildRequestMessagesWithSystemPrompt(messages: ChatMessage[]): ChatMessage[] {
    const prompt = configState.config.settings.system_prompt.trim();
    const messagesWithoutSystem = messages.filter((message) => message.role !== 'system');

    if (!prompt) {
      return messagesWithoutSystem;
    }

    return [
      { role: 'system', content: prompt },
      ...messagesWithoutSystem,
    ];
  }
</script>

<div class="input-area">
  <!-- 截图预览（如果有截图） -->
  {#if captureState.currentImage}
    <div class="image-bar">
      <ImagePreview
        base64={captureState.currentImage.base64}
        size={48}
        removable
        onremove={clearImage}
      />
    </div>
  {/if}

  <!-- 输入行 -->
  <div class="input-row">
    <!-- 截图按钮 -->
    <Tooltip text="截取屏幕区域">
      <IconButton
        onclick={handleCapture}
        title="截图"
        disabled={chatState.isStreaming || captureState.isCapturing}
      >
        <Camera size={18} />
      </IconButton>
    </Tooltip>

    <!-- 文本输入框 -->
    <TextInput
      bind:value={inputText}
      placeholder={isRecording ? '正在录音... (点击结束)' : (chatState.isStreaming ? 'AI 正在回复中...' : '输入消息... (Enter 发送)')}
      disabled={chatState.isStreaming || isRecording}
      onsubmit={handleSend}
      class="input-textarea"
    />

    <!-- 语音录制按钮 -->
    <Tooltip text={isRecording ? '停止录音' : '开始录音'}>
      <IconButton
        onclick={toggleRecording}
        title={isRecording ? '停止' : '语音'}
        variant={isRecording ? 'danger' : 'default'}
        disabled={chatState.isStreaming || captureState.isCapturing}
      >
        {#if isRecording}
          <Square size={18} />
        {:else}
          <Mic size={18} />
        {/if}
      </IconButton>
    </Tooltip>

    <!-- 发送 / 中断按钮 -->
    {#if chatState.isStreaming}
      <Tooltip text="中断生成">
        <IconButton onclick={handleAbort} title="中断" variant="danger">
          <Square size={16} />
        </IconButton>
      </Tooltip>
    {:else}
      <Tooltip text="发送消息">
        <IconButton
          onclick={handleSend}
          title="发送"
          variant="primary"
          disabled={!inputText.trim() && !captureState.currentImage}
        >
          <Send size={18} />
        </IconButton>
      </Tooltip>
    {/if}
  </div>

  <!-- 错误提示 -->
  {#if chatState.error}
    <div class="error-bar">
      <span class="error-text">{chatState.error}</span>
    </div>
  {/if}

  {#if chatState.speechStatus}
    <div class="speech-bar">
      <span class="speech-text">{chatState.speechStatus}</span>
    </div>
  {/if}
</div>

<style>
  .input-area {
    padding: 8px 12px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .image-bar {
    padding: 6px 0;
  }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }

  :global(.input-textarea) {
    flex: 1;
  }

  .error-bar {
    margin-top: 6px;
    padding: 4px 8px;
    background: rgba(239, 68, 68, 0.15);
    border-radius: 4px;
  }

  .error-text {
    font-size: 11px;
    color: #f87171;
  }

  .speech-bar {
    margin-top: 6px;
    padding: 4px 8px;
    background: rgba(59, 130, 246, 0.16);
    border-radius: 4px;
  }

  .speech-text {
    font-size: 11px;
    color: #93c5fd;
  }
</style>
