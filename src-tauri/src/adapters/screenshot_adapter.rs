//! xcap 截图适配器 —— 封装 xcap crate 实现屏幕截图
//!
//! 使用 xcap::Monitor 获取显示器并截取全屏图像，
//! 返回 image::RgbaImage 供后续裁剪和编码使用

use image::RgbaImage;

use crate::errors::AppError;

/// 屏幕截图 trait —— 定义截图能力的抽象接口
pub trait ScreenCapture {
    /// 截取主显示器全屏图像
    fn capture_full_screen(&self) -> Result<RgbaImage, AppError>;
}

/// xcap 截图适配器 —— 基于 xcap crate 的具体实现
pub struct XcapAdapter;

impl ScreenCapture for XcapAdapter {
    /// 截取主显示器全屏图像
    ///
    /// # 流程
    /// 1. 获取所有可用显示器列表
    /// 2. 取第一个显示器（通常为主屏）
    /// 3. 调用 capture_image() 截取全屏 RGBA 图像
    ///
    /// # Errors
    /// - 无法获取显示器列表时返回 Capture 错误
    /// - 截图失败时返回 Capture 错误
    fn capture_full_screen(&self) -> Result<RgbaImage, AppError> {
        // 1. 获取所有显示器
        let monitors = xcap::Monitor::all().map_err(|e| {
            AppError::Capture(format!(
                "获取显示器列表失败: {}。Hint: 检查系统是否允许截图权限",
                e
            ))
        })?;

        // 2. 取主显示器（列表第一个）
        let monitor = monitors.into_iter().next().ok_or_else(|| {
            AppError::Capture(
                "未找到任何显示器。Hint: 确认系统已连接显示器".to_string(),
            )
        })?;

        // 3. 截取全屏图像
        let image = monitor.capture_image().map_err(|e| {
            AppError::Capture(format!(
                "截取屏幕图像失败: {}。Hint: 检查是否有其他程序占用截图 API",
                e
            ))
        })?;

        Ok(image)
    }
}
