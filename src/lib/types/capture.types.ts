/**
 * 截图相关类型定义
 *
 * 与 Rust 端 types/capture_types.rs 保持一一对应
 */

/** 截图区域 —— 指定屏幕上的矩形选区 */
export interface CaptureRegion {
  /** 区域左上角 X 坐标（像素，允许负值对应多屏场景） */
  x: number;
  /** 区域左上角 Y 坐标（像素） */
  y: number;
  /** 区域宽度（像素） */
  width: number;
  /** 区域高度（像素） */
  height: number;
}

/** 截图结果 —— 包含 Base64 编码的 PNG 图片数据 */
export interface CaptureResult {
  /** Base64 编码的 PNG 图片数据（不含 data:image/png;base64, 前缀） */
  base64: string;
  /** 图片宽度（像素） */
  width: number;
  /** 图片高度（像素） */
  height: number;
}
