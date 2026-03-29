<!--
  (app) 路由组布局 —— 主应用 UI 容器

  职责：
  - 包含 TitleBar（拖拽 + 最小化/关闭按钮）
  - 提供 app-shell 弹性布局
  - 仅影响主应用页面，overlay 路由不走此布局
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { TitleBar } from '$lib/components/titlebar';

  /** 插槽 —— 子路由内容 */
  interface Props {
    children: Snippet;
  }

  const { children }: Props = $props();
</script>

<div class="app-shell">
  <!-- 标题栏（仅主窗口使用） -->
  <TitleBar />

  <!-- 路由内容 -->
  <main class="app-content">
    {@render children()}
  </main>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .app-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
</style>
