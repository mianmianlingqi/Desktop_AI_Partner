/**
 * 配置服务 —— 封装配置读写 Tauri 命令调用
 *
 * 职责：将前端配置操作转为 Tauri invoke
 * 依赖方向：services/ → constants/ + types/
 */

import { invoke } from '@tauri-apps/api/core';
import { CMD_GET_CONFIG, CMD_SET_CONFIG } from '$lib/constants';
import type { AppConfig } from '$lib/types';

/**
 * 读取完整应用配置
 * @returns 当前 AppConfig（若 store 中无配置则返回默认值）
 */
export async function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>(CMD_GET_CONFIG);
}

/**
 * 更新完整应用配置
 * @param config - 要保存的配置对象
 */
export async function setConfig(config: AppConfig): Promise<void> {
  return invoke(CMD_SET_CONFIG, { config });
}
