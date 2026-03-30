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

  <!-- 视图内容 -->
  <div class="view-content">
    {#if uiState.activeView === 'chat'}
      <ChatContainer />
    {:else}
      <SettingsPanel />
    {/if}
  </div>

  <!-- Live2D 形象挂件（不影响主交互区） -->
  <div class="avatar-floating" aria-hidden="true">
    <Live2DAvatar />
  </div>
</div>

<style>
  .main-page {
    position: relative;
    height: 100%;
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
    overflow: hidden;
  }

  .avatar-floating {
    position: absolute;
    right: 8px;
    bottom: 8px;
    z-index: 3;
    pointer-events: none;
  }

  @media (max-width: 900px) {
    .avatar-floating {
      right: 6px;
      bottom: 6px;
    }
  }
</style>
