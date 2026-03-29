/**
 * 类型统一 re-export 入口
 *
 * 所有类型定义从此文件集中导出，外部统一使用：
 * import type { ChatMessage, CaptureResult } from '$lib/types';
 */

export type {
  CaptureRegion,
  CaptureResult,
} from './capture.types';

export type {
  ChatRole,
  ChatMessage,
  ChatRequest,
  StreamEvent,
} from './chat.types';

export type {
  ApiConfig,
  AppSettings,
  AppConfig,
} from './config.types';

export type {
  LogReportRequest,
  DiagnosticsExportResult,
} from './log.types';
