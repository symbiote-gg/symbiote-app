//! How long replays keep their events, and applying a change to it.
//!
//! Events make up most of the database, and only feed the timeline of the replay detail,
//! so a replay played longer ago than the retention loses them. A longer retention reads
//! them back from the replay files still on disk.

use std::path::Path;
use std::sync::atomic::{AtomicU32, Ordering};

use chrono::DateTime;
use sqlx::SqlitePool;
use tauri::{AppHandle, Manager};
use tokio::sync::{Mutex, MutexGuard};

use crate::db;
use crate::error::{Error, Result};
use crate::types::settings::RetentionPreview;

const SECS_PER_YEAR: i64 = 365 * 24 * 60 * 60;

/// Returns the unix time before which a replay was played too long ago to keep its
/// events, if they're kept for `years`, or `i64::MIN` if they're kept forever.
pub fn events_cutoff(years: Option<u32>) -> i64 {
    match years {
        Some(years) => chrono::Utc::now().timestamp() - i64::from(years) * SECS_PER_YEAR,
        None => i64::MIN,
    }
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

    /// See [`events_cutoff`].
    pub fn cutoff(&self) -> i64 {
        events_cutoff(self.years())
    }
}

fn on_disk(path: &str) -> bool {
    Path::new(path).is_file()
}

/// Counts the replays whose events a retention of `years`, or forever if `None`, would
/// purge or restore.
pub async fn preview(pool: &SqlitePool, years: Option<u32>) -> Result<RetentionPreview> {
    let cutoff = events_cutoff(years);
    let expiring = db::replays::list_expiring(pool, cutoff).await?;
    let purged = db::replays::list_restorable(pool, cutoff).await?;
    Ok(tauri::async_runtime::spawn_blocking(move || {
        let restorable = purged.iter().filter(|(_, path)| on_disk(path)).count();
        RetentionPreview {
            expiring: expiring.len(),
            lost: expiring.iter().filter(|path| !on_disk(path)).count(),
            restorable,
            unrestorable: purged.len() - restorable,
            cutoff: years.and_then(|_| DateTime::from_timestamp(cutoff, 0)),
        }
    })
    .await?)
}

/// Keeps replays' events for `years`, or forever if `None`, applying it right away: a
/// shorter retention purges the expired events, a longer one re-parses the replays
/// whose events it brings back.
pub async fn set(app: &AppHandle, years: Option<u32>) -> Result<()> {
    if !matches!(years, None | Some(1 | 2 | 5)) {
        return Err(Error::InvalidArgument(format!("{years:?} years")));
    }
    let pool = app.state::<SqlitePool>();
    let retention = app.state::<EventRetention>();
    let _applying = retention.lock().await;
    db::settings::set_event_retention(&pool, years).await?;

    let longer = years.unwrap_or(u32::MAX) > retention.years().unwrap_or(u32::MAX);
    retention.set(years);
    if longer {
        crate::ingester::restore_events(app, retention.cutoff()).await?;
    } else {
        db::replays::purge_expired_events(&pool, retention.cutoff()).await?;
        db::checkpoint(&pool).await?;
    }
    Ok(())
}

/// Purges the events that expired since the app last ran, logging how many.
pub async fn purge_expired(app: &AppHandle, pool: &SqlitePool) {
    let retention = app.state::<EventRetention>();
    let _applying = retention.lock().await;
    match db::replays::purge_expired_events(pool, retention.cutoff()).await {
        Ok(0) => {}
        Ok(purged) => log::info!("purged {purged} expired events"),
        Err(e) => log::error!("failed to purge the expired events: {e}"),
    }
}

/// Lists the id and path of the replays played since `cutoff` whose events were purged
/// and whose file is still on disk, i.e. the ones
/// [`restore_events`](crate::ingester::restore_events) can restore.
pub async fn restorable(pool: &SqlitePool, cutoff: i64) -> Result<Vec<(i64, String)>> {
    let purged = db::replays::list_restorable(pool, cutoff).await?;
    Ok(tauri::async_runtime::spawn_blocking(move || {
        purged
            .into_iter()
            .filter(|(_, path)| on_disk(path))
            .collect()
    })
    .await?)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_events_forever_without_retention() {
        assert_eq!(events_cutoff(None), i64::MIN);
        assert!(events_cutoff(Some(1)) > events_cutoff(Some(5)));
    }
}
