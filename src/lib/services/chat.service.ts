/**
 * 对话服务 —— 封装对话相关 Tauri 命令和事件监听
 *
 * 职责：
 * - 发送对话请求（invoke chat_send）
 * - 中断流式请求（invoke chat_abort）
 * - 注册/注销 chat:delta 事件监听
 *
 * 依赖方向：services/ → constants/ + types/
 */

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { CMD_CHAT_SEND, CMD_CHAT_ABORT, CHAT_DELTA_EVENT } from '$lib/constants';
import type { ChatRequest, StreamEvent } from '$lib/types';

/**
 * 发送对话请求到 Rust 后端
 *
 * 命令立即返回，AI 回复通过 chat:delta 事件逐 token 推送
 * @param request - 包含消息历史和可选模型名
 */
export async function sendMessage(request: ChatRequest): Promise<void> {
  return invoke(CMD_CHAT_SEND, { request });
}

/**
 * 中断当前流式对话
 */
export async function abortChat(): Promise<void> {
  return invoke(CMD_CHAT_ABORT);
}

/**
 * 注册 chat:delta 事件监听
 *
 * @param callback - 每收到一个增量事件时的回调
 * @returns 注销函数 —— 调用后停止监听
 *
 * @example
 * ```ts
 * const unlisten = await listenChatDelta((event) => {
 *   if (event.delta) appendDelta(event.delta);
 *   if (event.done) finishStreaming();
 *   if (event.error) handleError(event.error);
 * });
 * // 组件卸载时
 * unlisten();
 * ```
 */
export async function listenChatDelta(
  callback: (event: StreamEvent) => void,
): Promise<UnlistenFn> {
  return listen<StreamEvent>(CHAT_DELTA_EVENT, (tauriEvent) => {
    callback(tauriEvent.payload);
  });
}
