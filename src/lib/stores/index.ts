/**
 * Store 层统一 re-export 入口
 *
 * 注意：.svelte.ts 文件需要在 .svelte 或其他 .svelte.ts 中使用
 */

export {
  chatState,
  addMessage,
  clearMessages,
  startStreaming,
  appendDelta,
  finishStreaming,
  setStreamError,
  setSpeechStatus,
  clearSpeechStatus,
} from './chat.svelte';

export {
  captureState,
  setImage,
  clearImage,
  setCapturing,
} from './capture.svelte';

export {
  configState,
  loadConfig,
  saveConfig,
} from './config.svelte';

export {
  uiState,
  setActiveView,
  togglePanel,
  setShowImagePreview,
  type ActiveView,
} from './ui.svelte';

export {
  observabilityState,
  setupGlobalErrorReporting,
  exportDiagnosticsBundle,
  type FrontendErrorLog,
} from './observability.svelte';
