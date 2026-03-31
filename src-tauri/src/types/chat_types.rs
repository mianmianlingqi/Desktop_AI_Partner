//! 对话相关类型定义
//!
//! 包含对话角色、消息、请求和流式事件

use serde::{Deserialize, Serialize};

/// 对话角色枚举 —— 标识消息发送方
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ChatRole {
    /// 用户消息
    User,
    /// AI 助手回复
    Assistant,
    /// 系统提示词
    System,
}

/// 对话消息 —— 单条消息结构体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    /// 消息角色（user / assistant / system）
    pub role: ChatRole,
    /// 消息文本内容
    pub content: String,
    /// 附带的 Base64 图片列表（可选，用于多模态视觉理解）
    #[serde(default)]
    pub images: Option<Vec<String>>,
}

/// 对话请求 —— 前端发送给后端的完整对话请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    /// 消息历史列表
    pub messages: Vec<ChatMessage>,
    /// 指定模型名称（可选，不填则使用配置中的默认模型）
    #[serde(default)]
    pub model: Option<String>,
}

/// 流式事件 —— 通过 SSE 推送给前端的增量事件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamEvent {
    /// 增量文本片段（流式输出的一个 token 块）
    #[serde(default)]
    pub delta: Option<String>,
    /// 当前完整内容快照（用于 done/error 兜底，防止前端漏包导致截断）
    #[serde(default)]
    pub full_content: Option<String>,
    /// 是否已完成（true 表示流式传输结束）
    pub done: bool,
    /// 错误信息（仅在出错时有值）
    #[serde(default)]
    pub error: Option<String>,
    /// 完成原因（如 stop / length / content_filter），仅在 done=true 时可能有值
    #[serde(default)]
    pub finish_reason: Option<String>,
}
