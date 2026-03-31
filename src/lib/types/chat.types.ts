/**
 * 对话相关类型定义
 *
 * 与 Rust 端 types/chat_types.rs 保持一一对应
 */

/** 对话角色 —— 标识消息发送方 */
export type ChatRole = 'user' | 'assistant' | 'system';

/** 对话消息 —— 单条消息结构体 */
export interface ChatMessage {
  /** 消息角色（user / assistant / system） */
  role: ChatRole;
  /** 消息文本内容 */
  content: string;
  /** 附带的 Base64 图片列表（可选，用于多模态视觉理解） */
  images?: string[];
}

/** 对话请求 —— 前端发送给后端的完整对话请求 */
export interface ChatRequest {
  /** 消息历史列表 */
  messages: ChatMessage[];
  /** 指定模型名称（可选，不填则使用配置中的默认模型） */
  model?: string;
}

/** 流式事件 —— 通过 SSE 推送给前端的增量事件 */
export interface StreamEvent {
  /** 增量文本片段（流式输出的一个 token 块） */
  delta?: string;
  /** 当前完整内容快照（done/error 时用于防截断兜底） */
  full_content?: string;
  /** 是否已完成（true 表示流式传输结束） */
  done: boolean;
  /** 错误信息（仅在出错时有值） */
  error?: string;
  /** 完成原因（如 stop / length / content_filter） */
  finish_reason?: string;
}
