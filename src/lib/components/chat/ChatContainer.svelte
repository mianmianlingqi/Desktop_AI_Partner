<!--
  ChatContainer.svelte — 对话主容器

  消息列表 + 流式指示器 + 输入区域
  自动滚动到底部
-->
<script lang="ts">
  import { GlassPanel } from '$lib/components/shared';
  import MessageBubble from './MessageBubble.svelte';
  import StreamingIndicator from './StreamingIndicator.svelte';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import InputArea from './InputArea.svelte';
  import { chatState } from '$lib/stores';

  /** 消息列表容器引用 —— 用于自动滚动 */
  let messagesContainer: HTMLDivElement | undefined = $state();

  /** 自动滚动到底部 */
  function scrollToBottom(): void {
    if (messagesContainer) {
      requestAnimationFrame(() => {
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      });
    }
  }

  /** 消息变化或流式内容更新时自动滚动 */
  $effect(() => {
    // 追踪消息列表长度和流式内容变化
    void chatState.messages.length;
    void chatState.currentStreamContent;
    scrollToBottom();
  });
</script>

<GlassPanel variant="standard" fill class="chat-container">
  <div class="chat-layout">
    <!-- 消息列表 -->
    <div class="messages-area" bind:this={messagesContainer}>
      {#if chatState.messages.length === 0 && !chatState.isStreaming}
        <!-- 空状态提示 -->
        <div class="empty-state">
          <p class="empty-title">👋 你好！</p>
          <p class="empty-desc">我是你的 AI 助手，可以回答问题、分析截图。</p>
          <p class="empty-hint">输入消息开始对话，或点击截图按钮捕获屏幕区域。</p>
        </div>
      {:else}
        <!-- 消息气泡列表 -->
        {#each chatState.messages as message, i (i)}
          <MessageBubble {message} />
        {/each}

        <!-- 流式输出中 —— 显示正在生成的内容 -->
        {#if chatState.isStreaming && chatState.currentStreamContent}
          <div class="message-bubble message-bubble--assistant streaming">
            <MarkdownRenderer content={chatState.currentStreamContent} />
            <StreamingIndicator />
          </div>
        {:else if chatState.isStreaming}
          <!-- 等待第一个 token -->
          <div class="message-bubble message-bubble--assistant streaming">
            <StreamingIndicator />
          </div>
        {/if}
      {/if}
    </div>

    <!-- 输入区域 -->
    <InputArea />
  </div>
</GlassPanel>

<style>
  :global(.chat-container) {
    display: flex;
    flex-direction: column;
  }

  .chat-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 0;
    /* 自定义滚动条 */
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }

  .messages-area::-webkit-scrollbar {
    width: 4px;
  }
  .messages-area::-webkit-scrollbar-track {
    background: transparent;
  }
  .messages-area::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 2px;
  }

  /* 空状态 */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    text-align: center;
    padding: 32px;
  }

  .empty-title {
    font-size: 20px;
    margin: 0 0 8px;
    color: rgba(255, 255, 255, 0.9);
  }

  .empty-desc {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 4px;
  }

  .empty-hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin: 0;
  }

  /* 流式气泡样式（与 MessageBubble assistant 保持一致） */
  .message-bubble--assistant {
    align-self: flex-start;
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 12px;
    border-bottom-left-radius: 4px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
</style>
