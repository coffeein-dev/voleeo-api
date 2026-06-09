use crate::types::TimelineEvent;
use serde::{Deserialize, Serialize};
use specta::Type;
use thiserror::Error;

#[derive(Type, Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HttpFailure {
    pub message: String,
    pub events: Vec<TimelineEvent>,
}

impl std::fmt::Display for HttpFailure {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

#[derive(Type, Serialize, Deserialize, Error, Debug, Clone)]
#[serde(tag = "kind", content = "data", rename_all = "snake_case")]
pub enum VoleeoError {
    #[error("storage: {0}")]
    Storage(String),
    #[error("http: {0}")]
    Http(String),
    #[error("http: {0}")]
    HttpFailed(HttpFailure),
    #[error("cancelled")]
    Cancelled,
    #[error("not found: {0}")]
    NotFound(String),
    #[error("invalid config: {0}")]
    InvalidConfig(String),
    #[error("crypto: {0}")]
    Crypto(String),
    #[error("git: {0}")]
    Git(String),
    #[error("websocket: {0}")]
    WebSocket(String),
    #[error("websocket closed")]
    WebSocketClosed,
}
