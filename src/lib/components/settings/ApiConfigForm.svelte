<!--
  ApiConfigForm.svelte — API 配置表单

  API Key (密码输入), Base URL, Model 名称
  保存按钮 + 连接状态提示
-->
<script lang="ts">
  import { configState, saveConfig } from '$lib/stores';
  import { SYSTEM_PROMPT_PRESETS, MAX_SYSTEM_PROMPT_LENGTH } from '$lib/constants';
  import type { AppConfig, SystemPromptCustomPreset } from '$lib/types';

  /** 表单本地状态（编辑时不直接修改全局状态） */
  let apiKey = $state(configState.config.api.api_key);
  let baseUrl = $state(configState.config.api.base_url);
  let model = $state(configState.config.api.model);
  let tencentSecretId = $state(configState.config.api.tencent_secret_id);
  let tencentSecretKey = $state(configState.config.api.tencent_secret_key);
  let aliyunDashscopeKey = $state(configState.config.api.aliyun_dashscope_key);
  let aliyunTtsEndpoint = $state(configState.config.api.aliyun_tts_endpoint);
  let aliyunTtsModel = $state(configState.config.api.aliyun_tts_model);
  let aliyunTtsVoice = $state(configState.config.api.aliyun_tts_voice);
  let aliyunTtsFormat = $state(configState.config.api.aliyun_tts_format);
  let aliyunTtsExtraParametersJson = $state(configState.config.api.aliyun_tts_extra_parameters_json);
  let systemPromptPreset = $state(configState.config.settings.system_prompt_preset);
  let systemPrompt = $state(configState.config.settings.system_prompt);
  let systemPromptCustomPresets = $state(configState.config.settings.system_prompt_custom_presets);
  let newSystemPromptPresetName = $state('');

  /** 保存状态 */
  let saveStatus = $state<'idle' | 'saving' | 'success' | 'error'>('idle');
  let saveError = $state('');
  let promptPresetError = $state('');
  let promptPresetSuccess = $state('');

  /** 内置 + 自定义系统提示词预设合集 */
  const allSystemPromptPresets = $derived([
    ...SYSTEM_PROMPT_PRESETS,
    ...systemPromptCustomPresets.map((preset) => ({
      id: preset.id,
      label: preset.name,
      prompt: preset.prompt,
    })),
  ]);

  /** 当前是否选中了自定义预设 */
  const selectedPresetIsCustom = $derived(
    systemPromptCustomPresets.some((preset) => preset.id === systemPromptPreset),
  );

  /** 当前系统提示词字数 */
  const systemPromptCharCount = $derived(systemPrompt.length);

  /** 是否超过系统提示词最大长度 */
  const systemPromptTooLong = $derived(systemPromptCharCount > MAX_SYSTEM_PROMPT_LENGTH);

  /** 同步全局状态到本地（配置加载后） */
  $effect(() => {
    if (configState.isLoaded) {
      apiKey = configState.config.api.api_key;
      baseUrl = configState.config.api.base_url;
      model = configState.config.api.model;
      tencentSecretId = configState.config.api.tencent_secret_id;
      tencentSecretKey = configState.config.api.tencent_secret_key;
      aliyunDashscopeKey = configState.config.api.aliyun_dashscope_key;
      aliyunTtsEndpoint = configState.config.api.aliyun_tts_endpoint;
      aliyunTtsModel = configState.config.api.aliyun_tts_model;
      aliyunTtsVoice = configState.config.api.aliyun_tts_voice;
      aliyunTtsFormat = configState.config.api.aliyun_tts_format;
      aliyunTtsExtraParametersJson = configState.config.api.aliyun_tts_extra_parameters_json;
      systemPromptPreset = configState.config.settings.system_prompt_preset;
      systemPrompt = configState.config.settings.system_prompt;
      systemPromptCustomPresets = configState.config.settings.system_prompt_custom_presets;
    }
  });

  /** 应用选中的系统提示词预设 */
  function applySystemPromptPreset(): void {
    const matchedPreset = allSystemPromptPresets.find((item) => item.id === systemPromptPreset);
    if (!matchedPreset) return;
    systemPrompt = matchedPreset.prompt;
  }

  /** 同步文本编辑内容到当前选中的自定义预设，确保保存时不会丢失修改 */
  function syncSelectedCustomPresetPrompt(
    presets: SystemPromptCustomPreset[],
  ): SystemPromptCustomPreset[] {
    if (!selectedPresetIsCustom) {
      return presets;
    }

    return presets.map((preset) => {
      if (preset.id !== systemPromptPreset) {
        return preset;
      }

      return {
        ...preset,
        prompt: systemPrompt,
      };
    });
  }

  /** 构建保存用配置对象 */
  function buildConfig(customPresets: SystemPromptCustomPreset[]): AppConfig {
    const syncedCustomPresets = syncSelectedCustomPresetPrompt(customPresets);

    return {
      ...configState.config,
      api: {
        api_key: apiKey,
        base_url: baseUrl,
        model: model,
        tencent_secret_id: tencentSecretId,
        tencent_secret_key: tencentSecretKey,
        aliyun_dashscope_key: aliyunDashscopeKey,
        aliyun_tts_endpoint: aliyunTtsEndpoint,
        aliyun_tts_model: aliyunTtsModel,
        aliyun_tts_voice: aliyunTtsVoice,
        aliyun_tts_format: aliyunTtsFormat,
        aliyun_tts_extra_parameters_json: aliyunTtsExtraParametersJson,
      },
      settings: {
        ...configState.config.settings,
        system_prompt_preset: systemPromptPreset,
        system_prompt: systemPrompt,
        system_prompt_custom_presets: syncedCustomPresets,
      },
    };
  }

  /** 新建并保存系统提示词预设 */
  async function handleCreateSystemPromptPreset(): Promise<void> {
    promptPresetError = '';
    promptPresetSuccess = '';

    const name = newSystemPromptPresetName.trim();
    const prompt = systemPrompt.trim();

    if (!name) {
      promptPresetError = '请先填写预设名称';
      return;
    }
    if (!prompt) {
      promptPresetError = '系统提示词为空，无法保存为预设';
      return;
    }
    if (prompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
      promptPresetError = `系统提示词最多 ${MAX_SYSTEM_PROMPT_LENGTH} 个字符`;
      return;
    }

    const newPreset: SystemPromptCustomPreset = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      prompt,
    };

    const nextCustomPresets = [...systemPromptCustomPresets, newPreset];
    systemPromptCustomPresets = nextCustomPresets;
    systemPromptPreset = newPreset.id;
    newSystemPromptPresetName = '';

    saveStatus = 'saving';
    try {
      await saveConfig(buildConfig(nextCustomPresets));
      saveStatus = 'success';
      promptPresetSuccess = '新预设已保存';
      setTimeout(() => {
        saveStatus = 'idle';
        promptPresetSuccess = '';
      }, 2000);
    } catch (err) {
      saveStatus = 'error';
      promptPresetError = err instanceof Error ? err.message : String(err);
      saveError = promptPresetError;
    }
  }

  /** 保存当前选中的自定义预设内容 */
  async function handleSaveCurrentSystemPromptPreset(): Promise<void> {
    promptPresetError = '';
    promptPresetSuccess = '';

    if (!selectedPresetIsCustom) {
      promptPresetError = '当前选中的是内置预设，请先新建自定义预设';
      return;
    }
    if (!systemPrompt.trim()) {
      promptPresetError = '系统提示词为空，无法保存';
      return;
    }
    if (systemPromptTooLong) {
      promptPresetError = `系统提示词最多 ${MAX_SYSTEM_PROMPT_LENGTH} 个字符`;
      return;
    }

    const nextCustomPresets = systemPromptCustomPresets.map((preset) => {
      if (preset.id !== systemPromptPreset) {
        return preset;
      }
      return {
        ...preset,
        prompt: systemPrompt,
      };
    });

    systemPromptCustomPresets = nextCustomPresets;
    saveStatus = 'saving';
    try {
      await saveConfig(buildConfig(nextCustomPresets));
      saveStatus = 'success';
      promptPresetSuccess = '当前预设已更新';
      setTimeout(() => {
        saveStatus = 'idle';
        promptPresetSuccess = '';
      }, 2000);
    } catch (err) {
      saveStatus = 'error';
      promptPresetError = err instanceof Error ? err.message : String(err);
      saveError = promptPresetError;
    }
  }

  /** 保存配置 */
  async function handleSave(): Promise<void> {
    if (systemPromptTooLong) {
      saveStatus = 'error';
      saveError = `系统提示词最多 ${MAX_SYSTEM_PROMPT_LENGTH} 个字符`;
      return;
    }

    saveStatus = 'saving';
    saveError = '';

    try {
      await saveConfig(buildConfig(systemPromptCustomPresets));
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

  <h3 class="section-title" style="margin-top: 24px;">角色提示词配置（系统提示词）</h3>

  <label class="form-label">
    <span>预设角色</span>
    <select class="form-input" bind:value={systemPromptPreset} onchange={applySystemPromptPreset}>
      {#each allSystemPromptPresets as preset (preset.id)}
        <option value={preset.id}>{preset.label}</option>
      {/each}
    </select>
  </label>

  <label class="form-label">
    <span>系统提示词内容</span>
    <textarea
      class="form-input form-textarea"
      bind:value={systemPrompt}
      maxlength={MAX_SYSTEM_PROMPT_LENGTH}
      placeholder="这里是系统提示词，会作为 system 消息发送给模型，不会显示在用户输入框中"
    ></textarea>

    <div class="prompt-counter" class:prompt-counter--error={systemPromptTooLong}>
      <span>{systemPromptCharCount} / {MAX_SYSTEM_PROMPT_LENGTH}</span>
      {#if systemPromptTooLong}
        <span>已超过字数上限</span>
      {/if}
    </div>
  </label>

  <label class="form-label">
    <span>新建角色预设名称</span>
    <div class="prompt-actions">
      <input
        type="text"
        class="form-input"
        bind:value={newSystemPromptPresetName}
        placeholder="例如：代码评审专家"
      />
      <button
        class="btn btn--outline"
        onclick={handleCreateSystemPromptPreset}
        disabled={configState.isSaving || !systemPrompt.trim() || systemPromptTooLong}
      >
        新建并保存
      </button>

      <button
        class="btn btn--outline"
        onclick={handleSaveCurrentSystemPromptPreset}
        disabled={configState.isSaving || !selectedPresetIsCustom || !systemPrompt.trim() || systemPromptTooLong}
      >
        保存当前预设
      </button>
    </div>

    {#if promptPresetSuccess}
      <span class="status status--success">{promptPresetSuccess}</span>
    {/if}
    {#if promptPresetError}
      <span class="status status--error">{promptPresetError}</span>
    {/if}
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

  <label class="form-label">
    <span>阿里云 TTS Endpoint</span>
    <input
      type="text"
      class="form-input"
      bind:value={aliyunTtsEndpoint}
      placeholder="wss://dashscope.aliyuncs.com/api-ws/v1/inference/"
    />
  </label>

  <label class="form-label">
    <span>阿里云 TTS Model</span>
    <input
      type="text"
      class="form-input"
      bind:value={aliyunTtsModel}
      placeholder="cosyvoice-v1"
    />
  </label>

  <label class="form-label">
    <span>阿里云 TTS Voice / 复刻音色ID</span>
    <input
      type="text"
      class="form-input"
      bind:value={aliyunTtsVoice}
      placeholder="longxiaoxia 或你的复制音色ID"
    />
  </label>

  <label class="form-label">
    <span>阿里云 TTS Format</span>
    <input
      type="text"
      class="form-input"
      bind:value={aliyunTtsFormat}
      placeholder="wav"
    />
  </label>

  <label class="form-label">
    <span>阿里云 TTS 额外参数 JSON（复制音色）</span>
    <textarea
      class="form-input form-textarea"
      bind:value={aliyunTtsExtraParametersJson}
      placeholder={"例如：{\"volume\": 50, \"pitch\": 0, \"speech_rate\": 0, \"style\": \"default\"}"}
    ></textarea>
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

  .form-textarea {
    min-height: 88px;
    resize: vertical;
    line-height: 1.4;
  }

  .form-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
  }

  .prompt-counter {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 4px;
  }

  .prompt-counter--error {
    color: #f87171;
  }

  .prompt-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .prompt-actions .form-input {
    flex: 1;
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

  .btn--outline {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.75);
  }

  .btn--outline:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }

  .status {
    font-size: 12px;
  }

  .status--success {
    color: #22c55e;
  }

  .status--error {
    color: #f87171;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
  }
</style>
