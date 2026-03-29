<!--
  StreamingIndicator.svelte — 流式打字指示器

  当 AI 正在流式生成回复时，显示一个跳动的点点动画
  表示"AI 正在思考/生成中"
-->
<script lang="ts">
  /** 组件属性 */
  interface Props {
    /** 是否正在流式输出 */
    active?: boolean;
  }

  const { active = true }: Props = $props();
</script>

{#if active}
  <div class="streaming-indicator" aria-label="AI 正在回复中">
    <span class="dot"></span>
    <span class="dot"></span>
    <span class="dot"></span>
  </div>
{/if}

<style>
  .streaming-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 0;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.7);
    animation: bounce 1.4s ease-in-out infinite;
  }

  .dot:nth-child(2) {
    animation-delay: 0.16s;
  }

  .dot:nth-child(3) {
    animation-delay: 0.32s;
  }

  @keyframes bounce {
    0%, 80%, 100% {
      transform: scale(0.6);
      opacity: 0.4;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
