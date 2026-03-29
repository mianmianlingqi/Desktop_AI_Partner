//! 配置服务 —— 编排存储适配器完成配置的读写与默认值合并
//!
//! 提供面向命令层的简洁 API，内部使用 TauriStoreAdapter

use crate::adapters::store_adapter::{ConfigStore, TauriStoreAdapter};
use crate::errors::AppError;
use crate::types::AppConfig;

/// 加载应用配置
///
/// # 参数
/// - `app`: Tauri 应用句柄（用于访问 store）
///
/// # 流程
/// 1. 通过 TauriStoreAdapter 尝试从 store 读取
/// 2. 若 store 中无数据则返回默认配置（适配器内部已处理初始化）
///
/// # Errors
/// - store 读取失败返回 Config 错误
/// - JSON 反序列化失败返回 Serialization 错误
pub fn load_config(app: &tauri::AppHandle) -> Result<AppConfig, AppError> {
    let store_adapter = TauriStoreAdapter;
    store_adapter.get_config(app)
}

/// 保存应用配置
///
/// # 参数
/// - `app`: Tauri 应用句柄
/// - `config`: 要保存的完整配置对象
///
/// # Errors
/// - store 写入失败返回 Config 错误
/// - JSON 序列化失败返回 Serialization 错误
pub fn save_config(app: &tauri::AppHandle, config: &AppConfig) -> Result<(), AppError> {
    let store_adapter = TauriStoreAdapter;
    store_adapter.set_config(app, config)
}
