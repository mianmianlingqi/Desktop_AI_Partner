//! AI API 适配器 —— 封装 async-openai crate 实现 AI 对话
//!
//! 支持自定义 base_url（兼容 OpenAI 兼容 API），
//! 提供消息类型转换和流式请求创建能力

use async_openai::{
    config::OpenAIConfig,
    types::{
        ChatCompletionRequestAssistantMessageArgs, ChatCompletionRequestMessage,
        ChatCompletionRequestSystemMessageArgs, ChatCompletionRequestUserMessageArgs,
        ChatCompletionRequestUserMessageContentPart,
        ChatCompletionRequestMessageContentPartText,
        ChatCompletionRequestMessageContentPartImage, ImageUrl,
        CreateChatCompletionRequestArgs,
    },
    Client,
};

use crate::errors::AppError;
use crate::types::{ApiConfig, ChatMessage, ChatRole};

/// OpenAI 兼容 API 适配器 —— 支持自定义 base_url 和 api_key
pub struct OpenAiAdapter {
    /// async-openai 客户端实例
    pub client: Client<OpenAIConfig>,
    /// 默认模型名称（从配置读取）
    pub model: String,
}

impl OpenAiAdapter {
    /// 创建新的 OpenAI 适配器实例
    ///
    /// # 参数
    /// - `config`: API 配置，包含密钥、URL 和模型名称
    ///
    /// # 说明
    /// 使用 OpenAIConfig 支持自定义 base_url，兼容第三方 OpenAI 兼容服务
    pub fn new(config: &ApiConfig) -> Self {
        let openai_config = OpenAIConfig::new()
            .with_api_key(&config.api_key)
            .with_api_base(&config.base_url);

        Self {
            client: Client::with_config(openai_config),
            model: config.model.clone(),
        }
    }

    /// 构建流式对话请求
    ///
    /// # 参数
    /// - `messages`: 本应用的消息列表
    /// - `model`: 可选模型覆盖（为空则使用配置默认模型）
    ///
    /// # Returns
    /// async-openai 的 CreateChatCompletionRequest（已启用 stream）
    pub fn build_stream_request(
        &self,
        messages: &[ChatMessage],
        model_override: Option<&str>,
    ) -> Result<async_openai::types::CreateChatCompletionRequest, AppError> {
        let openai_messages = Self::convert_messages(messages)?;
        let model = model_override.unwrap_or(&self.model);

        let request = CreateChatCompletionRequestArgs::default()
            .model(model)
            .messages(openai_messages)
            .stream(true)
            .build()
            .map_err(|e| AppError::Chat(format!("构建请求失败: {}", e)))?;

        Ok(request)
    }

    /// 将本应用的 ChatMessage 列表转换为 async-openai 的消息类型
    ///
    /// # 说明
    /// - System 消息 → ChatCompletionRequestSystemMessage
    /// - User 消息（无图片）→ ChatCompletionRequestUserMessage（纯文本）
    /// - User 消息（有图片）→ ChatCompletionRequestUserMessage（多模态内容）
    /// - Assistant 消息 → ChatCompletionRequestAssistantMessage
    pub fn convert_messages(
        messages: &[ChatMessage],
    ) -> Result<Vec<ChatCompletionRequestMessage>, AppError> {
        messages
            .iter()
            .map(|msg| match msg.role {
                // 系统消息 —— 设定 AI 行为的提示词
                ChatRole::System => {
                    let system_msg = ChatCompletionRequestSystemMessageArgs::default()
                        .content(msg.content.clone())
                        .build()
                        .map_err(|e| {
                            AppError::Chat(format!("构建系统消息失败: {}", e))
                        })?;
                    Ok(system_msg.into())
                }

                // 助手消息 —— AI 历史回复
                ChatRole::Assistant => {
                    let assistant_msg =
                        ChatCompletionRequestAssistantMessageArgs::default()
                            .content(msg.content.clone())
                            .build()
                            .map_err(|e| {
                                AppError::Chat(format!("构建助手消息失败: {}", e))
                            })?;
                    Ok(assistant_msg.into())
                }

                // 用户消息 —— 支持纯文本和多模态（文本+图片）
                ChatRole::User => {
                    match &msg.images {
                        Some(images) if !images.is_empty() => {
                            Self::build_vision_message(&msg.content, images)
                        }
                        _ => {
                            let user_msg =
                                ChatCompletionRequestUserMessageArgs::default()
                                    .content(msg.content.clone())
                                    .build()
                                    .map_err(|e| {
                                        AppError::Chat(format!(
                                            "构建用户消息失败: {}",
                                            e
                                        ))
                                    })?;
                            Ok(user_msg.into())
                        }
                    }
                }
            })
            .collect()
    }

    /// 构建包含图片的多模态用户消息
    ///
    /// # 参数
    /// - `content`: 文本内容
    /// - `images`: Base64 编码的图片列表
    ///
    /// # 说明
    /// 使用 data URI 格式嵌入图片：`data:image/png;base64,{base64_data}`
    fn build_vision_message(
        content: &str,
        images: &[String],
    ) -> Result<ChatCompletionRequestMessage, AppError> {
        let mut parts: Vec<ChatCompletionRequestUserMessageContentPart> = Vec::new();

        // 1. 添加文本内容部分
        parts.push(ChatCompletionRequestUserMessageContentPart::Text(
            ChatCompletionRequestMessageContentPartText {
                text: content.to_string(),
            },
        ));

        // 2. 添加每张图片的 URL 部分
        for img_b64 in images {
            parts.push(ChatCompletionRequestUserMessageContentPart::ImageUrl(
                ChatCompletionRequestMessageContentPartImage {
                    image_url: ImageUrl {
                        url: format!("data:image/png;base64,{}", img_b64),
                        detail: None,
                    },
                },
            ));
        }

        // 3. 用内容部分数组构建用户消息
        let user_msg = ChatCompletionRequestUserMessageArgs::default()
            .content(parts)
            .build()
            .map_err(|e| {
                AppError::Chat(format!("构建多模态消息失败: {}", e))
            })?;

        Ok(user_msg.into())
    }
}
