//! 统一应用错误枚举
//!
//! 使用 thiserror 派生 Display/Error trait，
//! 手动实现 Serialize 以兼容 Tauri v2 IPC InvokeError 序列化

use serde::Serialize;

/// 应用统一错误类型 —— 所有层共用的错误枚举
///
/// 每个变体对应一个业务域，错误信息包含：
/// 1. 哪一步失败（变体名称）
/// 2. 为什么失败（内部字符串）
/// 3. 怎么修复（由调用方在构建错误时提供 Hint）
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// IO 相关错误 —— 文件读写/目录创建/复制失败
    #[error("IO 错误: {0}")]
    Io(String),

    /// 配置相关错误 —— 读取/写入/解析配置失败
    #[error("配置错误: {0}")]
    Config(String),

    /// 截图相关错误 —— 截屏/裁剪/编码失败
    #[error("截图错误: {0}")]
    Capture(String),

    /// 对话相关错误 —— AI API 调用/流式传输/消息构建失败
    #[error("对话错误: {0}")]
    Chat(String),

    /// 窗口相关错误 —— 创建/关闭/操作窗口失败
    #[error("窗口错误: {0}")]
    Window(String),

    /// 序列化/反序列化错误 —— JSON 解析/生成失败
    #[error("序列化错误: {0}")]
    Serialization(String),

    /// 腾讯云语音识别 API 请求/解析失败
    #[error("腾讯云STT错误: {0}")]
    TencentAsrError(String),

    /// 阿里云语音合成 API 请求/解析失败
    #[error("阿里云TTS错误: {0}")]
    AliyunTtsError(String),
}

// ======== Tauri v2 IPC 兼容 ========
// 将错误以字符串形式序列化传递给前端，前端通过 error.message 读取
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ======== From 类型转换 —— 各层错误自动转为 AppError ========

/// serde_json 错误 → 序列化错误
impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Serialization(format!(
            "JSON 序列化/反序列化失败: {}。Hint: 检查数据格式是否正确",
            e
        ))
    }
}

/// image crate 错误 → 截图错误
impl From<image::ImageError> for AppError {
    fn from(e: image::ImageError) -> Self {
        AppError::Capture(format!(
            "图片处理失败: {}。Hint: 检查图片数据是否完整",
            e
        ))
    }
}

/// Tauri 框架错误 → 窗口错误
impl From<tauri::Error> for AppError {
    fn from(e: tauri::Error) -> Self {
        AppError::Window(format!(
            "Tauri 框架错误: {}。Hint: 检查窗口配置或权限声明",
            e
        ))
    }
}

/// 标准库 IO 错误 → IO 错误
impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(format!(
            "文件系统操作失败: {}。Hint: 检查目录权限、路径有效性或磁盘可用空间",
            e
        ))
    }
}
