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
}

impl AppState {
    pub fn new(store: Store, search: TantivySearch) -> Self {
        Self {
            store: Arc::new(store),
            search: Arc::new(search),
            sync_handles: Mutex::new(HashMap::new()),
        }
    }
}
