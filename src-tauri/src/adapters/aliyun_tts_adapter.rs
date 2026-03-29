use reqwest::{Client, header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE}};
use serde::Serialize;
use std::error::Error;

#[derive(Debug, Serialize)]
pub struct TtsRequest {
    pub model: String,
    pub input: TtsInput,
    pub parameters: TtsParameters,
}

#[derive(Debug, Serialize)]
pub struct TtsInput {
    pub text: String,
}

#[derive(Debug, Serialize)]
pub struct TtsParameters {
    pub voice: String,
    pub format: String,
}

pub struct AliyunTtsAdapter {
    client: Client,
    api_key: String,
}

impl AliyunTtsAdapter {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
        }
    }

    pub async fn synthesize(&self, text: &str, voice: &str) -> Result<Vec<u8>, Box<dyn Error + Send + Sync>> {
        let url = "https://dashscope.aliyuncs.com/api/v1/services/audio/tts/text-to-wav";

        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", self.api_key))?,
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        let request_body = TtsRequest {
            model: "cosyvoice-v1".to_string(),
            input: TtsInput {
                text: text.to_string(),
            },
            parameters: TtsParameters {
                voice: voice.to_string(),
                format: "wav".to_string(),
            },
        };

        let response = self
            .client
            .post(url)
            .headers(headers)
            .json(&request_body)
            .send()
            .await?;

        if response.status().is_success() {
            let bytes = response.bytes().await?;
            Ok(bytes.to_vec())
        } else {
            let error_text = response.text().await?;
            Err(format!("Aliyun TTS API Error: {}", error_text).into())
        }
    }
}
