use std::sync::atomic::{AtomicU32, Ordering};

use serde::Serialize;
use sqlx::FromRow;
use tokio::sync::{Mutex, MutexGuard};

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
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseStats {
    /// Size on disk, the write-ahead log included.
    pub bytes: u64,
    pub games_with_events: i64,
    pub games_last_year: i64,
}

/// The event retention in effect, shared by the ingester and the commands.
#[derive(Debug)]
pub struct EventRetention {
    years: AtomicU32,
    applying: Mutex<()>,
}

impl EventRetention {
    pub fn new(years: Option<u32>) -> Self {
        Self {
            years: AtomicU32::new(years.unwrap_or(0)),
            applying: Mutex::new(()),
        }
    }

    pub fn years(&self) -> Option<u32> {
        Some(self.years.load(Ordering::Relaxed)).filter(|&years| years > 0)
    }

    pub fn set(&self, years: Option<u32>) {
        self.years.store(years.unwrap_or(0), Ordering::Relaxed);
    }

    /// Held while a retention is applied, so a purge or a restore never runs against a
    /// cutoff that changed meanwhile. Reading the cutoff doesn't take it.
    pub async fn lock(&self) -> MutexGuard<'_, ()> {
        self.applying.lock().await
    }

    /// See [`events_cutoff`](crate::db::replays::events_cutoff).
    pub fn cutoff(&self) -> i64 {
        crate::db::replays::events_cutoff(self.years())
    }
}
