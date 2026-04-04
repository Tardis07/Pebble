use crate::state::{AppState, SyncHandle};
use pebble_core::PebbleError;
use pebble_mail::{ImapConfig, ImapProvider, SyncConfig, SyncWorker};
use std::sync::Arc;
use tauri::State;
use tokio::sync::watch;
use tracing::{error, info};

#[tauri::command]
pub async fn start_sync(
    state: State<'_, AppState>,
    account_id: String,
) -> std::result::Result<String, PebbleError> {
    // Check if already syncing
    {
        let handles = state.sync_handles.lock().await;
        if handles.contains_key(&account_id) {
            return Ok(format!("Sync already running for account {account_id}"));
        }
    }

    // Load IMAP config from sync_state
    let sync_state_json = state
        .store
        .get_account_sync_state(&account_id)?
        .ok_or_else(|| {
            PebbleError::Internal(format!("No IMAP config found for account {account_id}"))
        })?;

    let imap_config: ImapConfig = serde_json::from_str(&sync_state_json)
        .map_err(|e| PebbleError::Internal(format!("Failed to deserialize IMAP config: {e}")))?;

    let provider = Arc::new(ImapProvider::new(imap_config));
    let store = Arc::clone(&state.store);
    let (stop_tx, stop_rx) = watch::channel(false);

    let account_id_clone = account_id.clone();
    let task = tokio::spawn(async move {
        let worker = SyncWorker::new(account_id_clone.clone(), provider, store, stop_rx);
        let config = SyncConfig::default();
        worker.run(config).await;
        info!("Sync task completed for account {}", account_id_clone);
    });

    {
        let mut handles = state.sync_handles.lock().await;
        handles.insert(account_id.clone(), SyncHandle { stop_tx, task });
    }

    Ok(format!("Sync started for account {account_id}"))
}

#[tauri::command]
pub async fn stop_sync(
    state: State<'_, AppState>,
    account_id: String,
) -> std::result::Result<(), PebbleError> {
    let mut handles = state.sync_handles.lock().await;
    if let Some(handle) = handles.remove(&account_id) {
        if let Err(e) = handle.stop_tx.send(true) {
            error!("Failed to send stop signal for account {}: {}", account_id, e);
        }
        handle.task.abort();
    }
    Ok(())
}
