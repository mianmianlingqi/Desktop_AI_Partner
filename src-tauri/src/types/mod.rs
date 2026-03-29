//! 类型模块 —— 统一 re-export 所有业务类型定义
//!
//! 提供截图、对话、配置三大领域的类型定义，
//! 外部使用 `use crate::types::*;` 即可导入全部类型

pub mod capture_types;
pub mod chat_types;
pub mod config_types;
pub mod log_types;

pub use capture_types::*;
pub use chat_types::*;
pub use config_types::*;
pub use log_types::*;
