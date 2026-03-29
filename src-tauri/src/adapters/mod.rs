//! 适配器模块 —— 隔离第三方库实现，提供统一接口
//!
//! 依赖方向：adapters/ → types/ + config/ + errors/
//! 上层 services/ 通过 trait 或公开方法调用适配器

pub mod screenshot_adapter;
pub mod image_encoder;
pub mod ai_adapter;
pub mod store_adapter;
pub mod tencent_asr_adapter;
pub mod tencent_asr_stream_adapter;
pub mod aliyun_tts_adapter;

#[allow(unused_imports)]
pub use screenshot_adapter::*;
#[allow(unused_imports)]
pub use image_encoder::*;
#[allow(unused_imports)]
pub use ai_adapter::*;
#[allow(unused_imports)]
pub use store_adapter::*;
#[allow(unused_imports)]
pub use tencent_asr_adapter::*;
#[allow(unused_imports)]
pub use tencent_asr_stream_adapter::*;
#[allow(unused_imports)]
pub use aliyun_tts_adapter::*;
