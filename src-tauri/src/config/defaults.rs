//! 默认配置常量 —— 所有可变默认值的单一来源（Single Source of Truth）
//!
//! 零硬编码原则：代码中所有默认值均引用此文件中的常量，
//! 修改任何默认值只需改这一个文件

// ======== AI API 默认配置 ========

/// 默认 AI 模型名称
pub const DEFAULT_MODEL: &str = "gpt-4o";

/// 默认 API 基础 URL（OpenAI 官方端点）
pub const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";

/// 默认阿里云 TTS 接口地址
pub const DEFAULT_ALIYUN_TTS_ENDPOINT: &str = "wss://dashscope.aliyuncs.com/api-ws/v1/inference/";

/// 默认阿里云 TTS 模型名称
pub const DEFAULT_ALIYUN_TTS_MODEL: &str = "cosyvoice-v1";

/// 默认阿里云 TTS 音色
pub const DEFAULT_ALIYUN_TTS_VOICE: &str = "longxiaoxia";

/// 默认阿里云 TTS 音频格式
pub const DEFAULT_ALIYUN_TTS_FORMAT: &str = "wav";

// ======== 应用设置默认值 ========

/// 默认全局唤醒快捷键
pub const DEFAULT_SHORTCUT: &str = "Alt+Space";

/// 默认界面语言
pub const DEFAULT_LANGUAGE: &str = "zh-CN";

/// 默认主题模式
pub const DEFAULT_THEME: &str = "dark";

// ======== 窗口标识 ========

/// 截图 Overlay 窗口 label（用于动态创建/销毁）
pub const OVERLAY_LABEL: &str = "screenshot-overlay";

/// 主窗口 label（预留：后续窗口管理使用）
#[allow(dead_code)]
pub const MAIN_WINDOW_LABEL: &str = "main";

// ======== 存储配置 ========

/// 配置存储文件名（tauri-plugin-store 使用）
pub const CONFIG_STORE_PATH: &str = "config.json";

/// 配置在 store 中的 key
pub const CONFIG_KEY: &str = "app_config";

// ======== SSE 事件名 ========

/// 流式对话增量事件名（app.emit 使用）
pub const EVENT_CHAT_DELTA: &str = "chat:delta";

// ======== Overlay 窗口 URL ========

/// Overlay 窗口加载入口（SPA 场景下先加载 index.html）
pub const OVERLAY_URL: &str = "index.html";

/// Overlay 前端路由路径（由初始化脚本切换）
pub const OVERLAY_ROUTE: &str = "/overlay";

// ======== 可观测性/诊断默认值 ========

/// 日志文件名前缀（按天轮转）
pub const LOG_FILE_PREFIX: &str = "desktop-ai-assistant.log";

/// 诊断导出目录名（位于 app_data_dir 下）
pub const DIAGNOSTICS_DIR_NAME: &str = "diagnostics";

/// 诊断导出时最多复制的日志文件数量
pub const DIAGNOSTICS_EXPORT_MAX_FILES: usize = 10;
