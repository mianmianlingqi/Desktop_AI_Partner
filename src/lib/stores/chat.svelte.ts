/**
 * 对话状态管理 —— Svelte 5 Runes
 *
 * 管理对话消息列表、流式状态和当前流内容
 * 使用 $state() 实现响应式状态
 */

import type { ChatMessage, ChatRole } from '$lib/types';

const CHAT_MEMORY_STORAGE_KEY = 'desktop-ai-partner.chat-memory.v1';
const CHAT_MEMORY_VERSION = 1;
const MAX_PERSISTED_MESSAGES = 80;
const MESSAGE_CONTENT_MAX_CHARS = 1800;
const REQUEST_RECENT_MESSAGES = 18;
const REQUEST_SUMMARY_MESSAGES = 28;
const SUMMARY_ITEM_MAX_CHARS = 120;

interface PersistedChatMemory {
  version: number;
  updatedAt: number;
  messages: ChatMessage[];
}

function isChatRole(value: unknown): value is ChatRole {
  return value === 'user' || value === 'assistant' || value === 'system';
}

function canUseBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeMessageContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, MESSAGE_CONTENT_MAX_CHARS);
}

function sanitizeMessageForMemory(message: ChatMessage): ChatMessage | null {
  if (!isChatRole(message.role)) {
    return null;
  }

  const normalizedText = normalizeMessageContent(message.content ?? '');
  if (!normalizedText && (!message.images || message.images.length === 0)) {
    return null;
  }

  const fallbackContent = message.images?.length ? '用户发送了截图并请求分析' : '';
  const baseContent = normalizedText || fallbackContent;
  if (!baseContent) {
    return null;
  }

  const content =
    message.role === 'user' && message.images?.length
      ? `${baseContent}（含截图）`
      : baseContent;

  return {
    role: message.role,
    content
  };
}

function sanitizeMessagesForMemory(messages: ChatMessage[]): ChatMessage[] {
  const sanitized: ChatMessage[] = [];

  for (const message of messages) {
    const normalized = sanitizeMessageForMemory(message);
    if (normalized) {
      sanitized.push(normalized);
    }
  }

  return sanitized.slice(-MAX_PERSISTED_MESSAGES);
}

function clearPersistedMessages(): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(CHAT_MEMORY_STORAGE_KEY);
  } catch (error) {
    console.warn('清理对话记忆失败:', error);
  }
}

function persistMessages(messages: ChatMessage[]): void {
  if (!canUseBrowserStorage()) {
    return;
  }

  try {
    const payload: PersistedChatMemory = {
      version: CHAT_MEMORY_VERSION,
      updatedAt: Date.now(),
      messages: sanitizeMessagesForMemory(messages)
    };

    window.localStorage.setItem(CHAT_MEMORY_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('持久化对话记忆失败:', error);
  }
}

function loadPersistedMessages(): ChatMessage[] {
  if (!canUseBrowserStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CHAT_MEMORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<PersistedChatMemory>;
    if (parsed.version !== CHAT_MEMORY_VERSION || !Array.isArray(parsed.messages)) {
      return [];
    }

    const recovered: ChatMessage[] = [];
    for (const item of parsed.messages) {
      if (!item || typeof item !== 'object' || !isChatRole(item.role) || typeof item.content !== 'string') {
        continue;
      }

      const normalized = sanitizeMessageForMemory({
        role: item.role,
        content: item.content
      });

      if (normalized) {
        recovered.push(normalized);
      }
    }

    return recovered.slice(-MAX_PERSISTED_MESSAGES);
  } catch (error) {
    console.warn('读取对话记忆失败，已回退空历史:', error);
    return [];
  }
}

function formatMemorySummaryLine(message: ChatMessage): string {
  const roleLabel = message.role === 'assistant' ? '助手' : '用户';
  const normalizedText = normalizeMessageContent(message.content ?? '');
  const fallbackContent = message.images?.length ? '发送了截图并请求分析' : '空消息';
  const baseContent = normalizedText || fallbackContent;
  const content = message.images?.length ? `${baseContent}（含截图）` : baseContent;

  if (!content) {
    return '';
  }

  const truncated =
    content.length > SUMMARY_ITEM_MAX_CHARS
      ? `${content.slice(0, SUMMARY_ITEM_MAX_CHARS)}…`
      : content;

  return `${roleLabel}: ${truncated}`;
}

/**
 * 构建带记忆摘要的请求消息列表
 *
 * 长会话时，仅保留最近消息，并把更早内容压缩为摘要 system 消息，
 * 在不显著增加 token 的前提下提供可持续上下文记忆。
 */
export function buildContextMemoryMessages(messages: ChatMessage[]): ChatMessage[] {
  const messagesWithoutSystem = messages.filter((message) => message.role !== 'system');

  if (messagesWithoutSystem.length <= REQUEST_RECENT_MESSAGES) {
    return messagesWithoutSystem;
  }

  const recentMessages = messagesWithoutSystem.slice(-REQUEST_RECENT_MESSAGES);
  const memorySource = messagesWithoutSystem
    .slice(0, -REQUEST_RECENT_MESSAGES)
    .slice(-REQUEST_SUMMARY_MESSAGES);

  const summaryLines = memorySource
    .map(formatMemorySummaryLine)
    .filter((line) => Boolean(line));

  if (summaryLines.length === 0) {
    return recentMessages;
  }

  const memorySummaryMessage: ChatMessage = {
    role: 'system',
    content: [
      '以下是历史上下文记忆摘要（由本地会话自动整理，请作为补充背景）：',
      ...summaryLines.map((line, index) => `${index + 1}. ${line}`)
    ].join('\n')
  };

  return [memorySummaryMessage, ...recentMessages];
}

const restoredMessages = loadPersistedMessages();

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
  /** 语音合成状态提示 */
  speechStatus: string | null;
}

/** 对话状态 —— 全局响应式状态 */
export const chatState: ChatState = $state({
  messages: restoredMessages,
  isStreaming: false,
  currentStreamContent: '',
  error: null,
  speechStatus: null,
});

if (restoredMessages.length > 0) {
  console.info(`已恢复 ${restoredMessages.length} 条本地上下文记忆`);
}

/**
 * 添加一条消息到历史列表
 * @param message - 要添加的消息
 */
export function addMessage(message: ChatMessage): void {
  chatState.messages = [...chatState.messages, message];
  persistMessages(chatState.messages);
}

/**
 * 清空所有消息历史
 */
export function clearMessages(): void {
  chatState.messages = [];
  chatState.currentStreamContent = '';
  chatState.error = null;
  chatState.speechStatus = null;
  clearPersistedMessages();
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
  chatState.speechStatus = null;
}

/**
 * 设置语音合成状态提示
 * @param status - 当前语音状态文案
 */
export function setSpeechStatus(status: string): void {
  chatState.speechStatus = status;
}

/**
 * 清空语音合成状态提示
 */
export function clearSpeechStatus(): void {
  chatState.speechStatus = null;
}
