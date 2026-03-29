/**
 * 服务层统一 re-export 入口
 *
 * 所有 Tauri IPC 调用从此集中导出
 */

export {
  captureScreen,
  openOverlay,
  closeOverlay,
} from './capture.service';

export {
  sendMessage,
  abortChat,
  listenChatDelta,
} from './chat.service';

export {
  getConfig,
  setConfig,
} from './config.service';

export {
  reportLog,
  exportDiagnostics,
} from './log.service';
