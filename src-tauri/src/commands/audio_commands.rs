use tauri::{command, AppHandle};
use crate::adapters::tencent_asr_adapter::transcribe_audio;
use crate::adapters::aliyun_tts_adapter::AliyunTtsAdapter;
use crate::errors::AppError;
use crate::services::config_service::load_config;

#[command]
pub async fn stt_transcribe_audio(
    app: AppHandle,
    audio_base64: String,
    format: String,
) -> Result<String, AppError> {
    log::info!(
        "收到 STT 请求: format={}, audio_base64_len={}",
        format,
        audio_base64.len()
    );

    let app_config = load_config(&app)?;
    let secret_id = &app_config.api.tencent_secret_id;
    let secret_key = &app_config.api.tencent_secret_key;

    if secret_id.is_empty() || secret_key.is_empty() {
        return Err(AppError::TencentAsrError("Tencent SecretId or SecretKey is empty".into()));
    }

    let text = transcribe_audio(secret_id, secret_key, &audio_base64, &format).await?;
    log::info!("STT 请求完成: text_len={}", text.len());
    Ok(text)
}

#[command]
pub async fn tts_synthesize_speech(
    app: AppHandle,
    text: String,
    voice: String,
) -> Result<Vec<u8>, AppError> {
    let app_config = load_config(&app)?;
    let api_key = &app_config.api.aliyun_dashscope_key;

    if api_key.is_empty() {
        return Err(AppError::AliyunTtsError("Aliyun DashScope Key is empty".into()));
    }

    let adapter = AliyunTtsAdapter::new(api_key.clone());
    let audio_bytes = adapter.synthesize(&text, &voice).await
        .map_err(|e| AppError::AliyunTtsError(e.to_string()))?;
        
    Ok(audio_bytes)
}