/**
 * 颜色设计令牌
 *
 * 定义所有主题颜色的单一来源（Single Source of Truth）
 * 外部消费方：app.css CSS 变量、Svelte 组件
 */

/** 毛玻璃面板颜色 */
export const glassColors = {
  /** 毛玻璃背景色（半透明深灰） */
  background: 'rgba(24, 24, 32, 0.75)',
  /** 毛玻璃边框色（微透明白） */
  border: 'rgba(255, 255, 255, 0.08)',
  /** 毛玻璃悬停背景 */
  backgroundHover: 'rgba(32, 32, 44, 0.85)',
  /** 毛玻璃激活背景 */
  backgroundActive: 'rgba(40, 40, 52, 0.9)',
} as const;

/** 主题色（蓝紫渐变系） */
export const themeColors = {
  /** 主色调 —— 用于主要按钮和强调元素 */
  primary: '#6366f1',
  /** 主色调悬停 */
  primaryHover: '#818cf8',
  /** 主色调激活 */
  primaryActive: '#4f46e5',
  /** 次要色调 —— 用于次要按钮和辅助元素 */
  secondary: '#8b5cf6',
  /** 成功 */
  success: '#22c55e',
  /** 警告 */
  warning: '#f59e0b',
  /** 危险/错误 */
  danger: '#ef4444',
} as const;

/** 文字颜色 */
export const textColors = {
  /** 主要文字 */
  primary: 'rgba(255, 255, 255, 0.95)',
  /** 次要文字 */
  secondary: 'rgba(255, 255, 255, 0.65)',
  /** 占位符文字 */
  placeholder: 'rgba(255, 255, 255, 0.35)',
  /** 禁用态文字 */
  disabled: 'rgba(255, 255, 255, 0.25)',
} as const;

/** 消息气泡颜色 */
export const messageColors = {
  /** 用户消息背景 */
  userBubble: 'rgba(99, 102, 241, 0.25)',
  /** 用户消息边框 */
  userBorder: 'rgba(99, 102, 241, 0.4)',
  /** AI 消息背景 */
  assistantBubble: 'rgba(255, 255, 255, 0.06)',
  /** AI 消息边框 */
  assistantBorder: 'rgba(255, 255, 255, 0.1)',
} as const;
