<!--
  SettingsPanel.svelte — 设置主面板

  Tab 切换: API 配置 | 外观 | 快捷键
  使用 GlassPanel 作为容器
-->
<script lang="ts">
  import { GlassPanel } from '$lib/components/shared';
  import { exportDiagnosticsBundle, observabilityState } from '$lib/stores';
  import ApiConfigForm from './ApiConfigForm.svelte';
  import AppearanceForm from './AppearanceForm.svelte';
  import ShortcutForm from './ShortcutForm.svelte';

  /** Tab 定义 */
  type SettingsTab = 'api' | 'appearance' | 'shortcut' | 'logs';

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'api', label: 'API 配置' },
    { key: 'appearance', label: '外观' },
    { key: 'shortcut', label: '快捷键' },
    { key: 'logs', label: '日志' },
  ];

  /** 当前激活的 Tab */
  let activeTab = $state<SettingsTab>('api');

  /**
   * 导出诊断包
   */
  async function handleExportDiagnostics(): Promise<void> {
    try {
      await exportDiagnosticsBundle();
    } catch (error) {
      console.error('导出诊断包失败:', error);
    }
  }

  /**
   * 时间格式化（用于错误列表简洁展示）
   */
  function formatDisplayTime(isoTime: string): string {
    return new Date(isoTime).toLocaleString('zh-CN', {
      hour12: false,
    });
  }
</script>

<GlassPanel variant="standard" fill class="settings-panel">
  <div class="settings-layout">
    <!-- Tab 栏 -->
    <div class="tab-bar">
      {#each tabs as tab}
        <button
          class="tab-btn"
          class:tab-btn--active={activeTab === tab.key}
          onclick={() => (activeTab = tab.key)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <!-- Tab 内容 -->
    <div class="tab-content">
      {#if activeTab === 'api'}
        <ApiConfigForm />
      {:else if activeTab === 'appearance'}
        <AppearanceForm />
      {:else if activeTab === 'shortcut'}
        <ShortcutForm />
      {:else if activeTab === 'logs'}
        <div class="logs-panel">
          <h3 class="logs-title">最近错误</h3>

          {#if observabilityState.recentErrors.length === 0}
            <p class="logs-empty">暂无错误日志</p>
          {:else}
            <ul class="logs-list">
              {#each observabilityState.recentErrors as log (log.id)}
                <li class="logs-item">
                  <div class="logs-item__time">{formatDisplayTime(log.created_at)}</div>
                  <div class="logs-item__message">{log.message}</div>
                </li>
              {/each}
            </ul>
          {/if}

          <div class="logs-actions">
            <button
              class="export-btn"
              onclick={handleExportDiagnostics}
              disabled={observabilityState.isExporting}
            >
              {observabilityState.isExporting ? '导出中...' : '导出诊断包'}
            </button>
          </div>

          {#if observabilityState.lastExportPath}
            <p class="logs-export-path">
              导出目录：{observabilityState.lastExportPath}
            </p>
          {/if}

          {#if observabilityState.exportError}
            <p class="logs-export-error">
              导出失败：{observabilityState.exportError}
            </p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</GlassPanel>

<style>
  :global(.settings-panel) {
    display: flex;
    flex-direction: column;
  }

  .settings-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .tab-bar {
    display: flex;
    gap: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
  }

  .tab-btn {
    flex: 1;
    padding: 10px 0;
    font-size: 12px;
    font-family: inherit;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.5);
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;
  }

  .tab-btn:hover {
    color: rgba(255, 255, 255, 0.75);
  }

  .tab-btn--active {
    color: rgba(255, 255, 255, 0.95);
    border-bottom-color: #6366f1;
  }

  .tab-content {
    flex: 1;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }

  .logs-panel {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .logs-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }

  .logs-empty {
    margin: 0;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
  }

  .logs-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 220px;
    overflow-y: auto;
  }

  .logs-item {
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .logs-item__time {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
  }

  .logs-item__message {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .logs-actions {
    display: flex;
    align-items: center;
  }

  .export-btn {
    padding: 8px 14px;
    font-size: 12px;
    font-family: inherit;
    color: #c7d2fe;
    background: rgba(99, 102, 241, 0.3);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .export-btn:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.45);
  }

  .export-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .logs-export-path,
  .logs-export-error {
    margin: 0;
    font-size: 12px;
    word-break: break-all;
  }

  .logs-export-path {
    color: rgba(34, 197, 94, 0.95);
  }

  .logs-export-error {
    color: rgba(248, 113, 113, 0.95);
  }
</style>
