<!--
  ShortcutForm.svelte — 快捷键设置

  显示和修改全局唤醒快捷键
-->
<script lang="ts">
  import { configState, saveConfig } from '$lib/stores';

  /** 当前快捷键 */
  let shortcut = $state(configState.config.settings.shortcut);

  /** 是否处于录制快捷键状态 */
  let isRecording = $state(false);

  /** 同步全局状态 */
  $effect(() => {
    if (configState.isLoaded) {
      shortcut = configState.config.settings.shortcut;
    }
  });

  /** 进入快捷键录制模式 */
  function startRecording(): void {
    isRecording = true;
  }

  /** 键盘事件 —— 录制快捷键组合 */
  function handleKeyDown(e: KeyboardEvent): void {
    if (!isRecording) return;
    e.preventDefault();

    // 构建快捷键字符串（如 "Alt+Space", "Ctrl+Shift+A"）
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Super');

    // 过滤单独修饰键
    const modifiers = ['Control', 'Alt', 'Shift', 'Meta'];
    if (!modifiers.includes(e.key)) {
      // 空格特殊处理
      const keyName = e.key === ' ' ? 'Space' : e.key;
      parts.push(keyName);

      shortcut = parts.join('+');
      isRecording = false;

      // 自动保存（带错误处理）
      saveConfig({
        ...configState.config,
        settings: {
          ...configState.config.settings,
          shortcut,
        },
      }).catch((err) => {
        console.error('保存快捷键失败:', err);
      });
    }
  }
</script>

<!-- 全局键盘监听（函数内部已有 isRecording 守卫） -->
<svelte:window onkeydown={handleKeyDown} />

<div class="form-section">
  <h3 class="section-title">快捷键设置</h3>

  <label class="form-label">
    <span>全局唤醒快捷键</span>
    <div class="shortcut-display">
      <span class="shortcut-keys" class:recording={isRecording}>
        {isRecording ? '按下快捷键组合...' : shortcut}
      </span>
      <button class="btn btn--outline" onclick={startRecording}>
        {isRecording ? '录制中' : '修改'}
      </button>
    </div>
  </label>

  <p class="form-hint">
    提示：快捷键修改后需要重启应用才能生效
  </p>
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
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.65);
  }

  .shortcut-display {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .shortcut-keys {
    padding: 6px 12px;
    font-size: 13px;
    font-family: 'Cascadia Code', 'Consolas', monospace;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    min-width: 120px;
    text-align: center;
  }

  .shortcut-keys.recording {
    border-color: rgba(99, 102, 241, 0.6);
    background: rgba(99, 102, 241, 0.1);
    animation: pulse 1.5s ease infinite;
  }

  .btn {
    padding: 6px 12px;
    font-size: 12px;
    font-family: inherit;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .btn--outline {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.7);
  }

  .btn--outline:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .form-hint {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.35);
    margin: 12px 0 0;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
</style>
