/**
 * 间距设计令牌
 *
 * 基于 4px 基准的间距系统
 * 统一全局间距，避免魔法数字
 */

/** 间距比例尺（单位: px） */
export const spacing = {
  /** 2px —— 最小间距 */
  xxs: '2px',
  /** 4px —— 极小间距 */
  xs: '4px',
  /** 8px —— 小间距 */
  sm: '8px',
  /** 12px —— 中小间距 */
  md: '12px',
  /** 16px —— 标准间距 */
  lg: '16px',
  /** 20px —— 中大间距 */
  xl: '20px',
  /** 24px —— 大间距 */
  xxl: '24px',
  /** 32px —— 超大间距 */
  xxxl: '32px',
} as const;

/** 圆角比例尺 */
export const borderRadius = {
  /** 4px —— 小圆角 */
  sm: '4px',
  /** 8px —— 中圆角 */
  md: '8px',
  /** 12px —— 大圆角 */
  lg: '12px',
  /** 16px —— 超大圆角 */
  xl: '16px',
  /** 9999px —— 胶囊圆角 */
  full: '9999px',
} as const;
