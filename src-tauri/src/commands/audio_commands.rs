use tauri::{command, AppHandle};
use crate::adapters::tencent_asr_adapter::transcribe_audio;
use crate::adapters::aliyun_tts_adapter::{AliyunTtsAdapter, TtsSynthesizeOptions};
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
    voice: Option<String>,
    model: Option<String>,
    endpoint: Option<String>,
    format: Option<String>,
    extra_parameters_json: Option<String>,
) -> Result<Vec<u8>, AppError> {
    let app_config = load_config(&app)?;
    let api_key = &app_config.api.aliyun_dashscope_key;

    if api_key.is_empty() {
        return Err(AppError::AliyunTtsError("Aliyun DashScope Key is empty".into()));
    }

    let synth_options = TtsSynthesizeOptions {
        endpoint: prefer_runtime_or_config(endpoint, &app_config.api.aliyun_tts_endpoint),
        model: prefer_runtime_or_config(model, &app_config.api.aliyun_tts_model),
        voice: prefer_runtime_or_config(voice, &app_config.api.aliyun_tts_voice),
        format: prefer_runtime_or_config(format, &app_config.api.aliyun_tts_format),
        extra_parameters_json: prefer_runtime_or_config(
            extra_parameters_json,
            &app_config.api.aliyun_tts_extra_parameters_json,
        ),
    };

    log::info!(
        "收到 TTS 请求: model={}, voice={}, format={}, endpoint={}, text_len={}, extra_parameters_len={}",
        synth_options.model,
        synth_options.voice,
        synth_options.format,
        synth_options.endpoint,
        text.len(),
        synth_options.extra_parameters_json.len()
    );

    let adapter = AliyunTtsAdapter::new(api_key.clone());
    let audio_bytes = adapter.synthesize(&text, &synth_options).await
        .map_err(|e| AppError::AliyunTtsError(e.to_string()))?;

    log::info!("TTS 请求完成: audio_bytes_len={}", audio_bytes.len());
        
    Ok(audio_bytes)
}

fn prefer_runtime_or_config(runtime: Option<String>, from_config: &str) -> String {
    match runtime {
        Some(value) if !value.trim().is_empty() => value.trim().to_string(),
        _ => from_config.to_string(),
    }
}