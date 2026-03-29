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
use crate::types::{ApiConfig, ChatRequest, StreamEvent};

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
    request: ChatRequest,
    config: ApiConfig,
) -> Result<(), AppError> {
    // 1. 重置中断标志
    reset_abort();

    // 2. 创建适配器并构建请求
    let adapter = OpenAiAdapter::new(&config);
    let model_override = request.model.as_deref();
    let openai_request = adapter.build_stream_request(&request.messages, model_override)?;

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

    // 4. 逐 chunk 处理流式响应
    while let Some(result) = stream.next().await {
        // 检查中断标志
        if CHAT_ABORT.load(Ordering::Relaxed) {
            log::info!("用户中断对话，停止流式接收");
            let abort_event = StreamEvent {
                delta: None,
                done: true,
                error: Some("用户中断对话".to_string()),
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
                        let event = StreamEvent {
                            delta: Some(content.clone()),
                            done: false,
                            error: None,
                        };
                        app.emit(defaults::EVENT_CHAT_DELTA, &event).map_err(|e| {
                            AppError::Chat(format!("推送 delta 事件失败: {}", e))
                        })?;
                    }

                    // 检查是否完成（finish_reason 有值表示流结束）
                    if choice.finish_reason.is_some() {
                        let done_event = StreamEvent {
                            delta: None,
                            done: true,
                            error: None,
                        };
                        app.emit(defaults::EVENT_CHAT_DELTA, &done_event).map_err(
                            |e| AppError::Chat(format!("推送完成事件失败: {}", e)),
                        )?;
                        return Ok(());
                    }
                }
            }
            Err(e) => {
                // 流式传输出错，推送错误事件并终止
                log::error!("流式响应错误: {}", e);
                let error_event = StreamEvent {
                    delta: None,
                    done: true,
                    error: Some(format!("AI 响应错误: {}", e)),
                };
                let _ = app.emit(defaults::EVENT_CHAT_DELTA, &error_event);
                return Err(AppError::Chat(format!("流式传输失败: {}", e)));
            }
        }
    }

    // 5. 流自然结束（所有 chunk 已处理），确保发送完成信号
    let final_event = StreamEvent {
        delta: None,
        done: true,
        error: None,
    };
    let _ = app.emit(defaults::EVENT_CHAT_DELTA, &final_event);

    Ok(())
}
