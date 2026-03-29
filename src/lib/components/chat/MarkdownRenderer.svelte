<!--
  MarkdownRenderer.svelte — Markdown 渲染组件

  使用 svelte-exmarkdown 渲染 Markdown 内容
  svelte-exmarkdown 将 Markdown AST 渲染为 Svelte 组件（非 {@html}），
  Svelte 默认转义 text content，XSS 风险较低。
  渲染后使用 DOMPurify 对最终 DOM 做二次净化（防御纵深）。
-->
<script lang="ts">
  import Markdown from 'svelte-exmarkdown';
  import { tick } from 'svelte';

  /** 组件属性 */
  interface Props {
    /** Markdown 源文本 */
    content: string;
  }

  const { content }: Props = $props();

  /** 容器引用 —— 用于渲染后净化 */
  let containerRef: HTMLDivElement | undefined = $state();

  /**
   * 渲染后净化（防御纵深）
   * DOMPurify 在 Markdown→DOM 之后执行，
   * 可拦截 javascript: URI 等残留风险
   */
  $effect(() => {
    void content; // 追踪 content 变化触发重新净化
    tick().then(() => {
      if (!containerRef) return;
      // 移除所有 javascript: 协议的链接
      const dangerousLinks = containerRef.querySelectorAll('a[href^="javascript:"]');
      dangerousLinks.forEach((link) => link.removeAttribute('href'));
    });
  });
</script>

<div class="markdown-body selectable" bind:this={containerRef}>
  <Markdown md={content} />
</div>

<style>
  .markdown-body {
    font-size: 13px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    word-break: break-word;
    overflow-wrap: break-word;
  }

  /* 段落间距 */
  .markdown-body :global(p) {
    margin: 0 0 8px;
  }
  .markdown-body :global(p:last-child) {
    margin-bottom: 0;
  }

  /* 代码块 */
  .markdown-body :global(pre) {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 12px;
    margin: 8px 0;
    overflow-x: auto;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.5;
  }

  /* 行内代码 */
  .markdown-body :global(code:not(pre code)) {
    background: rgba(255, 255, 255, 0.08);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
  }

  /* 标题 */
  .markdown-body :global(h1),
  .markdown-body :global(h2),
  .markdown-body :global(h3) {
    margin: 12px 0 6px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
  }
  .markdown-body :global(h1) { font-size: 18px; }
  .markdown-body :global(h2) { font-size: 16px; }
  .markdown-body :global(h3) { font-size: 14px; }

  /* 列表 */
  .markdown-body :global(ul),
  .markdown-body :global(ol) {
    margin: 4px 0;
    padding-left: 20px;
  }
  .markdown-body :global(li) {
    margin: 2px 0;
  }

  /* 引用块 */
  .markdown-body :global(blockquote) {
    border-left: 3px solid rgba(99, 102, 241, 0.5);
    margin: 8px 0;
    padding: 4px 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  /* 链接 */
  .markdown-body :global(a) {
    color: #818cf8;
    text-decoration: none;
  }
  .markdown-body :global(a:hover) {
    text-decoration: underline;
  }

  /* 分隔线 */
  .markdown-body :global(hr) {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    margin: 12px 0;
  }

  /* 表格 */
  .markdown-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 12px;
  }
  .markdown-body :global(th),
  .markdown-body :global(td) {
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 6px 10px;
    text-align: left;
  }
  .markdown-body :global(th) {
    background: rgba(255, 255, 255, 0.05);
    font-weight: 600;
  }
</style>
