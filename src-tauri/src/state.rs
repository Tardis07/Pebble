use pebble_search::TantivySearch;
use pebble_store::Store;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{watch, Mutex};

pub struct SyncHandle {
    pub stop_tx: watch::Sender<bool>,
    pub task: tokio::task::JoinHandle<()>,
}

pub struct AppState {
    pub store: Arc<Store>,
    pub search: Arc<TantivySearch>,
    pub sync_handles: Mutex<HashMap<String, SyncHandle>>,
    /// Kept alive so the snooze watcher's `stop_rx` remains open.
    #[allow(dead_code)]
    pub snooze_stop_tx: watch::Sender<bool>,
}

impl AppState {
    pub fn new(store: Store, search: TantivySearch, snooze_stop_tx: watch::Sender<bool>) -> Self {
        Self {
            store: Arc::new(store),
            search: Arc::new(search),
            sync_handles: Mutex::new(HashMap::new()),
            snooze_stop_tx,
        }
    }
}
