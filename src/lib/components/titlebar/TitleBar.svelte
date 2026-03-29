<!--
  TitleBar.svelte — 无边框标题栏

  包含：拖拽区域 + 应用名 + 最小化/关闭按钮
  使用 GlassPanel + DragRegion + IconButton 组合
  适用于 Tauri 无边框窗口（decorations: false）
-->
<script lang="ts">
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { Minus, X } from 'lucide-svelte';
  import { GlassPanel, DragRegion, IconButton, Tooltip } from '$lib/components/shared';

  /** 组件属性 */
  interface Props {
    /** 应用标题 */
    title?: string;
  }

  const { title = 'Desktop AI Assistant' }: Props = $props();

  /** 最小化窗口 */
  function handleMinimize(): void {
    getCurrentWindow().minimize();
  }

  /** 关闭窗口 */
  function handleClose(): void {
    getCurrentWindow().close();
  }
</script>

<GlassPanel variant="light" radius="sm" class="titlebar">
  <div class="titlebar-inner">
    <!-- 拖拽区域（占据标题栏大部分空间） -->
    <DragRegion class="titlebar-drag">
      <span class="titlebar-title">{title}</span>
    </DragRegion>

    <!-- 窗口控制按钮组 -->
    <div class="titlebar-actions">
      <Tooltip text="最小化">
        <IconButton onclick={handleMinimize} title="最小化" size={28}>
          <Minus size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip text="关闭">
        <IconButton onclick={handleClose} title="关闭" variant="danger" size={28}>
          <X size={14} />
        </IconButton>
      </Tooltip>
    </div>
  </div>
</GlassPanel>

<style>
  :global(.titlebar) {
    flex-shrink: 0;
    border-radius: 0 !important;
    border-top: none !important;
    border-left: none !important;
    border-right: none !important;
  }

  .titlebar-inner {
    display: flex;
    align-items: center;
    height: 36px;
    padding: 0 4px 0 12px;
  }

  :global(.titlebar-drag) {
    flex: 1;
    display: flex;
    align-items: center;
    height: 100%;
  }

  .titlebar-title {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
    user-select: none;
  }

  .titlebar-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
</style>
