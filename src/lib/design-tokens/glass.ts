/**
 * 毛玻璃效果设计令牌
 *
 * 定义 backdrop-filter 参数和毛玻璃变体
 * Tauri 透明窗口必备
 */

/** 毛玻璃配置 */
export const glass = {
  /** 标准模糊半径 */
  blur: '20px',
  /** 标准饱和度增强 */
  saturate: '180%',
  /** 标准 backdrop-filter 值 */
  backdropFilter: 'blur(20px) saturate(180%)',
  /** webkit 兼容 backdrop-filter */
  webkitBackdropFilter: 'blur(20px) saturate(180%)',
} as const;

/** 毛玻璃变体预设 —— 不同场景使用不同程度 */
export const glassVariants = {
  /** 轻度毛玻璃 —— 标题栏、轻量面板 */
  light: {
    backdropFilter: 'blur(12px) saturate(150%)',
    background: 'rgba(24, 24, 32, 0.55)',
    border: 'rgba(255, 255, 255, 0.06)',
  },
  /** 标准毛玻璃 —— 主面板、对话容器 */
  standard: {
    backdropFilter: 'blur(20px) saturate(180%)',
    background: 'rgba(24, 24, 32, 0.75)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
  /** 重度毛玻璃 —— 悬浮提示、弹窗 */
  heavy: {
    backdropFilter: 'blur(30px) saturate(200%)',
    background: 'rgba(24, 24, 32, 0.88)',
    border: 'rgba(255, 255, 255, 0.12)',
  },
} as const;
