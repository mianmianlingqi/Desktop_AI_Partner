/**
 * 排版设计令牌
 *
 * 定义字体族、字号、行高等排版规范
 */

/** 字体族 */
export const fontFamily = {
  /** 主字体 —— 中英文 Sans Serif */
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  /** 等宽字体 —— 代码块使用 */
  mono: '"Cascadia Code", "Fira Code", "JetBrains Mono", "Consolas", monospace',
} as const;

/** 字号比例尺 */
export const fontSize = {
  /** 11px —— 极小（标注/badge） */
  xs: '11px',
  /** 12px —— 小（辅助信息） */
  sm: '12px',
  /** 13px —— 基础正文 */
  base: '13px',
  /** 14px —— 中等正文 */
  md: '14px',
  /** 16px —— 标题级 */
  lg: '16px',
  /** 20px —— 大标题 */
  xl: '20px',
} as const;

/** 行高比例尺 */
export const lineHeight = {
  /** 紧凑 */
  tight: '1.3',
  /** 正常 */
  normal: '1.5',
  /** 宽松 */
  relaxed: '1.7',
} as const;

/** 字重 */
export const fontWeight = {
  /** 正常 */
  normal: '400',
  /** 中等 */
  medium: '500',
  /** 半粗 */
  semibold: '600',
  /** 粗体 */
  bold: '700',
} as const;
