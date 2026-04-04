use std::sync::Arc;

use pebble_store::Store;
use tauri::Emitter;
use tokio::sync::watch;
use tracing::{debug, warn};

pub async fn run_snooze_watcher(
    store: Arc<Store>,
    app_handle: tauri::AppHandle,
    mut stop_rx: watch::Receiver<bool>,
) {
    let interval = tokio::time::Duration::from_secs(30);
    loop {
        tokio::select! {
            _ = tokio::time::sleep(interval) => {
                let now = pebble_core::now_timestamp();
                match store.get_due_snoozed(now) {
                    Ok(due) => {
                        for snoozed in due {
                            debug!("Unsnoozing message {}", snoozed.message_id);
                            let _ = store.unsnooze_message(&snoozed.message_id);
                            let _ = app_handle.emit("mail:unsnoozed", &snoozed.message_id);
                        }
                    }
                    Err(e) => warn!("Snooze watcher error: {e}"),
                }
            }
            Ok(()) = stop_rx.changed() => {
                if *stop_rx.borrow() {
                    debug!("Snooze watcher stopping");
                    break;
                }
            }
        }
    }
}
