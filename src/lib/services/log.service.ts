/**
 * 日志服务 —— 封装日志相关 Tauri 命令调用
 *
 * 职责：
 * - 上报前端日志到 Rust 端
 * - 导出诊断包（最近日志文件）
 */

import { invoke } from '@tauri-apps/api/core';
import { CMD_LOG_REPORT, CMD_EXPORT_DIAGNOSTICS } from '$lib/constants';
import type { DiagnosticsExportResult, LogReportRequest } from '$lib/types';

/**
 * 上报日志
 * @param request - 日志上报请求
 */
export async function reportLog(request: LogReportRequest): Promise<void> {
  return invoke(CMD_LOG_REPORT, { request });
}

/**
 * 导出诊断包
 * @returns 诊断导出结果（包含导出目录与文件列表）
 */
export async function exportDiagnostics(): Promise<DiagnosticsExportResult> {
  return invoke<DiagnosticsExportResult>(CMD_EXPORT_DIAGNOSTICS);
}
