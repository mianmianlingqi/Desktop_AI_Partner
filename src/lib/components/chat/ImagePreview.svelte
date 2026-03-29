<!--
  ImagePreview.svelte — 截图预览缩略图

  props: base64 图片数据 → 显示为可点击缩略图
  点击可放大查看完整截图
-->
<script lang="ts">
  import { base64ToDataUrl } from '$lib/utils';

  /** 组件属性 */
  interface Props {
    /** Base64 图片数据（不含 data: 前缀） */
    base64: string;
    /** 缩略图尺寸 */
    size?: number;
    /** 是否可移除 */
    removable?: boolean;
    /** 移除回调 */
    onremove?: () => void;
  }

  const {
    base64,
    size = 80,
    removable = false,
    onremove,
  }: Props = $props();

  /** 是否显示大图预览 */
  let showFull = $state(false);

  /** 完整 Data URL */
  const dataUrl = $derived(base64ToDataUrl(base64));
</script>

<!-- 全局 ESC 键监听 —— 关闭大图预览 -->
<svelte:window onkeydown={(e) => {
  if (showFull && e.key === 'Escape') showFull = false;
}} />

<!-- 缩略图 -->
<div class="image-preview" style="width: {size}px; height: {size}px;">
  <button class="thumbnail-btn" onclick={() => (showFull = true)} title="点击查看大图">
    <img src={dataUrl} alt="截图预览" class="thumbnail" />
  </button>

  {#if removable}
    <button class="remove-btn" onclick={onremove} title="移除截图" aria-label="移除截图">
      ×
    </button>
  {/if}
</div>

<!-- 大图遮罩 -->
{#if showFull}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="fullscreen-overlay" onclick={() => (showFull = false)}>
    <img src={dataUrl} alt="截图大图" class="full-image" />
  </div>
{/if}

<style>
  .image-preview {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    flex-shrink: 0;
  }

  .thumbnail-btn {
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }

  .thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .remove-btn {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 50%;
    font-size: 12px;
    cursor: pointer;
    line-height: 1;
    padding: 0;
  }

  .remove-btn:hover {
    background: rgba(239, 68, 68, 0.8);
  }

  .fullscreen-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.85);
    cursor: pointer;
  }

  .full-image {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 8px;
  }
</style>
