//! Desktop AI Assistant — Crate 根模块
//!
//! 声明所有子模块并注册 Tauri 插件和 IPC 命令
//!
//! 模块依赖方向（严格单向）：
//!   commands/ → services/ → adapters/ → types/
//!                                     → config/
//!   errors/ ← 被所有层使用

// ======== 子模块声明 ========
mod types;
mod errors;
mod config;
mod adapters;
mod services;
mod commands;
mod observability;

/// 应用启动入口 —— 由 main.rs 调用
///
/// # 注册清单
/// - **插件**: opener / global-shortcut / clipboard-manager / store
/// - **命令**: capture_screen / open_overlay / close_overlay / chat_send / chat_abort / get_config / set_config
///
/// # 说明
/// 使用 `#[cfg_attr(mobile, tauri::mobile_entry_point)]` 兼容移动端入口
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ======== 插件注册 ========
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        // ======== 启动初始化 ========
        .setup(|app| {
            if let Err(err) = crate::observability::init(&app.handle()) {
                // 观测性初始化失败时不阻断启动，避免闪退
                eprintln!("观测性初始化失败: {}", err);
            }
            tracing::info!("Desktop AI Assistant 启动完成");
            Ok(())
        })
        // ======== IPC 命令注册 ========
        .invoke_handler(tauri::generate_handler![
            // 截图命令
            commands::capture_commands::capture_screen,
            commands::capture_commands::open_overlay,
            commands::capture_commands::close_overlay,
            // 对话命令
            commands::chat_commands::chat_send,
            commands::chat_commands::chat_abort,
            // 配置命令
            commands::config_commands::get_config,
            commands::config_commands::set_config,
            // 日志命令
            commands::log_commands::log_report,
            commands::log_commands::export_diagnostics,
            // 语音命令
            commands::audio_commands::stt_transcribe_audio,
            commands::audio_commands::tts_synthesize_speech,
        ])
        .run(tauri::generate_context!())
        .expect("启动 Desktop AI Assistant 失败。Hint: 检查 tauri.conf.json 配置");
}
