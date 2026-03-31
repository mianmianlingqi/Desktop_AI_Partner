//! 对话命令 —— 提供 AI 流式对话和中断的 Tauri IPC 命令
//!
//! 命令列表：
//! - chat_send: 发起流式对话（异步后台执行，通过 SSE 事件推送结果）
//! - chat_abort: 中断当前流式对话

use tauri::Emitter;

use crate::config::defaults;
use crate::errors::AppError;
use crate::types::{ChatRequest, StreamEvent};

/// 发起流式对话请求
///
/// # 前端调用
/// ```typescript
/// await invoke('chat_send', { request: { messages: [...], model: 'gpt-4o' } });
/// // 然后监听 SSE 事件
/// listen('chat:delta', (event) => { /* 处理增量 */ });
/// ```
///
/// # 说明
/// - 命令立即返回 Ok(())，实际对话在后台异步执行
/// - AI 回复通过 `chat:delta` 事件逐 token 推送给前端
/// - 出错时也会通过 `chat:delta` 事件推送 error 字段
/// - 若需中断，调用 chat_abort 命令
#[tauri::command]
pub async fn chat_send(app: tauri::AppHandle, request: ChatRequest) -> Result<(), AppError> {
    log::info!(
        "收到对话请求: {} 条消息，模型: {:?}",
        request.messages.len(),
        request.model
    );

    // 从 store 读取当前 API 配置
    let config = crate::services::config_service::load_config(&app)?.api;

    // 校验 API Key 是否已配置 —— 仅通过事件推送错误（与流式错误保持一致）
    if config.api_key.is_empty() {
        let error_event = StreamEvent {
            delta: None,
            full_content: None,
            done: true,
            error: Some(
                "API Key 未配置。Hint: 请先在设置中填写 API Key".to_string(),
            ),
            finish_reason: Some("error".to_string()),
        };
        let _ = app.emit(defaults::EVENT_CHAT_DELTA, &error_event);
        return Ok(());
    }

    // 在后台 spawn 异步任务执行流式对话
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(e) =
            crate::services::chat_service::send_message(&app_clone, request, config).await
        {
            log::error!("流式对话失败: {}", e);
            let error_event = StreamEvent {
                delta: None,
                full_content: None,
                done: true,
                error: Some(e.to_string()),
                finish_reason: Some("error".to_string()),
            };
            let _ = app_clone.emit(defaults::EVENT_CHAT_DELTA, &error_event);
        }
    });

    Ok(())
}

/// 中断当前流式对话
///
/// # 前端调用
/// ```typescript
/// await invoke('chat_abort');
/// ```
///
/// # 说明
/// - 设置全局原子中断标志为 true
/// - 正在运行的流式对话循环会在下一次迭代检测到标志并停止
/// - 幂等操作：多次调用不会产生副作用
#[tauri::command]
pub fn chat_abort() -> Result<(), AppError> {
    log::info!("收到对话中断指令");
    crate::services::chat_service::abort();
    Ok(())
}
