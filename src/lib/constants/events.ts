/**
 * Tauri 事件名常量
 *
 * 与 Rust 端 config/defaults.rs 中的事件名保持同步
 * 零硬编码：所有事件名监听/发送均从此导入
 */

/** 流式对话增量事件名 —— 后端通过此事件逐 token 推送 AI 回复 */
export const CHAT_DELTA_EVENT = 'chat:delta';
