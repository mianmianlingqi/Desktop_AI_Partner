use futures_util::{SinkExt, StreamExt};
use reqwest::{Client, header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE}};
use serde::Serialize;
use serde_json::{Map, Value, json};
use std::error::Error;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use url::Url;

use crate::config::defaults;

#[derive(Debug, Serialize)]
pub struct TtsRequest {
    pub model: String,
    pub input: TtsInput,
    pub parameters: Value,
}

#[derive(Debug, Serialize)]
pub struct TtsInput {
    pub text: String,
}

#[derive(Debug, Clone)]
pub struct TtsSynthesizeOptions {
    pub endpoint: String,
    pub model: String,
    pub voice: String,
    pub format: String,
    pub extra_parameters_json: String,
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

    pub async fn synthesize(&self, text: &str, options: &TtsSynthesizeOptions) -> Result<Vec<u8>, Box<dyn Error + Send + Sync>> {
        if text.trim().is_empty() {
            return Err("Aliyun TTS 文本不能为空".into());
        }

        let endpoint = if options.endpoint.trim().is_empty() {
            defaults::DEFAULT_ALIYUN_TTS_ENDPOINT.to_string()
        } else {
            options.endpoint.trim().to_string()
        };

        let model = if options.model.trim().is_empty() {
            defaults::DEFAULT_ALIYUN_TTS_MODEL.to_string()
        } else {
            options.model.trim().to_string()
        };

        let voice = if options.voice.trim().is_empty() {
            defaults::DEFAULT_ALIYUN_TTS_VOICE.to_string()
        } else {
            options.voice.trim().to_string()
        };

        let format = if options.format.trim().is_empty() {
            defaults::DEFAULT_ALIYUN_TTS_FORMAT.to_string()
        } else {
            options.format.trim().to_string()
        };

        let mut headers = HeaderMap::new();
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", self.api_key))?,
        );
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));

        // CosyVoice 在阿里云百炼侧优先走 WebSocket 协议。
        // 若模型为 cosyvoice-*，即使 endpoint 配置为 http，也会自动切换到 ws 推理通道。
        if Self::should_use_websocket(&endpoint, &model) {
            return self
                .synthesize_via_websocket(text, &endpoint, &model, &voice, &format, &options.extra_parameters_json)
                .await;
        }

        let parameters = Self::build_parameters_payload(&voice, &format, &options.extra_parameters_json)?;
        let request_body = TtsRequest {
            model,
            input: TtsInput {
                text: text.to_string(),
            },
            parameters,
        };

        log::info!(
            "Aliyun TTS 请求: endpoint={}, model={}, voice={}, format={}, text_len={}",
            endpoint,
            request_body.model,
            voice,
            format,
            text.len()
        );

        let response = self
            .client
            .post(endpoint)
            .headers(headers)
            .json(&request_body)
            .send()
            .await?;

        if response.status().is_success() {
            let bytes = response.bytes().await?;
            Ok(bytes.to_vec())
        } else {
            let error_text = response.text().await?;
            log::error!("Aliyun TTS API 请求失败: {}", error_text);
            Err(format!("Aliyun TTS API Error: {}", error_text).into())
        }
    }

    async fn synthesize_via_websocket(
        &self,
        text: &str,
        endpoint: &str,
        model: &str,
        voice: &str,
        format: &str,
        extra_parameters_json: &str,
    ) -> Result<Vec<u8>, Box<dyn Error + Send + Sync>> {
        let ws_endpoint = Self::normalize_websocket_endpoint(endpoint)?;
        let mut ws_url = Url::parse(&ws_endpoint)?;
        ws_url.query_pairs_mut().append_pair("api_key", &self.api_key);

        let safe_ws_endpoint = format!(
            "{}://{}{}",
            ws_url.scheme(),
            ws_url.host_str().unwrap_or_default(),
            ws_url.path()
        );
        log::info!(
            "Aliyun TTS WebSocket 请求: endpoint={}, model={}, voice={}, format={}, text_len={}",
            safe_ws_endpoint,
            model,
            voice,
            format,
            text.len()
        );

        let (ws_stream, _) = connect_async(ws_url.as_str()).await?;
        let (mut ws_writer, mut ws_reader) = ws_stream.split();

        let task_id = Self::generate_task_id();
        let parameters = Self::build_websocket_parameters_payload(voice, format, extra_parameters_json)?;

        let run_task = json!({
            "header": {
                "action": "run-task",
                "task_id": task_id,
                "streaming": "duplex"
            },
            "payload": {
                "task_group": "audio",
                "task": "tts",
                "function": "SpeechSynthesizer",
                "model": model,
                "parameters": parameters,
                "input": {}
            }
        });

        let continue_task = json!({
            "header": {
                "action": "continue-task",
                "task_id": task_id,
                "streaming": "duplex"
            },
            "payload": {
                "input": {
                    "text": text
                }
            }
        });

        let finish_task = json!({
            "header": {
                "action": "finish-task",
                "task_id": task_id,
                "streaming": "duplex"
            },
            "payload": {
                "input": {}
            }
        });

        ws_writer.send(Message::Text(run_task.to_string().into())).await?;
        ws_writer
            .send(Message::Text(continue_task.to_string().into()))
            .await?;
        ws_writer
            .send(Message::Text(finish_task.to_string().into()))
            .await?;

        let mut audio_bytes = Vec::new();
        let mut task_finished = false;

        while let Some(msg) = ws_reader.next().await {
            let msg = msg?;
            match msg {
                Message::Binary(data) => {
                    audio_bytes.extend_from_slice(&data);
                }
                Message::Text(text_msg) => {
                    let msg_text: &str = text_msg.as_ref();
                    if let Ok(value) = serde_json::from_str::<Value>(msg_text) {
                        let event = value
                            .get("header")
                            .and_then(|h| h.get("event"))
                            .and_then(Value::as_str)
                            .unwrap_or_default();

                        if event == "task-failed" {
                            let detail = value
                                .get("payload")
                                .and_then(|p| p.get("output"))
                                .and_then(|o| o.get("message"))
                                .and_then(Value::as_str)
                                .unwrap_or(msg_text);

                            log::error!("Aliyun TTS WebSocket task-failed: {}", detail);
                            return Err(format!("Aliyun TTS WebSocket Error: {}", detail).into());
                        }

                        if event == "task-finished" {
                            task_finished = true;
                        }
                    }
                }
                Message::Close(frame) => {
                    if let Some(close_frame) = frame {
                        log::info!(
                            "Aliyun TTS WebSocket 连接关闭: code={}, reason={}",
                            close_frame.code,
                            close_frame.reason
                        );
                    }
                    break;
                }
                _ => {}
            }

            if task_finished {
                break;
            }
        }

        if audio_bytes.is_empty() {
            return Err(
                "Aliyun TTS WebSocket 未返回音频数据。Hint: 检查 model/voice 是否匹配，或确认音色状态为 OK"
                    .into(),
            );
        }

        Ok(audio_bytes)
    }

    fn build_websocket_parameters_payload(
        voice: &str,
        format: &str,
        extra_parameters_json: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut parameters = Map::new();
        parameters.insert("voice".to_string(), Value::String(voice.to_string()));
        parameters.insert("format".to_string(), Value::String(format.to_string()));
        parameters.insert(
            "text_type".to_string(),
            Value::String("PlainText".to_string()),
        );

        Self::merge_extra_parameters(&mut parameters, extra_parameters_json)?;
        Ok(json!(parameters))
    }

    fn build_parameters_payload(
        voice: &str,
        format: &str,
        extra_parameters_json: &str,
    ) -> Result<Value, Box<dyn Error + Send + Sync>> {
        let mut parameters = Map::new();
        parameters.insert("voice".to_string(), Value::String(voice.to_string()));
        parameters.insert("format".to_string(), Value::String(format.to_string()));

        Self::merge_extra_parameters(&mut parameters, extra_parameters_json)?;

        Ok(json!(parameters))
    }

    fn merge_extra_parameters(
        parameters: &mut Map<String, Value>,
        extra_parameters_json: &str,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {

        if !extra_parameters_json.trim().is_empty() {
            let parsed: Value = serde_json::from_str(extra_parameters_json).map_err(|e| {
                format!(
                    "Aliyun TTS 额外参数 JSON 解析失败: {}。Hint: 请确保是合法 JSON 对象",
                    e
                )
            })?;

            if let Value::Object(extra_map) = parsed {
                for (key, value) in extra_map {
                    // 允许用户通过额外参数覆盖默认值，以便适配复制音色场景。
                    parameters.insert(key, value);
                }
            } else {
                return Err("Aliyun TTS 额外参数必须是 JSON 对象".into());
            }
        }

        Ok(())
    }

    fn should_use_websocket(endpoint: &str, model: &str) -> bool {
        let endpoint_lower = endpoint.to_ascii_lowercase();
        let model_lower = model.to_ascii_lowercase();

        endpoint_lower.starts_with("ws://")
            || endpoint_lower.starts_with("wss://")
            || model_lower.starts_with("cosyvoice-")
    }

    fn normalize_websocket_endpoint(endpoint: &str) -> Result<String, Box<dyn Error + Send + Sync>> {
        let trimmed = endpoint.trim();
        let lowered = trimmed.to_ascii_lowercase();

        if lowered.starts_with("ws://") || lowered.starts_with("wss://") {
            return Ok(trimmed.to_string());
        }

        let parsed = Url::parse(trimmed).map_err(|e| {
            format!(
                "Aliyun TTS Endpoint 非法: {}。Hint: 请填写有效的 http(s) 或 ws(s) 地址",
                e
            )
        })?;

        let scheme = match parsed.scheme() {
            "https" => "wss",
            "http" => "ws",
            other => {
                return Err(format!(
                    "Aliyun TTS Endpoint 协议不支持: {}。Hint: 仅支持 http/https/ws/wss",
                    other
                )
                .into())
            }
        };

        let host = parsed.host_str().ok_or("Aliyun TTS Endpoint 缺少 host")?;
        let port = parsed.port().map(|p| format!(":{}", p)).unwrap_or_default();

        Ok(format!(
            "{}://{}{}/api-ws/v1/inference/",
            scheme, host, port
        ))
    }

    fn generate_task_id() -> String {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        format!("tts-{}", nanos)
    }
}
