//! 命令模块 —— Tauri IPC 命令入口层
//!
//! 所有 #[tauri::command] 函数定义在此模块下，
//! 命令仅做参数解析和委派，业务逻辑在 services/ 层
//!
//! 依赖方向：commands/ → services/ → adapters/

pub mod capture_commands;
pub mod chat_commands;
pub mod config_commands;
pub mod log_commands;
pub mod audio_commands;
