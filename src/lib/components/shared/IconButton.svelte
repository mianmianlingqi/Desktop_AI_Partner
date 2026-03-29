<!--
  IconButton.svelte — 图标按钮

  通用图标按钮组件，支持多种变体
  默认使用 lucide-svelte 图标通过 children 插槽传入
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  /** 按钮变体 —— 控制不同视觉风格 */
  type ButtonVariant = 'ghost' | 'default' | 'primary' | 'danger';

  /** 组件属性 */
  interface Props {
    /** 点击回调 */
    onclick?: (e: MouseEvent) => void;
    /** 无障碍标题 */
    title?: string;
    /** 是否禁用 */
    disabled?: boolean;
    /** 视觉变体 */
    variant?: ButtonVariant;
    /** 按钮尺寸（px） */
    size?: number;
    /** 额外 CSS 类 */
    class?: string;
    /** 图标插槽 */
    children: Snippet;
  }

  const {
    onclick,
    title = '',
    disabled = false,
    variant = 'ghost',
    size = 32,
    class: className = '',
    children,
  }: Props = $props();
</script>

<button
  class="icon-btn icon-btn--{variant} {className}"
  {onclick}
  {title}
  {disabled}
  aria-label={title}
  style="width: {size}px; height: {size}px;"
>
  {@render children()}
</button>

<style>
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease, opacity 0.15s ease;
    padding: 0;
    color: rgba(255, 255, 255, 0.85);
    flex-shrink: 0;
  }

  .icon-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  /* 幽灵按钮 —— 无背景，悬停时微弱高亮 */
  .icon-btn--ghost {
    background: transparent;
  }
  .icon-btn--ghost:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }
  .icon-btn--ghost:active:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
  }

  /* 默认按钮 —— 半透明背景 */
  .icon-btn--default {
    background: rgba(255, 255, 255, 0.06);
  }
  .icon-btn--default:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
  }

  /* 主色按钮 */
  .icon-btn--primary {
    background: rgba(99, 102, 241, 0.2);
    color: #818cf8;
  }
  .icon-btn--primary:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.35);
  }

  /* 危险按钮 */
  .icon-btn--danger {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }
  .icon-btn--danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
  }
</style>
