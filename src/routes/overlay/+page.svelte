<!--
  截图叠加层页面

  该路由对应一个独立的透明窗口（overlay window）
  仅包含 SelectionOverlay 用于区域框选截图
-->
<script lang="ts">
  import { SelectionOverlay } from '$lib/components/capture';
</script>

<SelectionOverlay />

<style>
  /* 叠加层页面自身无额外样式，SelectionOverlay 会全屏覆盖 */
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: transparent;
  }
</style>
