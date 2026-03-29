<!--
  TextInput.svelte — 自动增高文本输入框

  多行文本输入，内容增多时自动增高
  支持 Enter 发送 / Shift+Enter 换行
-->
<script lang="ts">
  /** 组件属性 */
  interface Props {
    /** 绑定的文本值 */
    value: string;
    /** 占位符文本 */
    placeholder?: string;
    /** 是否禁用 */
    disabled?: boolean;
    /** 最大行数 */
    maxRows?: number;
    /** 额外 CSS 类 */
    class?: string;
    /** Enter 键回调（非 Shift+Enter） */
    onsubmit?: () => void;
    /** 值变更回调 */
    oninput?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    placeholder = '输入消息...',
    disabled = false,
    maxRows = 6,
    class: className = '',
    onsubmit,
    oninput,
  }: Props = $props();

  /** textarea 元素引用 */
  let textareaEl: HTMLTextAreaElement | undefined = $state();

  /** 自动调整高度 */
  function autoResize(): void {
    if (!textareaEl) return;
    // 1. 重置高度以获取正确 scrollHeight
    textareaEl.style.height = 'auto';
    // 2. 计算单行高度
    const lineHeight = parseInt(getComputedStyle(textareaEl).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    // 3. 设置为实际内容高度（不超过最大行数）
    textareaEl.style.height = `${Math.min(textareaEl.scrollHeight, maxHeight)}px`;
  }

  /** 输入处理 —— bind:value 自动同步，此处仅触发回调和高度调整 */
  function handleInput(): void {
    oninput?.(value);
    autoResize();
  }

  /** 键盘事件 —— Enter 发送，Shift+Enter 换行 */
  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onsubmit?.();
    }
  }

  /** 值变化时自动调整高度 */
  $effect(() => {
    // 当外部修改 value 时也要调整高度
    void value;
    // 使用 tick 后调整，确保 DOM 已更新
    if (textareaEl) {
      requestAnimationFrame(autoResize);
    }
  });
</script>

<textarea
  bind:this={textareaEl}
  bind:value
  class="text-input {className}"
  {placeholder}
  {disabled}
  rows={1}
  oninput={handleInput}
  onkeydown={handleKeydown}
></textarea>

<style>
  .text-input {
    width: 100%;
    min-height: 36px;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    outline: none;
    resize: none;
    overflow-y: auto;
    transition: border-color 0.15s ease, background 0.15s ease;
    box-sizing: border-box;
  }

  .text-input::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }

  .text-input:focus {
    border-color: rgba(99, 102, 241, 0.5);
    background: rgba(255, 255, 255, 0.08);
  }

  .text-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
