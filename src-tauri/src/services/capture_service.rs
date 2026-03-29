//! 截图服务 —— 编排截图适配器和图片编码适配器完成截图流程
//!
//! 流程：全屏截图 → 区域裁剪 → PNG 编码 → Base64 输出

use crate::adapters::image_encoder::{ImageEncode, PngEncoder};
use crate::adapters::screenshot_adapter::{ScreenCapture, XcapAdapter};
use crate::errors::AppError;
use crate::types::{CaptureRegion, CaptureResult};

/// 截取指定区域的屏幕并返回 Base64 编码结果
///
/// # 参数
/// - `region`: 要截取的屏幕矩形区域
///
/// # 流程
/// 1. 使用 XcapAdapter 截取主显示器全屏图像
/// 2. 根据 region 参数裁剪指定矩形区域
/// 3. 使用 PngEncoder 编码为 PNG 字节流
/// 4. 转换为 Base64 字符串并包装为 CaptureResult
///
/// # Errors
/// - 截图失败返回 Capture 错误
/// - 编码失败返回 Capture 错误（通过 From<ImageError>）
pub fn capture_region(region: &CaptureRegion) -> Result<CaptureResult, AppError> {
    // 1. 截取全屏图像
    let adapter = XcapAdapter;
    let full_image = adapter.capture_full_screen()?;

    // 2. 校验并裁剪区域（防御性处理负坐标）
    let x = region.x.max(0) as u32;
    let y = region.y.max(0) as u32;
    let width = region.width.min(full_image.width().saturating_sub(x));
    let height = region.height.min(full_image.height().saturating_sub(y));

    if width == 0 || height == 0 {
        return Err(AppError::Capture(
            "截图区域无效：宽度或高度为 0。Hint: 检查截图区域坐标是否正确".to_string(),
        ));
    }

    let cropped = image::imageops::crop_imm(&full_image, x, y, width, height).to_image();

    // 3. 编码为 PNG 并转 Base64
    let encoder = PngEncoder;
    let png_bytes = encoder.encode_png(&cropped)?;
    let base64_str = encoder.to_base64(&png_bytes);

    // 4. 组装结果
    Ok(CaptureResult {
        base64: base64_str,
        width,
        height,
    })
}
