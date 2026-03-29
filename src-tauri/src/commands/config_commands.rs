//! 配置命令 —— 提供配置读写的 Tauri IPC 命令
//!
//! 命令列表：
//! - get_config: 读取完整应用配置
//! - set_config: 更新完整应用配置

use crate::errors::AppError;
use crate::types::AppConfig;

/// 读取完整应用配置
///
/// # 前端调用
/// ```typescript
/// const config = await invoke('get_config');
/// // config.api.api_key, config.api.base_url, config.settings.theme, ...
/// ```
///
/// # Returns
/// 完整的 AppConfig 对象（包含 API 配置和应用设置）
///
/// # 说明
/// - 若 store 中无配置则返回默认配置
/// - 默认值由 config/defaults.rs 中的常量定义
#[tauri::command]
pub fn get_config(app: tauri::AppHandle) -> Result<AppConfig, AppError> {
    log::info!("读取应用配置");
    crate::services::config_service::load_config(&app)
}

/// 更新完整应用配置
///
/// # 前端调用
/// ```typescript
/// await invoke('set_config', { config: { api: {...}, settings: {...} } });
/// ```
///
/// # 参数
/// - `config`: 要保存的完整 AppConfig 对象
///
/// # 说明
/// - 整体覆盖写入，前端应先读取再修改再写回
/// - 写入后立即持久化到磁盘
#[tauri::command]
pub fn set_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), AppError> {
    log::info!("更新应用配置");
    crate::services::config_service::save_config(&app, &config)
}
