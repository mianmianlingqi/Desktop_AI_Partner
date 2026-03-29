//! 腾讯云一句话识别(ASR) API 适配�?
//! 
//! 完成 Tencent Cloud API v3.0 �?HMAC-SHA256 签名以及请求发�?

use crate::errors::AppError;
use reqwest::Client;
use hmac::{Hmac, Mac};
use sha2::{Sha256, Digest};
use std::time::{SystemTime, UNIX_EPOCH};
use serde::{Deserialize, Serialize};

type HmacSha256 = Hmac<Sha256>;

#[derive(Serialize)]
struct AsrRequest {
    #[serde(rename = "ProjectId")]
    pub project_id: u32,
    #[serde(rename = "SubServiceType")]
    pub sub_service_type: u32,
    #[serde(rename = "EngSerViceType")]
    pub eng_service_type: String,
    #[serde(rename = "SourceType")]
    pub source_type: u32,
    #[serde(rename = "VoiceFormat")]
    pub voice_format: String,
    #[serde(rename = "UsrAudioKey")]
    pub usr_audio_key: String,
    #[serde(rename = "Data")]
    pub data: String,
    #[serde(rename = "DataLen")]
    pub data_len: usize,
}

#[derive(Deserialize, Debug)]
struct AsrResponse {
    #[serde(rename = "Response")]
    pub response: AsrResponseBody,
}

#[derive(Deserialize, Debug)]
struct AsrResponseBody {
    #[serde(rename = "Result")]
    pub result: Option<String>,
    #[serde(rename = "Error")]
    pub error: Option<TencentError>,
}

#[derive(Deserialize, Debug)]
struct TencentError {
    #[serde(rename = "Code")]
    pub code: String,
    #[serde(rename = "Message")]
    pub message: String,
}

/// 发起一句话识别请求
pub async fn transcribe_audio(
    secret_id: &str,
    secret_key: &str,
    audio_base64: &str,
    format: &str, // e.g., "wav", "mp3"
) -> Result<String, AppError> {
    if secret_id.is_empty() || secret_key.is_empty() {
        return Err(AppError::TencentAsrError("SecretId �?SecretKey 为空，请在设置中配置".into()));
    }
    if audio_base64.trim().is_empty() {
        return Err(AppError::TencentAsrError("音频数据为空，请重新录音后再试".into()));
    }

    log::info!(
        "开始腾讯云 STT 请求: format={}, audio_base64_len={}",
        format,
        audio_base64.len()
    );

    let endpoint = "asr.tencentcloudapi.com";
    let service = "asr";
    let version = "2019-06-14";
    let action = "SentenceRecognition";
    let region: Option<&str> = None; // 一句话识别可不传，避免发送空 Region 头

    let mut pad_count = 0;
    for &b in audio_base64.as_bytes().iter().rev() {
        if b == b'=' {
            pad_count += 1;
        } else {
            break;
        }
    }
    let data_len = ((audio_base64.len() / 4) * 3).saturating_sub(pad_count);

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| AppError::TencentAsrError(format!("系统时间异常: {}", e)))?;
    let timestamp = now.as_secs() as i64;

    // Payload
    let payload = AsrRequest {
        project_id: 0,
        sub_service_type: 2, // 2: 一句话识别
        eng_service_type: "16k_zh".to_string(), // 16k 中文
        source_type: 1, // 1: 控制台传�?
        voice_format: format.to_string(),
        usr_audio_key: format!("ai_partner_{}", now.as_millis()),
        data: audio_base64.to_string(),
        data_len,
    };
    
    let payload_str = serde_json::to_string(&payload)?;

    let client = Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| AppError::TencentAsrError(format!("Build client 失败: {}", e)))?;
    
    let date = chrono::DateTime::<chrono::Utc>::from_timestamp(timestamp, 0)
        .ok_or_else(|| AppError::TencentAsrError("生成签名日期失败：无效时间戳".into()))?
        .format("%Y-%m-%d")
        .to_string();

    // 1. 拼接规范请求�?
    let http_request_method = "POST";
    let canonical_uri = "/";
    let canonical_querystring = "";
    let canonical_headers = format!("content-type:application/json\nhost:{}\n", endpoint);
    let signed_headers = "content-type;host";
    let mut hasher = Sha256::new();
    hasher.update(payload_str.as_bytes());
    let hashed_request_payload = hex::encode(hasher.finalize());
    let canonical_request = format!(
        "{}\n{}\n{}\n{}\n{}\n{}",
        http_request_method, canonical_uri, canonical_querystring, canonical_headers, signed_headers, hashed_request_payload
    );

    // 2. 拼接待签名字符串
    let credential_scope = format!("{}/{}/tc3_request", date, service);
    let mut hasher2 = Sha256::new();
    hasher2.update(canonical_request.as_bytes());
    let hashed_canonical_request = hex::encode(hasher2.finalize());
    let string_to_sign = format!(
        "TC3-HMAC-SHA256\n{}\n{}\n{}",
        timestamp, credential_scope, hashed_canonical_request
    );

    // 3. 计算签名
    let secret_date = hmac_sha256(format!("TC3{}", secret_key).as_bytes(), date.as_bytes());
    let secret_service = hmac_sha256(&secret_date, service.as_bytes());
    let secret_signing = hmac_sha256(&secret_service, b"tc3_request");
    let signature = hex::encode(hmac_sha256(&secret_signing, string_to_sign.as_bytes()));

    // 4. 拼接 Authorization
    let authorization = format!(
        "TC3-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}",
        secret_id, credential_scope, signed_headers, signature
    );

    let mut request = client.post(format!("https://{}", endpoint))
        .header("Authorization", authorization)
        .header("Content-Type", "application/json")
        .header("Host", endpoint)
        .header("X-TC-Action", action)
        .header("X-TC-Timestamp", timestamp.to_string())
        .header("X-TC-Version", version);

    if let Some(region_value) = region {
        if !region_value.trim().is_empty() {
            request = request.header("X-TC-Region", region_value);
        }
    }

    let res = request
        .body(payload_str)
        .send()
        .await
        .map_err(|e| AppError::TencentAsrError(format!("请求网络失败: {}", e)))?;

    let status_code = res.status();
    let body = res.text().await.unwrap_or_default();
    
    if !status_code.is_success() {
        log::error!("腾讯云 STT HTTP错误: status={}, body={}", status_code, body);
        return Err(AppError::TencentAsrError(format!("HTTP错误: {} - {}", status_code, body)));
    }

    let resp_obj: AsrResponse = serde_json::from_str(&body)
        .map_err(|e| AppError::TencentAsrError(format!("解析响应失败: {} - {}", e, body)))?;

    if let Some(err) = resp_obj.response.error {
        log::error!("腾讯云 STT API错误: code={}, message={}", err.code, err.message);
        return Err(AppError::TencentAsrError(format!("API 错误: [{}] {}", err.code, err.message)));
    }

    let result = resp_obj.response.result.unwrap_or_default();
    if result.trim().is_empty() {
        log::warn!("腾讯云 STT 返回空结果");
    }
    Ok(result)
}


fn hmac_sha256(key: &[u8], msg: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(key).expect("HMAC can take key of any size");
    mac.update(msg);
    mac.finalize().into_bytes().to_vec()
}

