/**
 * 日志相关类型定义
 *
 * 与 Rust 端 types/log_types.rs 字段保持对齐
 */

/** 日志上报请求（对应 LogReportRequest） */
export interface LogReportRequest {
  /** 日志级别（trace / debug / info / warn / error） */
  level: string;
  /** 日志正文 */
  message: string;
  /** 额外上下文（可选） */
  context?: string;
}

/** 诊断导出结果（对应 DiagnosticsExportResult） */
export interface DiagnosticsExportResult {
  /** 导出目录绝对路径 */
  export_dir: string;
  /** 导出的日志文件绝对路径列表 */
  files: string[];
}
