/**
 * 前端可观测性状态管理 —— Svelte 5 Runes
 *
 * 职责：
 * - 注册全局异常监听（window error / unhandledrejection）
 * - 将异常上报到 Rust 日志命令
 * - 缓存最近错误日志，供设置面板展示
 * - 提供诊断包导出能力
 */

import { exportDiagnostics, reportLog } from '$lib/services';

/** 最近错误缓存上限（MVP 场景下保留少量即可） */
const MAX_RECENT_ERRORS = 20;

/** 前端错误项（用于设置面板展示） */
export interface FrontendErrorLog {
  /** 唯一标识 */
  id: string;
  /** 错误级别 */
  level: 'error';
  /** 错误信息 */
  message: string;
  /** 附加上下文（可选） */
  context?: string;
  /** 记录时间（ISO 字符串） */
  created_at: string;
}

/** 可观测性状态 */
interface ObservabilityState {
  /** 是否已完成全局异常监听初始化 */
  isInitialized: boolean;
  /** 最近错误日志（倒序，最新在前） */
  recentErrors: FrontendErrorLog[];
  /** 是否正在导出诊断包 */
  isExporting: boolean;
  /** 最近一次导出的目录路径 */
  lastExportPath: string;
  /** 最近一次导出的文件列表 */
  lastExportFiles: string[];
  /** 最近一次导出错误信息 */
  exportError: string | null;
}

/** 全局可观测性状态 */
export const observabilityState: ObservabilityState = $state({
  isInitialized: false,
  recentErrors: [],
  isExporting: false,
  lastExportPath: '',
  lastExportFiles: [],
  exportError: null,
});

/** 模块级幂等标记，确保只初始化一次 */
let hasSetupGlobalErrorReporting = false;

/**
 * 记录错误到本地缓存
 * @param message - 错误消息
 * @param context - 错误上下文（可选）
 */
function pushRecentError(message: string, context?: string): void {
  const item: FrontendErrorLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level: 'error',
    message,
    context,
    created_at: new Date().toISOString(),
  };

  observabilityState.recentErrors = [item, ...observabilityState.recentErrors].slice(
    0,
    MAX_RECENT_ERRORS,
  );
}

/**
 * 将 unknown 错误安全转成字符串
 * @param reason - 任意错误对象
 */
function stringifyUnknownReason(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.stack || reason.message;
  }
  if (typeof reason === 'string') {
    return reason;
  }
  try {
    return JSON.stringify(reason);
  } catch {
    return String(reason);
  }
}

/**
 * 记录并上报前端错误
 * @param message - 错误消息
 * @param context - 附加上下文（可选）
 */
async function captureAndReportError(message: string, context?: string): Promise<void> {
  pushRecentError(message, context);

  try {
    await reportLog({
      level: 'error',
      message,
      context,
    });
  } catch (error) {
    console.warn('前端日志上报失败:', error);
  }
}

/**
 * 初始化全局异常上报（仅初始化一次）
 *
 * 监听：
 * - window error
 * - window unhandledrejection
 */
export function setupGlobalErrorReporting(): void {
  if (hasSetupGlobalErrorReporting) {
    return;
  }

  hasSetupGlobalErrorReporting = true;
  observabilityState.isInitialized = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    const detail = [
      event.filename ? `file=${event.filename}` : '',
      event.lineno ? `line=${event.lineno}` : '',
      event.colno ? `col=${event.colno}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    const message = event.error instanceof Error
      ? (event.error.stack || event.error.message)
      : event.message;

    void captureAndReportError(message || '未知前端错误', detail || undefined);
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reasonText = stringifyUnknownReason(event.reason);
    void captureAndReportError(reasonText || '未知 Promise 拒绝', 'type=unhandledrejection');
  });
}

/**
 * 导出诊断包
 */
export async function exportDiagnosticsBundle(): Promise<void> {
  observabilityState.isExporting = true;
  observabilityState.exportError = null;

  try {
    const result = await exportDiagnostics();
    observabilityState.lastExportPath = result.export_dir;
    observabilityState.lastExportFiles = result.files;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    observabilityState.exportError = message;
    throw new Error(
      `导出诊断包失败，步骤[invoke export_diagnostics]，` +
      `原因[${message}]。` +
      `Hint: 请检查应用目录写入权限后重试`,
    );
  } finally {
    observabilityState.isExporting = false;
  }
}
