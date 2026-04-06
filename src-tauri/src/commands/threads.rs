use pebble_core::{Message, PebbleError, ThreadSummary};
use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub async fn list_thread_messages(
    state: State<'_, AppState>,
    thread_id: String,
) -> std::result::Result<Vec<Message>, PebbleError> {
    state.store.list_messages_by_thread(&thread_id)
}

#[tauri::command]
pub async fn list_threads(
    state: State<'_, AppState>,
    folder_id: String,
    limit: u32,
    offset: u32,
) -> std::result::Result<Vec<ThreadSummary>, PebbleError> {
    state.store.list_threads_by_folder(&folder_id, limit, offset)
}
