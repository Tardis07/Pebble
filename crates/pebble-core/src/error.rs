use serde::Serialize;

#[derive(thiserror::Error, Debug, Serialize)]
#[serde(tag = "kind", content = "message")]
pub enum PebbleError {
    #[error("Authentication failed: {0}")]
    Auth(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Storage error: {0}")]
    Storage(String),
    #[error("Sync error: {0}")]
    Sync(String),
    #[error("Rule error: {0}")]
    Rule(String),
    #[error("Translate error: {0}")]
    Translate(String),
    #[error("Privacy error: {0}")]
    Privacy(String),
    #[error("Internal error: {0}")]
    Internal(String),
}

pub type Result<T> = std::result::Result<T, PebbleError>;
