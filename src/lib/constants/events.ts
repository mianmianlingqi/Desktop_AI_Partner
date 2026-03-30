/**
 * Tauri 事件名常量
 *
 * 与 Rust 端 config/defaults.rs 中的事件名保持同步
 * 零硬编码：所有事件名监听/发送均从此导入
 */

/** 流式对话增量事件名 —— 后端通过此事件逐 token 推送 AI 回复 */
export const CHAT_DELTA_EVENT = 'chat:delta';

/**
 * 音频播放电平事件名 —— 前端播放链路持续广播当前音量，用于驱动 Live2D 口型。
 */
export const AUDIO_PLAYBACK_LEVEL_EVENT = 'audio:playback-level';

/** 音频播放电平事件 payload */
export interface AudioPlaybackLevelDetail {
	level: number;
}
