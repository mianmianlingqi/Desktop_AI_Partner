//! 服务模块 —— 引擎与 React/前端 的桥梁层
//!
//! 服务编排适配器完成业务逻辑，被 commands/ 层调用
//! 依赖方向：services/ → adapters/ → types/ + config/

pub mod capture_service;
pub mod chat_service;
pub mod config_service;

#[allow(unused_imports)]
pub use capture_service::*;
#[allow(unused_imports)]
pub use chat_service::*;
#[allow(unused_imports)]
pub use config_service::*;
