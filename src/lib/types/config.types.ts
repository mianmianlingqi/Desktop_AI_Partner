/**
 * 配置相关类型定义
 *
 * 与 Rust 端 types/config_types.rs 保持一一对应
 */

/** AI API 配置 —— 控制 AI 服务连接参数 */
export interface ApiConfig {
  /** API 密钥（如 sk-xxx） */
  api_key: string;
  /** API 基础 URL（如 https://api.openai.com/v1） */
  base_url: string;
  /** 默认模型名称（如 gpt-4o） */
  model: string;
  /** 腾讯云 STT SecretId */
  tencent_secret_id: string;
  /** 腾讯云 STT SecretKey */
  tencent_secret_key: string;
  /** 阿里云 DashScope API Key (用于 TTS) */
  aliyun_dashscope_key: string;
  /** 阿里云 TTS 接口地址 */
  aliyun_tts_endpoint: string;
  /** 阿里云 TTS 模型名称 */
  aliyun_tts_model: string;
  /** 阿里云 TTS 默认音色或复刻音色 ID */
  aliyun_tts_voice: string;
  /** 阿里云 TTS 输出格式 */
  aliyun_tts_format: string;
  /** 阿里云 TTS 额外参数（JSON 字符串） */
  aliyun_tts_extra_parameters_json: string;
}

/** 应用设置 —— 控制应用行为与外观 */
export interface AppSettings {
  /** 全局唤醒快捷键（如 Alt+Space） */
  shortcut: string;
  /** 界面语言（如 zh-CN / en-US） */
  language: string;
  /** 主题模式（dark / light） */
  theme: string;
}

/** 应用配置 —— 顶层聚合，包含 API 配置与应用设置 */
export interface AppConfig {
  /** AI API 相关配置 */
  api: ApiConfig;
  /** 应用通用设置 */
  settings: AppSettings;
}
