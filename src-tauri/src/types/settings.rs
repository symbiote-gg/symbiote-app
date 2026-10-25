use std::path::PathBuf;

use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    /// How many years a replay's events are kept after it was played, or forever if `None`.
    pub event_retention_years: Option<u32>,
}

/// What changing the event retention would do to the stored replays.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RetentionPreview {
    /// Replays whose events would be purged.
    pub expiring: usize,
    /// Expiring replays whose file is gone, so their events can't be restored.
    pub lost: usize,
    /// Replays whose events would be restored from their file.
    pub restorable: usize,
    /// Purged replays in range whose file is gone, so their events stay purged.
    pub unrestorable: usize,
    /// Replays played before it lose their events, `None` if they're kept forever.
    pub cutoff: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStats {
    /// Size on disk, the write-ahead log included.
    pub bytes: u64,
    pub games_with_events: i64,
    pub games_last_year: i64,
}

/// The folder the ingester watches for replays, if one was found.
#[derive(Debug)]
pub struct ReplaysFolder(pub Option<PathBuf>);

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaysFolderStats {
    pub path: Option<String>,
    pub replays: i64,
    pub last_import: Option<DateTime<Utc>>,
    pub oldest_game: Option<DateTime<Utc>>,
}
