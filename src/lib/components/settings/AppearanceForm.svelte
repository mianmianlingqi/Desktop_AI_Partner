<!--
  AppearanceForm.svelte — 外观设置

  主题切换（深色/浅色）、语言选择
-->
<script lang="ts">
  import { configState, saveConfig } from '$lib/stores';

  /** 主题选项 */
  const themeOptions = [
    { value: 'dark', label: '深色模式' },
    { value: 'light', label: '浅色模式' },
  ] as const;

  /** 语言选项 */
  const languageOptions = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en-US', label: 'English' },
  ] as const;

  /** 当前主题 */
  let theme = $state(configState.config.settings.theme);
  /** 当前语言 */
  let language = $state(configState.config.settings.language);

  /** 同步全局状态 */
  $effect(() => {
    if (configState.isLoaded) {
      theme = configState.config.settings.theme;
      language = configState.config.settings.language;
    }
  });

  /** 保存状态信息 */
  let saveError = $state('');

  /** 保存外观设置 */
  async function handleSave(): Promise<void> {
    try {
      saveError = '';
      await saveConfig({
        ...configState.config,
        settings: {
          ...configState.config.settings,
          theme,
          language,
        },
      });
    } catch (err) {
      saveError = err instanceof Error ? err.message : String(err);
      console.error('保存外观设置失败:', err);
    }
  }
</script>

<div class="form-section">
  <h3 class="section-title">外观设置</h3>

  <!-- 主题 -->
  <label class="form-label">
    <span>主题</span>
    <select class="form-select" bind:value={theme} onchange={handleSave}>
      {#each themeOptions as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </label>

  <!-- 语言 -->
  <label class="form-label">
    <span>语言</span>
    <select class="form-select" bind:value={language} onchange={handleSave}>
      {#each languageOptions as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </label>
</div>

<style>
  .form-section {
    padding: 16px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    margin: 0 0 16px;
  }

  .form-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.65);
  }

  .form-select {
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    outline: none;
    cursor: pointer;
    appearance: none;
    transition: border-color 0.15s ease;
  }

  .form-select:focus {
    border-color: rgba(99, 102, 241, 0.5);
  }

  .form-select option {
    background: #1a1a2e;
    color: rgba(255, 255, 255, 0.9);
  }
</style>
