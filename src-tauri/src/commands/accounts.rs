use crate::state::AppState;
use pebble_core::{Account, PebbleError, ProviderType, new_id, now_timestamp};
use serde::Deserialize;
use tauri::State;

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct AddAccountRequest {
    pub email: String,
    pub display_name: String,
    pub provider: String,
    pub imap_host: String,
    pub imap_port: u16,
    /// Reserved for future outbound mail support.
    pub smtp_host: String,
    /// Reserved for future outbound mail support.
    pub smtp_port: u16,
    pub username: String,
    pub password: String,
    pub use_tls: bool,
}

#[tauri::command]
pub async fn add_account(
    state: State<'_, AppState>,
    request: AddAccountRequest,
) -> std::result::Result<Account, PebbleError> {
    let now = now_timestamp();
    let provider = match request.provider.to_lowercase().as_str() {
        "gmail" => ProviderType::Gmail,
        "outlook" => ProviderType::Outlook,
        _ => ProviderType::Imap,
    };

    let account = Account {
        id: new_id(),
        email: request.email.clone(),
        display_name: request.display_name.clone(),
        provider,
        created_at: now,
        updated_at: now,
    };

    state.store.insert_account(&account)?;

    // Persist IMAP config as sync_state JSON
    let imap_config = pebble_mail::ImapConfig {
        host: request.imap_host,
        port: request.imap_port,
        username: request.username,
        password: request.password,
        use_tls: request.use_tls,
    };
    let sync_state_json = serde_json::to_string(&imap_config)
        .map_err(|e| PebbleError::Internal(format!("Failed to serialize IMAP config: {e}")))?;
    state
        .store
        .update_account_sync_state(&account.id, &sync_state_json)?;

    Ok(account)
}

#[tauri::command]
pub async fn list_accounts(
    state: State<'_, AppState>,
) -> std::result::Result<Vec<Account>, PebbleError> {
    state.store.list_accounts()
}

#[tauri::command]
pub async fn delete_account(
    state: State<'_, AppState>,
    account_id: String,
) -> std::result::Result<(), PebbleError> {
    // Stop sync if running
    {
        let mut handles = state.sync_handles.lock().await;
        if let Some(handle) = handles.remove(&account_id) {
            let _ = handle.stop_tx.send(true);
            handle.task.abort();
        }
    }

    state.store.delete_account(&account_id)
}
