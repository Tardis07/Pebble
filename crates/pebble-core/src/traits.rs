use crate::error::Result;
use crate::types::*;

pub struct FetchQuery {
    pub folder_id: String,
    pub limit: Option<u32>,
}

pub struct FetchResult {
    pub messages: Vec<Message>,
    pub cursor: SyncCursor,
}

#[derive(Debug, Clone)]
pub struct SyncCursor {
    pub value: String,
}

pub struct ChangeSet {
    pub new_messages: Vec<Message>,
    pub flag_changes: Vec<FlagChange>,
    pub moved: Vec<MoveChange>,
    pub deleted: Vec<String>,
    pub cursor: SyncCursor,
}

pub struct FlagChange {
    pub remote_id: String,
    pub is_read: Option<bool>,
    pub is_starred: Option<bool>,
}

pub struct MoveChange {
    pub remote_id: String,
    pub from_folder: String,
    pub to_folder: String,
}

pub trait MailTransport: Send + Sync {
    fn authenticate(
        &mut self,
        credentials: &AuthCredentials,
    ) -> impl std::future::Future<Output = Result<()>> + Send;

    fn fetch_messages(
        &self,
        query: &FetchQuery,
    ) -> impl std::future::Future<Output = Result<FetchResult>> + Send;

    fn send_message(
        &self,
        message: &OutgoingMessage,
    ) -> impl std::future::Future<Output = Result<()>> + Send;

    fn sync_changes(
        &self,
        since: &SyncCursor,
    ) -> impl std::future::Future<Output = Result<ChangeSet>> + Send;

    fn capabilities(&self) -> ProviderCapabilities;
}

pub struct AuthCredentials {
    pub provider: ProviderType,
    pub data: serde_json::Value,
}

pub struct OutgoingMessage {
    pub to: Vec<EmailAddress>,
    pub cc: Vec<EmailAddress>,
    pub bcc: Vec<EmailAddress>,
    pub subject: String,
    pub body_text: String,
    pub body_html: Option<String>,
    pub in_reply_to: Option<String>,
}

pub trait FolderProvider: Send + Sync {
    fn list_folders(&self) -> impl std::future::Future<Output = Result<Vec<Folder>>> + Send;

    fn move_message(
        &self,
        remote_id: &str,
        to_folder_id: &str,
    ) -> impl std::future::Future<Output = Result<()>> + Send;
}

pub trait LabelProvider: Send + Sync {
    fn list_labels(&self) -> impl std::future::Future<Output = Result<Vec<Folder>>> + Send;

    fn modify_labels(
        &self,
        remote_id: &str,
        add: &[String],
        remove: &[String],
    ) -> impl std::future::Future<Output = Result<()>> + Send;
}

pub struct StructuredQuery {
    pub text: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub subject: Option<String>,
    pub has_attachment: Option<bool>,
    pub folder_id: Option<String>,
    pub date_from: Option<i64>,
    pub date_to: Option<i64>,
}

pub enum SearchQuery {
    Structured(StructuredQuery),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SearchHit {
    pub message_id: String,
    pub score: f32,
    pub snippet: String,
}

pub trait SearchEngine: Send + Sync {
    fn index_message(
        &self,
        message: &Message,
    ) -> impl std::future::Future<Output = Result<()>> + Send;

    fn search(
        &self,
        query: &SearchQuery,
    ) -> impl std::future::Future<Output = Result<Vec<SearchHit>>> + Send;

    fn rebuild_index(&self) -> impl std::future::Future<Output = Result<()>> + Send;
}
