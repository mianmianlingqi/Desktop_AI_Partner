/**
 * 对话状态管理 —— Svelte 5 Runes
 *
 * 管理对话消息列表、流式状态和当前流内容
 * 使用 $state() 实现响应式状态
 */

import type { ChatMessage } from '$lib/types';

/** 对话状态接口 */
interface ChatState {
  /** 消息历史列表 */
  messages: ChatMessage[];
  /** 是否正在流式接收 AI 回复 */
  isStreaming: boolean;
  /** 当前流式输出的累积内容（AI 正在生成的文本） */
  currentStreamContent: string;
  /** 错误信息（最近一次出错） */
  error: string | null;
}

/** 对话状态 —— 全局响应式状态 */
export const chatState: ChatState = $state({
  messages: [],
  isStreaming: false,
  currentStreamContent: '',
  error: null,
});

/**
 * 添加一条消息到历史列表
 * @param message - 要添加的消息
 */
export function addMessage(message: ChatMessage): void {
  chatState.messages = [...chatState.messages, message];
}

/**
 * 清空所有消息历史
 */
export function clearMessages(): void {
  chatState.messages = [];
  chatState.currentStreamContent = '';
  chatState.error = null;
}

/**
 * 开始流式接收 —— 重置流内容并标记为流式状态
 */
export function startStreaming(): void {
  chatState.isStreaming = true;
  chatState.currentStreamContent = '';
  chatState.error = null;
}

/**
 * 追加流式增量内容
 * @param delta - 新收到的增量文本片段
 */
export function appendDelta(delta: string): void {
  chatState.currentStreamContent += delta;
}

/**
 * 结束流式接收 —— 将累积内容添加为 assistant 消息
 */
export function finishStreaming(): void {
  if (chatState.currentStreamContent) {
    addMessage({
      role: 'assistant',
      content: chatState.currentStreamContent,
    });
  }
  chatState.isStreaming = false;
  chatState.currentStreamContent = '';
}

/**
 * 设置流式错误信息 —— 标记流结束并记录错误
 * @param errorMsg - 错误描述
 */
export function setStreamError(errorMsg: string): void {
  chatState.isStreaming = false;
  chatState.error = errorMsg;
  chatState.currentStreamContent = '';
}
