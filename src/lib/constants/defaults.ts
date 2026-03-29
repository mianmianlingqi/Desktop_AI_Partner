/**
 * 前端默认值常量
 *
 * 与 Rust 端 config/defaults.rs 保持镜像
 * 用于前端 UI 展示占位 / 初始状态 / 校验参考
 */

import type { AppConfig } from '$lib/types';

/** 系统提示词预设项 */
export interface SystemPromptPresetItem {
  /** 唯一标识 */
  id: string;
  /** 下拉框显示文案 */
  label: string;
  /** 预设系统提示词内容 */
  prompt: string;
}

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

/** 默认系统提示词预设 ID */
export const DEFAULT_SYSTEM_PROMPT_PRESET = 'assistant-default';

/** 默认系统提示词 */
export const DEFAULT_SYSTEM_PROMPT =
  '你是桌面 AI 助手。请优先给出清晰结论，再给关键步骤，表达简洁、可执行。';

/** 系统提示词最大长度（字符） */
export const MAX_SYSTEM_PROMPT_LENGTH = 12000;

/** 系统提示词预设（用于设置页选择角色） */
export const SYSTEM_PROMPT_PRESETS: SystemPromptPresetItem[] = [
  {
    id: 'assistant-default',
    label: '通用助手',
    prompt:
      '你是桌面 AI 助手。请优先给出清晰结论，再给关键步骤，表达简洁、可执行。',
  },
  {
    id: 'product-manager',
    label: '产品经理',
    prompt:
      '你是一名资深产品经理。请先给目标和结论，再输出需求拆解、优先级与里程碑，明确风险与验收标准。',
  },
  {
    id: 'senior-engineer',
    label: '高级工程师',
    prompt:
      '你是一名高级工程师。回答时请先给可运行方案，再说明关键实现细节、边界条件和验证步骤。',
  },
  {
    id: 'writing-coach',
    label: '写作顾问',
    prompt:
      '你是专业写作顾问。请在不改变原意前提下优化结构与表达，给出更清晰的版本，并指出主要修改理由。',
  },
];

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
    system_prompt_preset: DEFAULT_SYSTEM_PROMPT_PRESET,
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    system_prompt_custom_presets: [],
  },
};
