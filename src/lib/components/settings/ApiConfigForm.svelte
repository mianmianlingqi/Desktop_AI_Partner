<!--
  ApiConfigForm.svelte — API 配置表单

  API Key (密码输入), Base URL, Model 名称
  保存按钮 + 连接状态提示
-->
<script lang="ts">
  import { configState, saveConfig } from '$lib/stores';
  import type { AppConfig } from '$lib/types';

  /** 表单本地状态（编辑时不直接修改全局状态） */
  let apiKey = $state(configState.config.api.api_key);
  let baseUrl = $state(configState.config.api.base_url);
  let model = $state(configState.config.api.model);
  let tencentSecretId = $state(configState.config.api.tencent_secret_id);
  let tencentSecretKey = $state(configState.config.api.tencent_secret_key);
  let aliyunDashscopeKey = $state(configState.config.api.aliyun_dashscope_key);

  /** 保存状态 */
  let saveStatus = $state<'idle' | 'saving' | 'success' | 'error'>('idle');
  let saveError = $state('');

  /** 同步全局状态到本地（配置加载后） */
  $effect(() => {
    if (configState.isLoaded) {
      apiKey = configState.config.api.api_key;
      baseUrl = configState.config.api.base_url;
      model = configState.config.api.model;
      tencentSecretId = configState.config.api.tencent_secret_id;
      tencentSecretKey = configState.config.api.tencent_secret_key;
      aliyunDashscopeKey = configState.config.api.aliyun_dashscope_key;
    }
  });

  /** 保存配置 */
  async function handleSave(): Promise<void> {
    saveStatus = 'saving';
    saveError = '';

    const newConfig: AppConfig = {
      ...configState.config,
      api: {
        api_key: apiKey,
        base_url: baseUrl,
        model: model,
        tencent_secret_id: tencentSecretId,
        tencent_secret_key: tencentSecretKey,
        aliyun_dashscope_key: aliyunDashscopeKey,
      },
    };

    try {
      await saveConfig(newConfig);
      saveStatus = 'success';
      // 2 秒后重置提示
      setTimeout(() => { saveStatus = 'idle'; }, 2000);
    } catch (err) {
      saveStatus = 'error';
      saveError = err instanceof Error ? err.message : String(err);
    }
  }
</script>

<div class="form-section">
  <h3 class="section-title">AI API 配置</h3>

  <!-- API Key -->
  <label class="form-label">
    <span>API Key</span>
    <input
      type="password"
      class="form-input"
      bind:value={apiKey}
      placeholder="sk-..."
      autocomplete="off"
    />
  </label>

  <!-- Base URL -->
  <label class="form-label">
    <span>Base URL</span>
    <input
      type="text"
      class="form-input"
      bind:value={baseUrl}
      placeholder="https://api.openai.com/v1"
    />
  </label>

  <!-- Model -->
  <label class="form-label">
    <span>模型名称</span>
    <input
      type="text"
      class="form-input"
      bind:value={model}
      placeholder="gpt-4o"
    />
  </label>

  <h3 class="section-title" style="margin-top: 24px;">语音 API 配置</h3>

  <label class="form-label">
    <span>腾讯云 STT SecretId</span>
    <input
      type="text"
      class="form-input"
      bind:value={tencentSecretId}
      placeholder="AKID..."
    />
  </label>

  <label class="form-label">
    <span>腾讯云 STT SecretKey</span>
    <input
      type="password"
      class="form-input"
      bind:value={tencentSecretKey}
      placeholder="..."
      autocomplete="off"
    />
  </label>

  <label class="form-label">
    <span>阿里云 DashScope API Key</span>
    <input
      type="password"
      class="form-input"
      bind:value={aliyunDashscopeKey}
      placeholder="sk-..."
      autocomplete="off"
    />
  </label>

  <!-- 操作栏 -->
  <div class="form-actions">
    <button
      class="btn btn--primary"
      onclick={handleSave}
      disabled={configState.isSaving}
    >
      {configState.isSaving ? '保存中...' : '保存配置'}
    </button>

    {#if saveStatus === 'success'}
      <span class="status status--success">✓ 已保存</span>
    {/if}
    {#if saveStatus === 'error'}
      <span class="status status--error">{saveError}</span>
    {/if}
  </div>
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

  .form-input {
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.95);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    outline: none;
    transition: border-color 0.15s ease;
  }

  .form-input:focus {
    border-color: rgba(99, 102, 241, 0.5);
  }

  .form-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .form-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
  }

  .btn {
    padding: 8px 16px;
    font-size: 13px;
    font-family: inherit;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn--primary {
    background: rgba(99, 102, 241, 0.3);
    color: #c7d2fe;
  }

  .btn--primary:hover:not(:disabled) {
    background: rgba(99, 102, 241, 0.45);
  }

  .status {
    font-size: 12px;
  }

  .status--success {
    color: #22c55e;
  }

  .status--error {
    color: #f87171;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
