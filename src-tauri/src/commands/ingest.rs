use tauri::ipc::Channel;
use tauri::State;

use crate::ingester::{IngestProgress, IngestSubscribers, Progress};

/// Streams each replay stored by the ingester to `channel`, until
/// [`unsubscribe_ingest`] is called with the returned id.
#[tauri::command]
pub fn subscribe_ingest(subscribers: State<'_, IngestSubscribers>, channel: Channel) -> u32 {
    subscribers.subscribe(channel)
}

#[tauri::command]
pub fn unsubscribe_ingest(subscribers: State<'_, IngestSubscribers>, id: u32) {
    subscribers.unsubscribe(id);
}

/// Returns how far the scan and re-parse backlogs are, to show before the first
/// `ingest-progress` event arrives.
#[tauri::command]
pub fn get_ingest_progress(progress: State<'_, Progress>) -> IngestProgress {
    progress.snapshot()
}
