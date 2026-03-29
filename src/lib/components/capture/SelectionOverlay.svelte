<!--
  SelectionOverlay.svelte — 截图选区

  这是 /overlay 路由使用的全屏组件
  鼠标拖拽画矩形选区
  半透明黑色遮罩 + 选中区域高亮
  mouseup 时发送坐标给 Rust 执行截图，然后关闭 overlay
  ESC 键取消
-->
<script lang="ts">
  import { captureScreen, closeOverlay } from '$lib/services';
  import { setImage, setCapturing } from '$lib/stores';

  /** 拖拽起始坐标 */
  let startX = $state(0);
  let startY = $state(0);

  /** 是否正在拖拽 */
  let isDragging = $state(false);

  /** 当前鼠标坐标 */
  let currentX = $state(0);
  let currentY = $state(0);

  /** 计算选区矩形 —— 需处理反向拖拽（从右下到左上） */
  const selectionRect = $derived({
    x: Math.min(startX, currentX),
    y: Math.min(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  });

  /** 鼠标按下 —— 开始画选区 */
  function handleMouseDown(e: MouseEvent): void {
    startX = e.clientX;
    startY = e.clientY;
    currentX = e.clientX;
    currentY = e.clientY;
    isDragging = true;
  }

  /** 鼠标移动 —— 更新选区 */
  function handleMouseMove(e: MouseEvent): void {
    if (!isDragging) return;
    currentX = e.clientX;
    currentY = e.clientY;
  }

  /** Overlay 关闭后截图前的等待时间（ms）—— 确保窗口已完全销毁 */
  const OVERLAY_CLOSE_DELAY_MS = 150;

  /** 鼠标松开 —— 执行截图并关闭 overlay */
  async function handleMouseUp(): Promise<void> {
    if (!isDragging) return;
    isDragging = false;

    const { x, y, width, height } = selectionRect;

    // 选区过小（误触）→ 直接取消
    if (width < 10 || height < 10) {
      await cancelOverlay();
      return;
    }

    try {
      // 1. 先关闭 overlay（避免截到 overlay 自身）
      await closeOverlay();

      // 2. 等待 overlay 窗口完全销毁
      await new Promise((resolve) => setTimeout(resolve, OVERLAY_CLOSE_DELAY_MS));

      // 3. DPI 缩放校正 —— CSS 逻辑像素 → 物理像素
      const dpr = window.devicePixelRatio || 1;
      const result = await captureScreen({
        x: Math.round(x * dpr),
        y: Math.round(y * dpr),
        width: Math.round(width * dpr),
        height: Math.round(height * dpr),
      });
      setImage(result);
    } catch (err) {
      console.error('截图失败:', err);
    } finally {
      setCapturing(false);
    }
  }

  /** ESC —— 取消截图 */
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      cancelOverlay();
    }
  }

  /** 取消并关闭 overlay */
  async function cancelOverlay(): Promise<void> {
    isDragging = false;
    setCapturing(false);
    try {
      await closeOverlay();
    } catch {
      // overlay 可能已关闭
    }
  }
</script>

<!-- 全局键盘监听 -->
<svelte:window onkeydown={handleKeyDown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- 全屏遮罩层 -->
<div
  class="overlay"
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  role="presentation"
>
  <!-- 提示文字 -->
  {#if !isDragging}
    <div class="hint">
      <p>拖拽鼠标选择截图区域</p>
      <p class="hint-sub">ESC 取消</p>
    </div>
  {/if}

  <!-- 选区高亮 -->
  {#if isDragging && selectionRect.width > 0 && selectionRect.height > 0}
    <div
      class="selection"
      style="
        left: {selectionRect.x}px;
        top: {selectionRect.y}px;
        width: {selectionRect.width}px;
        height: {selectionRect.height}px;
      "
    >
      <!-- 选区尺寸标注 -->
      <span class="selection-size">
        {selectionRect.width} × {selectionRect.height}
      </span>
    </div>
  {/if}
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    cursor: crosshair;
    z-index: 99999;
    user-select: none;
  }

  .hint {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: white;
    pointer-events: none;
  }

  .hint p {
    margin: 0;
    font-size: 18px;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
  }

  .hint-sub {
    font-size: 13px !important;
    opacity: 0.7;
    margin-top: 8px !important;
  }

  .selection {
    position: absolute;
    border: 2px solid rgba(99, 102, 241, 0.9);
    background: rgba(99, 102, 241, 0.08);
    box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.35);
    pointer-events: none;
  }

  .selection-size {
    position: absolute;
    bottom: -24px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: white;
    background: rgba(0, 0, 0, 0.7);
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }
</style>
