//! 配置相关类型定义
//!
//! 包含 AI API 配置、应用设置和聚合配置

use serde::{Deserialize, Serialize};

/// AI API 配置 —— 控制 AI 服务连接参数
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct ApiConfig {
    /// API 密钥（如 sk-xxx）
    pub api_key: String,
    /// API 基础 URL（如 https://api.openai.com/v1）
    pub base_url: String,
    /// 默认模型名称（如 gpt-4o）
    pub model: String,
    /// 腾讯云 STT SecretId
    pub tencent_secret_id: String,
    /// 腾讯云 STT SecretKey
    pub tencent_secret_key: String,
    /// 阿里云 DashScope API Key (用于 TTS)
    pub aliyun_dashscope_key: String,
}

impl Default for ApiConfig {
    fn default() -> Self {
        use crate::config::defaults;
        Self {
            api_key: String::new(),
            base_url: defaults::DEFAULT_BASE_URL.to_string(),
            model: defaults::DEFAULT_MODEL.to_string(),
            tencent_secret_id: String::new(),
            tencent_secret_key: String::new(),
            aliyun_dashscope_key: String::new(),
        }
    }
}

/// 应用设置 —— 控制应用行为与外观
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    /// 全局唤醒快捷键（如 Alt+Space）
    pub shortcut: String,
    /// 界面语言（如 zh-CN / en-US）
    pub language: String,
    /// 主题模式（dark / light）
    pub theme: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        use crate::config::defaults;
        Self {
            shortcut: defaults::DEFAULT_SHORTCUT.to_string(),
            language: defaults::DEFAULT_LANGUAGE.to_string(),
            theme: defaults::DEFAULT_THEME.to_string(),
        }
    }
}

/// 应用配置 —— 顶层聚合，包含 API 配置与应用设置
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    /// AI API 相关配置
    pub api: ApiConfig,
    /// 应用通用设置
    pub settings: AppSettings,
}

/// 默认配置 —— 所有默认值从 config::defaults 常量读取，零硬编码
impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api: ApiConfig::default(),
            settings: AppSettings::default(),
        }
    }
}
