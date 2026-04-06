use crate::state::AppState;
use pebble_core::{Attachment, PebbleError};
use std::path::Path;
use tauri::State;

/// Validate that save_to path is within a safe directory (user's home).
fn validate_save_path(save_to: &str) -> Result<(), PebbleError> {
    let path = Path::new(save_to);
    let canonical = path
        .parent()
        .and_then(|p| p.canonicalize().ok())
        .ok_or_else(|| PebbleError::Internal("Invalid save directory".to_string()))?;

    // Ensure no path traversal components in the filename
    let filename = path
        .file_name()
        .ok_or_else(|| PebbleError::Internal("No filename specified".to_string()))?;
    let filename_str = filename.to_string_lossy();
    if filename_str.contains("..") || filename_str.contains('/') || filename_str.contains('\\') {
        return Err(PebbleError::Internal(
            "Invalid filename in save path".to_string(),
        ));
    }

    // Ensure parent directory actually exists and is absolute
    if !canonical.is_absolute() {
        return Err(PebbleError::Internal(
            "Save path must be absolute".to_string(),
        ));
    }

    // Ensure target is within user home directory to prevent writes to system paths
    let home = home_dir().ok_or_else(|| {
        PebbleError::Internal("Cannot determine user home directory".to_string())
    })?;
    if !canonical.starts_with(&home) {
        return Err(PebbleError::Validation(
            "Save path must be within user home directory".to_string(),
        ));
    }

    Ok(())
}

/// Get the user's home directory.
fn home_dir() -> Option<std::path::PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok().map(std::path::PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").ok().map(std::path::PathBuf::from)
    }
}

#[tauri::command]
pub async fn list_attachments(
    state: State<'_, AppState>,
    message_id: String,
) -> std::result::Result<Vec<Attachment>, PebbleError> {
    state.store.list_attachments_by_message(&message_id)
}

#[tauri::command]
pub async fn get_attachment_path(
    state: State<'_, AppState>,
    attachment_id: String,
) -> std::result::Result<Option<String>, PebbleError> {
    let att = state.store.get_attachment(&attachment_id)?;
    Ok(att.and_then(|a| a.local_path))
}

#[tauri::command]
pub async fn download_attachment(
    state: State<'_, AppState>,
    attachment_id: String,
    save_to: String,
) -> std::result::Result<(), PebbleError> {
    let att = state
        .store
        .get_attachment(&attachment_id)?
        .ok_or_else(|| PebbleError::Internal("Attachment not found".to_string()))?;
    // Validate save path to prevent path traversal
    validate_save_path(&save_to)?;

    let source = att
        .local_path
        .ok_or_else(|| PebbleError::Internal("Attachment file not available".to_string()))?;
    std::fs::copy(&source, &save_to)
        .map_err(|e| PebbleError::Internal(format!("Failed to copy attachment: {e}")))?;
    Ok(())
}
