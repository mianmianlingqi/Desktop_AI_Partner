<!--
  根布局组件 —— 最小化全局容器

  职责：
  - 导入全局 CSS（所有路由共享）
  - 初始化：加载配置
  - 不包含 TitleBar（TitleBar 由 (app) 子布局负责）
  - overlay 路由继承此布局时不会出现多余 UI 元素
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import '../app.css';
  import { loadConfig, setupGlobalErrorReporting } from '$lib/stores';

  /** 插槽 —— 子路由内容 */
  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();

  /** 应用初始化 —— 加载配置 */
  $effect(() => {
    if (window.location.pathname.startsWith('/overlay')) {
      return;
    }

    loadConfig();
    setupGlobalErrorReporting();
  });
</script>

<!-- 仅渲染子路由，不添加任何 UI 包裹层 -->
{@render children()}

<style>
  /* 根布局无额外样式，全局样式由 app.css 提供 */
</style>
