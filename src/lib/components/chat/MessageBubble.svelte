<!--
  MessageBubble.svelte — 消息气泡

  用户消息右对齐蓝色背景，AI 消息左对齐灰色背景
  AI 消息使用 MarkdownRenderer 渲染
  如果有附带图片，显示 ImagePreview 缩略图
-->
<script lang="ts">
  import { Loader2, Volume2 } from 'lucide-svelte';
  import { IconButton, Tooltip } from '$lib/components/shared';
  import { audioService } from '$lib/services/audio.service';
  import { configState, setStreamError } from '$lib/stores';
  import type { ChatMessage } from '$lib/types';
  import { extractErrorMessage } from '$lib/utils';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import ImagePreview from './ImagePreview.svelte';

  /** 组件属性 */
  interface Props {
    /** 消息数据 */
    message: ChatMessage;
  }

  const { message }: Props = $props();

  /** 是否为用户消息 */
  const isUser = $derived(message.role === 'user');

  /** 是否可触发语音合成 */
  const canSynthesize = $derived(!isUser && !!message.content.trim());

  /** 当前气泡是否正在执行语音合成 */
  let isSynthesizing = $state(false);

  /** 手动合成并播放当前 assistant 消息 */
  async function handleSynthesize(): Promise<void> {
    if (!canSynthesize || isSynthesizing) return;

    isSynthesizing = true;
    try {
      // 在用户点击按钮时预热播放通道，避免后续播放被策略拦截。
      await audioService.primePlayback();
      const audioBytes = await audioService.synthesizeSpeechWithConfig(
        message.content,
        configState.config.api,
      );
      await audioService.playAudio(audioBytes);
    } catch (err) {
      console.error('手动语音合成失败:', err);
      setStreamError(`语音合成失败: ${extractErrorMessage(err, '未知错误')}`);
    } finally {
      isSynthesizing = false;
    }
  }
</script>

<div class="message-row" class:message-row--user={isUser} class:message-row--assistant={!isUser}>
  <div class="message-bubble" class:message-bubble--user={isUser} class:message-bubble--assistant={!isUser}>
    <!-- 消息内容（selectable 类启用文本选中/复制） -->
    <div class="bubble-content selectable">
      {#if isUser}
        <!-- 用户消息 —— 纯文本显示 -->
        <p class="user-text">{message.content}</p>
      {:else}
        <!-- AI 消息 —— Markdown 渲染 -->
        <MarkdownRenderer content={message.content} />
      {/if}
    </div>

    <!-- 附带图片（如果有） -->
    {#if message.images && message.images.length > 0}
      <div class="bubble-images">
        {#each message.images as img}
          <ImagePreview base64={img} size={60} />
        {/each}
      </div>
    {/if}
  </div>

  {#if canSynthesize}
    <div class="bubble-actions">
      <Tooltip text={isSynthesizing ? '正在合成语音...' : '播放语音'}>
        <IconButton
          onclick={handleSynthesize}
          title="播放语音"
          disabled={isSynthesizing}
          size={26}
          variant="default"
        >
          {#if isSynthesizing}
            <span class="spin" aria-hidden="true">
              <Loader2 size={14} />
            </span>
          {:else}
            <Volume2 size={14} />
          {/if}
        </IconButton>
      </Tooltip>
    </div>
  {/if}
</div>

<style>
  .message-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    margin-bottom: 8px;
  }

  .message-row--user {
    justify-content: flex-end;
  }

  .message-row--assistant {
    justify-content: flex-start;
  }

  .bubble-actions {
    display: inline-flex;
    align-items: center;
    padding-bottom: 2px;
  }

  .spin {
    animation: spin 0.9s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .message-bubble {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 12px;
    animation: bubble-in 0.2s ease;
  }

  /* 用户消息 —— 右对齐蓝色 */
  .message-bubble--user {
    background: rgba(99, 102, 241, 0.25);
    border: 1px solid rgba(99, 102, 241, 0.4);
    border-bottom-right-radius: 4px;
  }

  /* AI 消息 —— 左对齐灰色 */
  .message-bubble--assistant {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom-left-radius: 4px;
  }

  .user-text {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.95);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .bubble-content {
    /* Markdown 渲染区域 */
    overflow-wrap: break-word;
  }

  .bubble-images {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  @keyframes bubble-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
