//! 截图相关类型定义
//!
//! 包含截图区域（CaptureRegion）和截图结果（CaptureResult）

use serde::{Deserialize, Serialize};

/// 截图区域 —— 指定屏幕上的矩形选区
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureRegion {
    /// 区域左上角 X 坐标（像素，允许负值对应多屏场景）
    pub x: i32,
    /// 区域左上角 Y 坐标（像素）
    pub y: i32,
    /// 区域宽度（像素）
    pub width: u32,
    /// 区域高度（像素）
    pub height: u32,
}

/// 截图结果 —— 包含 Base64 编码的 PNG 图片数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureResult {
    /// Base64 编码的 PNG 图片数据（不含 data:image/png;base64, 前缀）
    pub base64: String,
    /// 图片宽度（像素）
    pub width: u32,
    /// 图片高度（像素）
    pub height: u32,
}
