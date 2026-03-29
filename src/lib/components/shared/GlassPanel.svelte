<!--
  GlassPanel.svelte — 毛玻璃面板容器

  可配置: blur 程度、背景不透明度、圆角大小
  使用 design-tokens/glass.ts 的预设值
  所有面板类组件的基础容器
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { glassVariants } from '$lib/design-tokens/glass';
  import { borderRadius } from '$lib/design-tokens/spacing';

  /** 组件属性 */
  interface Props {
    /** 毛玻璃强度变体 */
    variant?: 'light' | 'standard' | 'heavy';
    /** 圆角大小 */
    radius?: keyof typeof borderRadius;
    /** 额外 CSS 类名 */
    class?: string;
    /** 是否填满父容器高度 */
    fill?: boolean;
    /** 内边距（CSS 值） */
    padding?: string;
    /** 子内容插槽 */
    children: Snippet;
  }

  const {
    variant = 'standard',
    radius = 'lg',
    class: className = '',
    fill = false,
    padding = '0',
    children,
  }: Props = $props();

  /** 当前使用的毛玻璃变体预设 */
  const glassStyle = $derived(glassVariants[variant]);
</script>

<div
  class="glass-panel {className}"
  style="
    backdrop-filter: {glassStyle.backdropFilter};
    -webkit-backdrop-filter: {glassStyle.backdropFilter};
    background: {glassStyle.background};
    border: 1px solid {glassStyle.border};
    border-radius: {borderRadius[radius]};
    padding: {padding};
    {fill ? 'height: 100%;' : ''}
  "
>
  {@render children()}
</div>

<style>
  .glass-panel {
    /* 基础毛玻璃容器样式 */
    position: relative;
    overflow: hidden;
  }
</style>
