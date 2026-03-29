//! 存储适配器 —— 封装 tauri-plugin-store 实现配置持久化
//!
//! 使用 tauri-plugin-store v2 的 StoreExt trait，
//! 将 AppConfig 以 JSON 格式存储在应用数据目录

use tauri_plugin_store::StoreExt;

use crate::config::defaults;
use crate::errors::AppError;
use crate::types::AppConfig;

/// 配置存储 trait —— 定义配置读写能力的抽象接口
pub trait ConfigStore {
    /// 读取完整应用配置
    fn get_config(&self, app: &tauri::AppHandle) -> Result<AppConfig, AppError>;
    /// 写入完整应用配置
    fn set_config(&self, app: &tauri::AppHandle, config: &AppConfig) -> Result<(), AppError>;
}

/// Tauri Store 适配器 —— 基于 tauri-plugin-store 的配置存储实现
pub struct TauriStoreAdapter;

impl ConfigStore for TauriStoreAdapter {
    /// 从 tauri-plugin-store 读取应用配置
    ///
    /// # 流程
    /// 1. 打开或创建 store 文件
    /// 2. 尝试读取配置 key 对应的 JSON 值
    /// 3. 若存在则反序列化为 AppConfig
    /// 4. 若不存在则返回默认配置（并写入 store 初始化）
    ///
    /// # Errors
    /// - 打开 store 失败时返回 Config 错误
    /// - JSON 反序列化失败时返回 Serialization 错误
    fn get_config(&self, app: &tauri::AppHandle) -> Result<AppConfig, AppError> {
        let store = app.store(defaults::CONFIG_STORE_PATH).map_err(|e| {
            AppError::Config(format!(
                "打开配置存储失败: {}。Hint: 检查应用数据目录权限",
                e
            ))
        })?;

        match store.get(defaults::CONFIG_KEY) {
            Some(value) => {
                // 从存储的 JSON 值反序列化为 AppConfig
                let config: AppConfig = serde_json::from_value(value.clone())?;
                Ok(config)
            }
            None => {
                // 首次启动，写入默认配置并返回
                let default_config = AppConfig::default();
                self.set_config(app, &default_config)?;
                Ok(default_config)
            }
        }
    }

    /// 将应用配置写入 tauri-plugin-store
    ///
    /// # 流程
    /// 1. 打开或创建 store 文件
    /// 2. 序列化配置为 JSON 值
    /// 3. 写入指定 key
    /// 4. 持久化到磁盘
    ///
    /// # Errors
    /// - 打开 store 失败时返回 Config 错误
    /// - 序列化失败时返回 Serialization 错误
    /// - 保存到磁盘失败时返回 Config 错误
    fn set_config(&self, app: &tauri::AppHandle, config: &AppConfig) -> Result<(), AppError> {
        let store = app.store(defaults::CONFIG_STORE_PATH).map_err(|e| {
            AppError::Config(format!(
                "打开配置存储失败: {}。Hint: 检查应用数据目录权限",
                e
            ))
        })?;

        let value = serde_json::to_value(config)?;
        store.set(defaults::CONFIG_KEY, value);

        store.save().map_err(|e| {
            AppError::Config(format!(
                "保存配置到磁盘失败: {}。Hint: 检查磁盘空间和写入权限",
                e
            ))
        })?;

        Ok(())
    }
}
