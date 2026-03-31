//! 对话服务 —— 编排 AI 适配器完成流式对话
//!
//! 核心功能：
//! 1. 调用 OpenAiAdapter 建立 SSE 流式连接
//! 2. 逐 token 通过 app.emit() 推送给前端
//! 3. 支持通过 AtomicBool 原子中断

use std::sync::atomic::{AtomicBool, Ordering};

use futures::StreamExt;
use tauri::Emitter;

use crate::adapters::ai_adapter::OpenAiAdapter;
use crate::config::defaults;
use crate::errors::AppError;
use crate::types::{ApiConfig, ChatMessage, ChatRequest, ChatRole, StreamEvent};

/// 自动续写最大轮数（仅在模型因长度限制提前结束时触发）
const MAX_AUTO_CONTINUE_ROUNDS: usize = 3;

/// 续写提示词：要求从中断处继续，避免重复前文
const AUTO_CONTINUE_PROMPT: &str =
    "上一段回复被长度限制截断。请从中断处继续输出，不要重复前文，也不要重写开头。";

/// 流式自然结束时的续写提示词（用于 finish_reason 缺失但内容明显未完成的场景）
const AUTO_CONTINUE_ON_STREAM_END_PROMPT: &str =
    "上一段回复可能在传输过程中提前结束。请从中断处继续，不要重复前文。";

fn normalize_finish_reason(reason: &async_openai::types::FinishReason) -> String {
    format!("{:?}", reason).to_lowercase()
}

fn is_length_finish_reason(reason: &str) -> bool {
    reason == "length"
        || reason == "max_tokens"
        || reason == "max_output_tokens"
        || reason == "token_limit"
        || reason.contains("length")
}

fn looks_incomplete_text(text: &str) -> bool {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return false;
    }

    let code_fence_count = trimmed.matches("```").count();
    if code_fence_count % 2 != 0 {
        return true;
    }

    let tail = trimmed.chars().last().unwrap_or_default();
    !matches!(
        tail,
        '。' | '！' | '？' | '.' | '!' | '?' | '"' | '\'' | ')' | '）' | ']' | '】' | '}' | '`'
    )
}

/// 全局对话中断标志 —— 原子布尔，支持跨线程安全读写
static CHAT_ABORT: AtomicBool = AtomicBool::new(false);

/// 设置中断标志为 true —— 通知正在进行的流式请求停止
pub fn abort() {
    CHAT_ABORT.store(true, Ordering::Relaxed);
    log::info!("对话中断标志已设置");
}

/// 重置中断标志为 false —— 在开始新对话前调用
fn reset_abort() {
    CHAT_ABORT.store(false, Ordering::Relaxed);
}

/// 发送对话请求并通过 SSE 事件流推送 AI 回复
///
/// # 参数
/// - `app`: Tauri 应用句柄（用于 emit 事件）
/// - `request`: 包含消息历史和可选模型的对话请求
/// - `config`: AI API 配置（密钥/URL/模型）
///
/// # 流程
/// 1. 重置中断标志
/// 2. 创建 OpenAI 适配器并构建流式请求
/// 3. 逐 chunk 读取流式响应
/// 4. 每收到一个 delta token 就通过 app.emit("chat:delta") 推送
/// 5. 检查中断标志，支持随时停止
/// 6. 最终发送 done=true 事件表示完成
///
/// # Errors
/// - API 调用失败返回 Chat 错误
/// - 事件推送失败返回 Chat 错误
pub async fn send_message(
    app: &tauri::AppHandle,
    mut request: ChatRequest,
    config: ApiConfig,
) -> Result<(), AppError> {
    // 1. 重置中断标志
    reset_abort();

    // 2. 创建适配器并构建请求
    let adapter = OpenAiAdapter::new(&config);
    let model_override = request.model.clone();
    let mut auto_continue_round = 0usize;
    let mut accumulated_output = String::new();

    loop {
        let openai_request =
            adapter.build_stream_request(&request.messages, model_override.as_deref())?;

        // 3. 建立 SSE 流式连接
        let mut stream = adapter
            .client
            .chat()
            .create_stream(openai_request)
            .await
            .map_err(|e| {
                AppError::Chat(format!(
                    "建立流式连接失败: {}。Hint: 检查 API Key 和网络连接",
                    e
                ))
            })?;

        let mut round_output = String::new();
        let mut round_finish_reason: Option<String> = None;

        // 4. 逐 chunk 处理流式响应
        'stream_loop: while let Some(result) = stream.next().await {
            // 检查中断标志
            if CHAT_ABORT.load(Ordering::Relaxed) {
                log::info!("用户中断对话，停止流式接收");
                let abort_event = StreamEvent {
                    delta: None,
                    full_content: (!accumulated_output.is_empty())
                        .then_some(accumulated_output.clone()),
                    done: true,
                    error: Some("用户中断对话".to_string()),
                    finish_reason: Some("abort".to_string()),
                };
                let _ = app.emit(defaults::EVENT_CHAT_DELTA, &abort_event);
                return Ok(());
            }

            match result {
                Ok(response) => {
                    // 遍历响应中的每个 choice
                    for choice in &response.choices {
                        // 推送增量文本
                        if let Some(ref content) = choice.delta.content {
                            round_output.push_str(content);
                            accumulated_output.push_str(content);

                            let event = StreamEvent {
                                delta: Some(content.clone()),
                                full_content: None,
                                done: false,
                                error: None,
                                finish_reason: None,
                            };
                            app.emit(defaults::EVENT_CHAT_DELTA, &event).map_err(|e| {
                                AppError::Chat(format!("推送 delta 事件失败: {}", e))
                            })?;
                        }

                        // 检查是否完成（finish_reason 有值表示流结束）
                        if let Some(reason) = choice.finish_reason.as_ref() {
                            round_finish_reason = Some(normalize_finish_reason(reason));
                            break 'stream_loop;
                        }
                    }
                }
                Err(e) => {
                    // 流式传输出错，推送错误事件并终止
                    log::error!("流式响应错误: {}", e);
                    let error_event = StreamEvent {
                        delta: None,
                        full_content: (!accumulated_output.is_empty())
                            .then_some(accumulated_output.clone()),
                        done: true,
                        error: Some(format!("AI 响应错误: {}", e)),
                        finish_reason: Some("error".to_string()),
                    };
                    let _ = app.emit(defaults::EVENT_CHAT_DELTA, &error_event);
                    return Err(AppError::Chat(format!("流式传输失败: {}", e)));
                }
            }
        }

        let finish_reason = round_finish_reason.unwrap_or_else(|| "stream_end".to_string());
        log::info!(
            "流式轮次结束: round={}, finish_reason={}, round_chars={}, total_chars={}",
            auto_continue_round + 1,
            finish_reason,
            round_output.chars().count(),
            accumulated_output.chars().count()
        );

        if is_length_finish_reason(&finish_reason)
            && auto_continue_round < MAX_AUTO_CONTINUE_ROUNDS
            && !round_output.trim().is_empty()
        {
            auto_continue_round += 1;
            log::warn!(
                "检测到长度截断，触发自动续写，第 {} 轮",
                auto_continue_round
            );

            request.messages.push(ChatMessage {
                role: ChatRole::Assistant,
                content: round_output,
                images: None,
            });
            request.messages.push(ChatMessage {
                role: ChatRole::User,
                content: AUTO_CONTINUE_PROMPT.to_string(),
                images: None,
            });

            continue;
        }

        if finish_reason == "stream_end"
            && auto_continue_round < MAX_AUTO_CONTINUE_ROUNDS
            && looks_incomplete_text(&round_output)
        {
            auto_continue_round += 1;
            log::warn!(
                "检测到流自然结束但内容疑似未完成，触发自动续写，第 {} 轮",
                auto_continue_round
            );

            request.messages.push(ChatMessage {
                role: ChatRole::Assistant,
                content: round_output,
                images: None,
            });
            request.messages.push(ChatMessage {
                role: ChatRole::User,
                content: AUTO_CONTINUE_ON_STREAM_END_PROMPT.to_string(),
                images: None,
            });

            continue;
        }

        let done_event = StreamEvent {
            delta: None,
            full_content: (!accumulated_output.is_empty())
                .then_some(accumulated_output.clone()),
            done: true,
            error: None,
            finish_reason: Some(finish_reason),
        };
        app.emit(defaults::EVENT_CHAT_DELTA, &done_event)
            .map_err(|e| AppError::Chat(format!("推送完成事件失败: {}", e)))?;
        log::info!("流式回复完成并已推送 done 事件，总字符数={}", accumulated_output.chars().count());
        return Ok(());
    }
}

#[cfg(test)]
mod tests {
    use super::looks_incomplete_text;

    #[test]
    fn short_incomplete_text_should_be_flagged() {
        assert!(looks_incomplete_text("您好，老师。能再次"));
    }

    #[test]
    fn complete_sentence_should_not_be_flagged() {
        assert!(!looks_incomplete_text("您好，老师。我是玛丽。"));
    }

    #[test]
    fn unmatched_code_fence_should_be_flagged() {
        assert!(looks_incomplete_text("```rust\nfn demo() {"));
    }
}
