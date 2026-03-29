//! 图片编码适配器 —— 封装 image + base64 crate 实现图片编码
//!
//! 将 RgbaImage 编码为 PNG 字节流，并转换为 Base64 字符串

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use image::RgbaImage;

use crate::errors::AppError;

/// 图片编码 trait —— 定义图片编码能力的抽象接口
pub trait ImageEncode {
    /// 将 RGBA 图像编码为 PNG 格式字节流
    fn encode_png(&self, image: &RgbaImage) -> Result<Vec<u8>, AppError>;

    /// 将字节流转换为 Base64 字符串
    fn to_base64(&self, bytes: &[u8]) -> String;
}

/// PNG 编码器 —— 基于 image crate 的 PNG 编码实现
pub struct PngEncoder;

impl ImageEncode for PngEncoder {
    /// 将 RgbaImage 编码为 PNG 字节流
    ///
    /// # 流程
    /// 1. 将 RgbaImage 包装为 DynamicImage
    /// 2. 写入内存 Cursor，输出 PNG 格式
    /// 3. 提取字节向量返回
    ///
    /// # Errors
    /// 图片编码失败时返回 Capture 错误（自动通过 From<ImageError> 转换）
    fn encode_png(&self, rgba_image: &RgbaImage) -> Result<Vec<u8>, AppError> {
        use std::io::Cursor;

        let dynamic = image::DynamicImage::ImageRgba8(rgba_image.clone());
        let mut cursor = Cursor::new(Vec::new());
        dynamic.write_to(&mut cursor, image::ImageFormat::Png)?;

        Ok(cursor.into_inner())
    }

    /// 将任意字节流转换为 Base64 编码字符串
    fn to_base64(&self, bytes: &[u8]) -> String {
        STANDARD.encode(bytes)
    }
}
