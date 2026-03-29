/**
 * 前端默认值常量
 *
 * 与 Rust 端 config/defaults.rs 保持镜像
 * 用于前端 UI 展示占位 / 初始状态 / 校验参考
 */

import type { AppConfig } from '$lib/types';

// ======== AI API 默认值 ========

/** 默认 AI 模型名称 */
export const DEFAULT_MODEL = 'gpt-4o';

/** 默认 API 基础 URL（OpenAI 官方端点） */
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/** 默认阿里云 TTS 接口地址 */
export const DEFAULT_ALIYUN_TTS_ENDPOINT = 'wss://dashscope.aliyuncs.com/api-ws/v1/inference/';

/** 默认阿里云 TTS 模型名称 */
export const DEFAULT_ALIYUN_TTS_MODEL = 'cosyvoice-v1';

/** 默认阿里云 TTS 音色 */
export const DEFAULT_ALIYUN_TTS_VOICE = 'longxiaoxia';

/** 默认阿里云 TTS 音频格式 */
export const DEFAULT_ALIYUN_TTS_FORMAT = 'wav';

// ======== 应用设置默认值 ========

/** 默认全局唤醒快捷键 */
export const DEFAULT_SHORTCUT = 'Alt+Space';

/** 默认界面语言 */
export const DEFAULT_LANGUAGE = 'zh-CN';

/** 默认主题模式 */
export const DEFAULT_THEME = 'dark';

// ======== 窗口标识 ========

/** Overlay 窗口 label */
export const OVERLAY_LABEL = 'screenshot-overlay';

/** 主窗口 label */
export const MAIN_WINDOW_LABEL = 'main';

// ======== 默认完整配置对象 ========

/** 前端默认 AppConfig —— 用于初始化状态和兜底 */
export const DEFAULT_APP_CONFIG: AppConfig = {
  api: {
    api_key: '',
    base_url: DEFAULT_BASE_URL,
    model: DEFAULT_MODEL,
    tencent_secret_id: '',
    tencent_secret_key: '',
    aliyun_dashscope_key: '',
    aliyun_tts_endpoint: DEFAULT_ALIYUN_TTS_ENDPOINT,
    aliyun_tts_model: DEFAULT_ALIYUN_TTS_MODEL,
    aliyun_tts_voice: DEFAULT_ALIYUN_TTS_VOICE,
    aliyun_tts_format: DEFAULT_ALIYUN_TTS_FORMAT,
    aliyun_tts_extra_parameters_json: '',
  },
  settings: {
    shortcut: DEFAULT_SHORTCUT,
    language: DEFAULT_LANGUAGE,
    theme: DEFAULT_THEME,
  },
};
