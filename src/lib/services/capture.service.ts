/**
 * 截图服务 —— 封装截图相关 Tauri 命令调用
 *
 * 职责：将前端调用转为 Tauri invoke，隔离 IPC 细节
 * 依赖方向：services/ → constants/ + types/
 */

import { invoke } from '@tauri-apps/api/core';
import {
  CMD_CAPTURE_SCREEN,
  CMD_OPEN_OVERLAY,
  CMD_CLOSE_OVERLAY,
} from '$lib/constants';
import type { CaptureRegion, CaptureResult } from '$lib/types';

/**
 * 截取屏幕指定区域
 * @param region - 截图矩形区域
 * @returns Base64 编码的截图结果
 */
export async function captureScreen(region: CaptureRegion): Promise<CaptureResult> {
  return invoke<CaptureResult>(CMD_CAPTURE_SCREEN, { region });
}

/**
 * 打开截图 Overlay 窗口 —— 弹出全屏透明窗口供用户画选区
 */
export async function openOverlay(): Promise<void> {
  return invoke(CMD_OPEN_OVERLAY);
}

/**
 * 关闭截图 Overlay 窗口
 */
export async function closeOverlay(): Promise<void> {
  return invoke(CMD_CLOSE_OVERLAY);
}
