<!--
  主页面 —— 主视图切换

  根据 uiState.activeView 切换 Chat / Settings 视图
  使用 ChatContainer + SettingsPanel
-->
<script lang="ts">
  import { Settings, MessageSquare } from 'lucide-svelte';
  import { ChatContainer } from '$lib/components/chat';
  import { SettingsPanel } from '$lib/components/settings';
  import { IconButton, Tooltip } from '$lib/components/shared';
  import Live2DAvatar from '$lib/components/live2d/Live2DAvatar.svelte';
  import { uiState, setActiveView } from '$lib/stores';
</script>

<div class="main-page">
  <div class="layout-grid">
    <section class="primary-pane">
      <!-- 视图切换浮动按钮 -->
      <div class="view-toggle">
        {#if uiState.activeView === 'chat'}
          <Tooltip text="设置">
            <IconButton onclick={() => setActiveView('settings')} title="打开设置">
              <Settings size={16} />
            </IconButton>
          </Tooltip>
        {:else}
          <Tooltip text="返回对话">
            <IconButton onclick={() => setActiveView('chat')} title="返回对话">
              <MessageSquare size={16} />
            </IconButton>
          </Tooltip>
        {/if}
      </div>

      <!-- 主视图内容 -->
      <div class="view-content">
        {#if uiState.activeView === 'chat'}
          <ChatContainer />
        {:else}
          <SettingsPanel />
        {/if}
      </div>
    </section>

    <!-- 右侧 Live2D 专用容器 -->
    <aside class="live2d-pane" aria-label="Live2D 模型区域">
      <div class="live2d-panel">
        <Live2DAvatar mode="panel" />
      </div>
    </aside>
  </div>
</div>

<style>
  .main-page {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .layout-grid {
    width: 100%;
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) clamp(240px, 32vw, 420px);
    gap: 10px;
    padding: 8px;
  }

  .primary-pane {
    position: relative;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .view-toggle {
    position: absolute;
    top: 4px;
    right: 8px;
    z-index: 10;
  }

  .view-content {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }

  .live2d-pane {
    min-width: 0;
    min-height: 0;
    display: flex;
  }

  .live2d-panel {
    width: 100%;
    height: 100%;
    min-height: 0;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: linear-gradient(160deg, rgba(15, 23, 42, 0.62), rgba(30, 41, 59, 0.38));
    backdrop-filter: blur(10px);
    overflow: hidden;
    padding: 8px;
  }

  @media (max-width: 560px) {
    .layout-grid {
      grid-template-columns: minmax(0, 1fr) minmax(150px, 42vw);
      gap: 8px;
      padding: 6px;
    }

    .view-toggle {
      right: 6px;
      top: 2px;
    }

    .live2d-panel {
      padding: 6px;
    }
  }
</style>
