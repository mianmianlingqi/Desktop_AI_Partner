<!--
  DragRegion.svelte — 窗口拖拽区域

  使用 Tauri Window API 的 startDragging() 实现无边框窗口拖拽
  包裹此组件的区域可用于拖动整个窗口
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getCurrentWindow } from '@tauri-apps/api/window';

  /** 组件属性 */
  interface Props {
    /** 额外 CSS 类 */
    class?: string;
    /** 子内容插槽 */
    children?: Snippet;
  }

  const { class: className = '', children }: Props = $props();

  /** 鼠标按下时启动窗口拖拽 */
  function handleMouseDown(_e: MouseEvent): void {
    getCurrentWindow().startDragging();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="drag-region {className}"
  onmousedown={handleMouseDown}
  role="presentation"
>
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .drag-region {
    /* 拖拽区域 —— 可拖动窗口的交互区域 */
    -webkit-app-region: drag; /* stylelint-disable-line property-no-unknown */
    cursor: grab;
    user-select: none;
  }

  /* 拖拽区域内的可交互元素（按钮、输入框等）不走拖拽逻辑 */
  .drag-region :global(button),
  .drag-region :global(input),
  .drag-region :global(a) {
    -webkit-app-region: no-drag; /* stylelint-disable-line property-no-unknown */
  }
</style>
