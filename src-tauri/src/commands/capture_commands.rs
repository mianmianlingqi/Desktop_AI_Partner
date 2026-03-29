//! 截图命令 —— 提供截屏、Overlay 窗口管理的 Tauri IPC 命令
//!
//! 命令列表：
//! - capture_screen: 截取指定区域并返回 Base64
//! - open_overlay: 创建全屏透明 Overlay 窗口
//! - close_overlay: 销毁 Overlay 窗口

use tauri::Manager;

use crate::config::defaults;
use crate::errors::AppError;
use crate::types::{CaptureRegion, CaptureResult};

/// 截取屏幕指定区域
///
/// # 前端调用
/// ```typescript
/// const result = await invoke('capture_screen', { region: { x: 0, y: 0, width: 800, height: 600 } });
/// ```
///
/// # 参数
/// - `region`: 截图矩形区域（x, y, width, height）
///
/// # Returns
/// CaptureResult 包含 base64 编码的 PNG 图片数据
#[tauri::command]
pub fn capture_screen(region: CaptureRegion) -> Result<CaptureResult, AppError> {
    log::info!(
        "截图命令: 区域 ({}, {}) {}x{}",
        region.x,
        region.y,
        region.width,
        region.height
    );
    crate::services::capture_service::capture_region(&region)
}

/// 创建全屏透明 Overlay 窗口 —— 用于截图选区 UI
///
/// # 前端调用
/// ```typescript
/// await invoke('open_overlay');
/// ```
///
/// # 说明
/// - 创建一个全屏、透明、置顶、无边框的窗口
/// - 窗口 label 为 "screenshot-overlay"（来自 defaults）
/// - 若窗口已存在则不重复创建
/// - 前端需实现 /overlay 路由来渲染选区 UI
#[tauri::command]
pub fn open_overlay(app: tauri::AppHandle) -> Result<(), AppError> {
    // 若 overlay 已存在，聚焦并返回
    if let Some(existing) = app.get_webview_window(defaults::OVERLAY_LABEL) {
        log::info!("Overlay 窗口已存在，聚焦到已有窗口");
        existing.set_focus().map_err(|e| {
            AppError::Window(format!("聚焦 Overlay 失败: {}", e))
        })?;
        return Ok(());
    }

    // 创建全屏透明 Overlay 窗口
    log::info!("创建 Overlay 截图窗口");
    tauri::WebviewWindowBuilder::new(
        &app,
        defaults::OVERLAY_LABEL,
        tauri::WebviewUrl::App(std::path::PathBuf::from(defaults::OVERLAY_URL)),
    )
        .initialization_script(&format!(
                r#"
                (() => {{
                    const target = "{target_route}";
                    if (window.location.pathname !== target) {{
                        window.history.replaceState({{}}, "", target);
                        window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                }})();
                "#,
                target_route = defaults::OVERLAY_ROUTE
        ))
    .title("Screenshot Overlay")
    .fullscreen(true)
    .transparent(true)
    .always_on_top(true)
    .decorations(false)
    .skip_taskbar(true)
    .build()?;

    Ok(())
}

/// 销毁 Overlay 窗口
///
/// # 前端调用
/// ```typescript
/// await invoke('close_overlay');
/// ```
///
/// # 说明
/// - 查找 label 为 "screenshot-overlay" 的窗口并关闭
/// - 若窗口不存在则静默返回（幂等操作）
#[tauri::command]
pub fn close_overlay(app: tauri::AppHandle) -> Result<(), AppError> {
    if let Some(window) = app.get_webview_window(defaults::OVERLAY_LABEL) {
        log::info!("关闭 Overlay 截图窗口");
        window.close()?;
    } else {
        log::info!("Overlay 窗口不存在，无需关闭");
    }
    Ok(())
}
