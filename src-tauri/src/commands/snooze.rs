use crate::state::AppState;
use pebble_core::{PebbleError, SnoozedMessage, now_timestamp};
use tauri::State;

#[tauri::command]
pub async fn snooze_message(
    state: State<'_, AppState>,
    message_id: String,
    until: i64,
    return_to: String,
) -> std::result::Result<(), PebbleError> {
    let snooze = SnoozedMessage {
        message_id,
        snoozed_at: now_timestamp(),
        unsnoozed_at: until,
        return_to,
    };
    state.store.snooze_message(&snooze)
}

#[tauri::command]
pub async fn unsnooze_message(
    state: State<'_, AppState>,
    message_id: String,
) -> std::result::Result<(), PebbleError> {
    state.store.unsnooze_message(&message_id)
}

#[tauri::command]
pub async fn list_snoozed(
    state: State<'_, AppState>,
) -> std::result::Result<Vec<SnoozedMessage>, PebbleError> {
    state.store.list_snoozed_messages()
}
