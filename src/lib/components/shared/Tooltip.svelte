<!--
  Tooltip.svelte — 基础 Tooltip 悬停提示

  显示在目标元素附近的简短提示文本
  支持上/下定位
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** 组件属性 */
  interface Props {
    /** 提示文本 */
    text: string;
    /** 定位方向 */
    position?: 'top' | 'bottom';
    /** 子内容（触发元素） */
    children: Snippet;
  }

  const { text, position = 'top', children }: Props = $props();

  /** 是否显示 tooltip */
  let visible = $state(false);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="tooltip-wrapper"
  onmouseenter={() => (visible = true)}
  onmouseleave={() => (visible = false)}
>
  {@render children()}
  {#if visible && text}
    <div class="tooltip tooltip--{position}" role="tooltip">
      {text}
    </div>
  {/if}
</div>

<style>
  .tooltip-wrapper {
    position: relative;
    display: inline-flex;
  }

  .tooltip {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    font-size: 11px;
    line-height: 1.3;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(0, 0, 0, 0.85);
    border-radius: 4px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 1000;
    animation: tooltip-fade-in 0.15s ease;
  }

  .tooltip--top {
    bottom: calc(100% + 6px);
  }

  .tooltip--bottom {
    top: calc(100% + 6px);
  }

  @keyframes tooltip-fade-in {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(2px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>
