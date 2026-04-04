use crate::state::AppState;
use pebble_core::PebbleError;
use pebble_mail::smtp::SmtpSender;
use tauri::State;

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub async fn send_email(
    state: State<'_, AppState>,
    account_id: String,
    to: Vec<String>,
    cc: Vec<String>,
    subject: String,
    body_text: String,
    body_html: Option<String>,
    in_reply_to: Option<String>,
) -> std::result::Result<(), PebbleError> {
    let account = state
        .store
        .get_account(&account_id)?
        .ok_or_else(|| PebbleError::Internal(format!("Account not found: {account_id}")))?;

    let sync_state_json = state
        .store
        .get_account_sync_state(&account_id)?
        .ok_or_else(|| PebbleError::Internal("No sync state configured".to_string()))?;

    let sync_state: serde_json::Value = serde_json::from_str(&sync_state_json)
        .map_err(|e| PebbleError::Internal(format!("Invalid sync state JSON: {e}")))?;

    let smtp = sync_state
        .get("smtp")
        .ok_or_else(|| PebbleError::Internal("No SMTP config in sync state".to_string()))?;

    let smtp_host = smtp
        .get("host")
        .and_then(|v| v.as_str())
        .ok_or_else(|| PebbleError::Internal("Missing SMTP host".to_string()))?
        .to_string();
    let smtp_port = smtp
        .get("port")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| PebbleError::Internal("Missing SMTP port".to_string()))?
        as u16;
    let smtp_username = smtp
        .get("username")
        .and_then(|v| v.as_str())
        .ok_or_else(|| PebbleError::Internal("Missing SMTP username".to_string()))?
        .to_string();
    let smtp_password = smtp
        .get("password")
        .and_then(|v| v.as_str())
        .ok_or_else(|| PebbleError::Internal("Missing SMTP password".to_string()))?
        .to_string();
    let smtp_use_tls = smtp
        .get("use_tls")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    let sender = SmtpSender::new(smtp_host, smtp_port, smtp_username, smtp_password, smtp_use_tls);

    sender.send(
        &account.email,
        &to,
        &cc,
        &subject,
        &body_text,
        body_html.as_deref(),
        in_reply_to.as_deref(),
    )
}
