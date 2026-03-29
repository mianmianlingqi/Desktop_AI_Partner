/**
 * 配置状态管理 —— Svelte 5 Runes
 *
 * 管理应用配置的加载和持久化
 * 配置的实际读写委托给 config.service
 */

import type { AppConfig } from '$lib/types';
import { DEFAULT_APP_CONFIG } from '$lib/constants';
import { getConfig, setConfig } from '$lib/services';

/** 配置状态接口 */
interface ConfigState {
  /** 当前应用配置 */
  config: AppConfig;
  /** 是否已从后端加载完毕 */
  isLoaded: boolean;
  /** 是否正在保存 */
  isSaving: boolean;
}

/** 配置状态 —— 全局响应式状态 */
export const configState: ConfigState = $state({
  config: DEFAULT_APP_CONFIG,
  isLoaded: false,
  isSaving: false,
});

/**
 * 从 Rust 后端加载配置
 * 加载失败时保留默认配置并打印警告
 */
export async function loadConfig(): Promise<void> {
  try {
    const config = await getConfig();
    configState.config = config;
    configState.isLoaded = true;
  } catch (err) {
    console.warn('配置加载失败，使用默认配置:', err);
    configState.config = DEFAULT_APP_CONFIG;
    configState.isLoaded = true;
  }
}

/**
 * 保存配置到 Rust 后端
 * @param config - 要保存的配置（同时更新本地状态）
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  configState.isSaving = true;
  try {
    await setConfig(config);
    configState.config = config;
  } catch (err) {
    throw new Error(
      `配置保存失败，步骤[invoke set_config]，` +
      `原因[${err instanceof Error ? err.message : String(err)}]。` +
      `Hint: 请检查文件写入权限或重试`,
    );
  } finally {
    configState.isSaving = false;
  }
}
