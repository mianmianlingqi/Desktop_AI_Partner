//! 可观测性模块
//!
//! 负责统一初始化 tracing 体系：
//! 1. 控制台输出 + 按天轮转文件输出
//! 2. 将 log 宏桥接到 tracing（LogTracer）
//! 3. 记录并暴露日志目录
//! 4. 提供基础文本脱敏与最近日志文件检索能力

use std::fs;
use std::path::PathBuf;
use std::sync::OnceLock;
use std::time::SystemTime;

use tauri::Manager;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_log::LogTracer;
use tracing_subscriber::prelude::*;
use tracing_subscriber::{EnvFilter, fmt};

use crate::config::defaults;
use crate::errors::AppError;

/// 全局日志目录缓存（初始化后只写一次）
static LOG_DIRECTORY: OnceLock<PathBuf> = OnceLock::new();

/// 文件日志 writer 守卫（必须常驻，否则非阻塞 writer 会提前释放）
static FILE_GUARD: OnceLock<WorkerGuard> = OnceLock::new();

/// 初始化可观测性能力
///
/// # 行为
/// - 初始化 log -> tracing 桥接
/// - 初始化 tracing subscriber（控制台 + 文件双输出）
/// - 文件输出按天轮转
/// - 记录日志目录供后续诊断导出使用
pub fn init(app: &tauri::AppHandle) -> Result<(), AppError> {
    // 1. 尝试获取日志目录，失败则降级到 app_data_dir 或临时目录
    let log_dir = app
        .path()
        .app_log_dir()
        .or_else(|_| app.path().app_data_dir())
        .unwrap_or_else(|_| std::env::temp_dir().join("desktop-ai-assistant-logs"));

    if let Err(err) = fs::create_dir_all(&log_dir) {
        tracing::warn!("创建日志目录失败，降级为仅控制台输出: {}", err);
    } else {
        let _ = LOG_DIRECTORY.set(log_dir.clone());
    }

    // 2. 初始化 log -> tracing 桥接（幂等）
    if let Err(err) = LogTracer::init() {
        tracing::warn!("log -> tracing 桥接已初始化或失败: {}", err);
    }

    let env_filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));

    // 3. 构建 subscriber（控制台 + 可选文件）
    let registry = tracing_subscriber::registry().with(env_filter).with(fmt::layer().with_target(true));

    if LOG_DIRECTORY.get().is_some() {
        let file_appender = tracing_appender::rolling::daily(&log_dir, defaults::LOG_FILE_PREFIX);
        let (file_writer, file_guard) = tracing_appender::non_blocking(file_appender);
        let _ = FILE_GUARD.set(file_guard);

        let result = registry
            .with(
                fmt::layer()
                    .with_ansi(false)
                    .with_target(true)
                    .with_writer(file_writer),
            )
            .try_init();

        if let Err(err) = result {
            tracing::warn!("初始化 tracing subscriber 失败(可能已初始化): {}", err);
        } else {
            tracing::info!("日志系统初始化完成，日志目录: {}", log_dir.display());
        }
    } else {
        if let Err(err) = registry.try_init() {
            tracing::warn!("初始化 tracing subscriber 失败(可能已初始化): {}", err);
        }
    }

    Ok(())
}

/// 返回日志目录（若已初始化）
pub fn log_directory() -> Option<PathBuf> {
    LOG_DIRECTORY.get().cloned()
}

/// 基础文本脱敏
///
/// 脱敏关键字：api_key / authorization / bearer / token
/// 若文本包含任一关键字（大小写不敏感），则整段替换为统一脱敏标记。
pub fn sanitize_text(text: &str) -> String {
    let lowered = text.to_lowercase();
    let sensitive_keywords = ["api_key", "authorization", "bearer", "token"];
    if sensitive_keywords.iter().any(|keyword| lowered.contains(keyword)) {
        "[REDACTED_SENSITIVE_CONTENT]".to_string()
    } else {
        text.to_string()
    }
}

/// 获取最近日志文件列表（按修改时间倒序）
pub fn recent_log_files(limit: usize) -> Result<Vec<PathBuf>, AppError> {
    let log_dir = log_directory().ok_or_else(|| {
        AppError::Config(
            "日志目录尚未初始化。Hint: 请确认应用已执行 observability::init".to_string(),
        )
    })?;

    let mut entries = fs::read_dir(&log_dir)?
        .filter_map(Result::ok)
        .filter_map(|entry| {
            let path = entry.path();
            if !path.is_file() {
                return None;
            }
            let modified_time = entry
                .metadata()
                .ok()
                .and_then(|metadata| metadata.modified().ok())
                .unwrap_or(SystemTime::UNIX_EPOCH);
            Some((modified_time, path))
        })
        .collect::<Vec<_>>();

    entries.sort_by(|a, b| b.0.cmp(&a.0));

    Ok(entries
        .into_iter()
        .take(limit)
        .map(|(_, path)| path)
        .collect())
}
