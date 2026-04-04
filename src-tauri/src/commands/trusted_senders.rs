use crate::state::AppState;
use pebble_core::{now_timestamp, PebbleError, TrustType, TrustedSender};
use tauri::State;

#[tauri::command]
pub async fn trust_sender(
    state: State<'_, AppState>,
    account_id: String,
    email: String,
    trust_type: TrustType,
) -> std::result::Result<(), PebbleError> {
    let sender = TrustedSender {
        account_id,
        email,
        trust_type,
        created_at: now_timestamp(),
    };
    state.store.trust_sender(&sender)
}
