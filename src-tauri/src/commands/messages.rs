use crate::state::AppState;
use pebble_core::{Message, PebbleError, PrivacyMode, RenderedHtml};
use pebble_privacy::PrivacyGuard;
use tauri::State;

#[tauri::command]
pub async fn list_messages(
    state: State<'_, AppState>,
    folder_id: String,
    limit: u32,
    offset: u32,
) -> std::result::Result<Vec<Message>, PebbleError> {
    state.store.list_messages_by_folder(&folder_id, limit, offset)
}

#[tauri::command]
pub async fn get_message(
    state: State<'_, AppState>,
    message_id: String,
) -> std::result::Result<Option<Message>, PebbleError> {
    state.store.get_message(&message_id)
}

#[tauri::command]
pub async fn get_rendered_html(
    state: State<'_, AppState>,
    message_id: String,
    privacy_mode: PrivacyMode,
) -> std::result::Result<RenderedHtml, PebbleError> {
    let message = state
        .store
        .get_message(&message_id)?
        .ok_or_else(|| PebbleError::Internal(format!("Message not found: {message_id}")))?;

    let guard = PrivacyGuard::new();
    let rendered = guard.render_safe_html(&message.body_html_raw, &privacy_mode);
    Ok(rendered)
}

#[tauri::command]
pub async fn update_message_flags(
    state: State<'_, AppState>,
    message_id: String,
    is_read: Option<bool>,
    is_starred: Option<bool>,
) -> std::result::Result<(), PebbleError> {
    state
        .store
        .update_message_flags(&message_id, is_read, is_starred)
}
