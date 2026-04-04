use crate::state::AppState;
use pebble_core::{Folder, PebbleError};
use tauri::State;

#[tauri::command]
pub async fn list_folders(
    state: State<'_, AppState>,
    account_id: String,
) -> std::result::Result<Vec<Folder>, PebbleError> {
    state.store.list_folders(&account_id)
}
