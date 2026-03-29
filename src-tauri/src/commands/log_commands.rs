//! 日志命令
//!
//! 提供前端日志上报与诊断导出能力：
//! - log_report: 接收结构化日志请求并写入 tracing
//! - export_diagnostics: 导出最近日志文件到 app_data_dir/diagnostics/<timestamp>/

use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::Manager;

use crate::config::defaults;
use crate::errors::AppError;
use crate::observability;
use crate::types::{DiagnosticsExportResult, LogReportRequest};

/// 上报日志
///
/// # 说明
/// - 会先做基础脱敏，避免敏感信息写入本地日志
/// - 未知级别自动降级为 info
#[tauri::command]
pub fn log_report(request: LogReportRequest) -> Result<(), AppError> {
    let sanitized_message = observability::sanitize_text(&request.message);
    let sanitized_context = request
        .context
        .as_deref()
        .map(observability::sanitize_text)
        .unwrap_or_default();

    let output = if sanitized_context.is_empty() {
        sanitized_message
    } else {
        format!("{} | context={}", sanitized_message, sanitized_context)
    };

    match request.level.to_lowercase().as_str() {
        "trace" => tracing::trace!("{}", output),
        "debug" => tracing::debug!("{}", output),
        "info" => tracing::info!("{}", output),
        "warn" | "warning" => tracing::warn!("{}", output),
        "error" => tracing::error!("{}", output),
        _ => tracing::info!("{}", output),
    }

    Ok(())
}

/// 导出诊断日志
///
/// # 行为
/// - 从最近日志文件中选取最多 N 个（由默认常量控制）
/// - 复制到 app_data_dir/diagnostics/<timestamp>/ 目录
/// - 返回导出目录和实际导出的文件列表
#[tauri::command]
pub fn export_diagnostics(app: tauri::AppHandle) -> Result<DiagnosticsExportResult, AppError> {
    let recent_logs = observability::recent_log_files(defaults::DIAGNOSTICS_EXPORT_MAX_FILES)?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Io(format!("获取应用数据目录失败: {}。Hint: 检查应用路径权限", e)))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::Io(format!("生成时间戳失败: {}。Hint: 检查系统时间", e)))?
        .as_secs()
        .to_string();

    let export_dir = app_data_dir
        .join(defaults::DIAGNOSTICS_DIR_NAME)
        .join(timestamp);
    fs::create_dir_all(&export_dir)?;

    let mut copied_files = Vec::new();
    for source in recent_logs {
        if let Some(file_name) = source.file_name() {
            let target = export_dir.join(file_name);
            fs::copy(&source, &target)?;
            copied_files.push(target.display().to_string());
        }
    }

    Ok(DiagnosticsExportResult {
        export_dir: export_dir.display().to_string(),
        files: copied_files,
    })
}
