/**
 * Tauri 命令名常量
 *
 * 与 Rust 端 #[tauri::command] 函数名保持同步
 * 零硬编码：所有 invoke 调用均从此导入命令名
 */

// ======== 截图命令 ========

/** 截取屏幕指定区域 */
export const CMD_CAPTURE_SCREEN = 'capture_screen';

/** 创建全屏透明 Overlay 窗口 */
export const CMD_OPEN_OVERLAY = 'open_overlay';

/** 销毁 Overlay 窗口 */
export const CMD_CLOSE_OVERLAY = 'close_overlay';

// ======== 对话命令 ========

/** 发起流式对话请求 */
export const CMD_CHAT_SEND = 'chat_send';

/** 中断当前流式对话 */
export const CMD_CHAT_ABORT = 'chat_abort';

// ======== 配置命令 ========

/** 读取完整应用配置 */
export const CMD_GET_CONFIG = 'get_config';

/** 更新完整应用配置 */
export const CMD_SET_CONFIG = 'set_config';

// ======== 日志命令 ========

/** 上报前端日志到 Rust 端 */
export const CMD_LOG_REPORT = 'log_report';

/** 导出诊断包（最近日志文件） */
export const CMD_EXPORT_DIAGNOSTICS = 'export_diagnostics';
