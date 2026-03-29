/**
 * 截图状态管理 —— Svelte 5 Runes
 *
 * 管理当前截图结果和截图进行中状态
 */

import type { CaptureResult } from '$lib/types';

/** 截图状态接口 */
interface CaptureState {
  /** 当前截图结果（null 表示无截图） */
  currentImage: CaptureResult | null;
  /** 是否正在进行截图操作 */
  isCapturing: boolean;
}

/** 截图状态 —— 全局响应式状态 */
export const captureState: CaptureState = $state({
  currentImage: null,
  isCapturing: false,
});

/**
 * 设置当前截图结果
 * @param image - 截图结果
 */
export function setImage(image: CaptureResult): void {
  captureState.currentImage = image;
}

/**
 * 清除当前截图
 */
export function clearImage(): void {
  captureState.currentImage = null;
}

/**
 * 设置截图进行中状态
 * @param capturing - 是否正在截图
 */
export function setCapturing(capturing: boolean): void {
  captureState.isCapturing = capturing;
}
