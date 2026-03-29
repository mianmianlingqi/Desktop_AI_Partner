//! 日志与诊断相关类型定义
//!
//! 用于日志上报命令与诊断导出命令的入参/返回值。采用配置驱动与可序列化结构，
//! 便于前后端稳定通信与后续扩展。

use serde::{Deserialize, Serialize};

/// 日志上报请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogReportRequest {
    /// 日志级别（trace / debug / info / warn / error）
    pub level: String,
    /// 日志正文
    pub message: String,
    /// 额外上下文（可选），用于附带请求标识、模块信息等
    #[serde(default)]
    pub context: Option<String>,
}

/// 诊断导出结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagnosticsExportResult {
    /// 导出目录绝对路径
    pub export_dir: String,
    /// 已导出的日志文件绝对路径列表
    pub files: Vec<String>,
}
