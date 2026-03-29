<!--
  MessageBubble.svelte — 消息气泡

  用户消息右对齐蓝色背景，AI 消息左对齐灰色背景
  AI 消息使用 MarkdownRenderer 渲染
  如果有附带图片，显示 ImagePreview 缩略图
-->
<script lang="ts">
  import type { ChatMessage } from '$lib/types';
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
</script>

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

<style>
  .message-bubble {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 12px;
    margin-bottom: 8px;
    animation: bubble-in 0.2s ease;
  }

  /* 用户消息 —— 右对齐蓝色 */
  .message-bubble--user {
    align-self: flex-end;
    background: rgba(99, 102, 241, 0.25);
    border: 1px solid rgba(99, 102, 241, 0.4);
    border-bottom-right-radius: 4px;
  }

  /* AI 消息 —— 左对齐灰色 */
  .message-bubble--assistant {
    align-self: flex-start;
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
