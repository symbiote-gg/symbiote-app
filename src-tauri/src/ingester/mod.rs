use std::collections::{HashMap, HashSet};
use std::fs::File;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use tauri::ipc::{Channel, InvokeResponseBody};
use tauri::Manager;
use tokio::sync::Semaphore;

use crate::db;
use crate::db::replays::{HashStatus, InsertOutcome};
use crate::error::Result;
use crate::types::map::MapFact;
use crate::types::replay::{NewReplayBundle, ReplayIngested};
use bundle::{SeededHeroes, SeededMaps};

mod bundle;
mod scan;
mod watcher;

const REPLAY_EXTENSION: &str = "StormReplay";

/// Version of the data parsed and stored for each replay, not of the parser crate.
///
/// Bump it whenever what gets stored changes, e.g. a parser upgrade adding fields or a
/// change in [`bundle::build_bundle`], so the replays stored before are re-parsed in place.
/// A parser upgrade that stores nothing new needs no bump, and schema-only changes go in
/// a migration instead.
pub const INGEST_VERSION: i64 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Source {
    Watcher,
    Scan,
    /// A stored replay below [`INGEST_VERSION`].
    Reparse,
}

/// A replay file found on disk, waiting to be ingested.
struct FoundReplay {
    path: PathBuf,
    source: Source,
}

/// The channels that each replay stored by the ingester is streamed to.
#[derive(Default)]
pub struct IngestSubscribers {
    next_id: AtomicU32,
    channels: Mutex<HashMap<u32, Channel>>,
}

impl IngestSubscribers {
    /// Registers `channel` and returns the id to [`unsubscribe`](Self::unsubscribe) it with.
    pub fn subscribe(&self, channel: Channel) -> u32 {
        let id = self.next_id.fetch_add(1, Ordering::Relaxed);
        self.lock().insert(id, channel);
        id
    }

    pub fn unsubscribe(&self, id: u32) {
        self.lock().remove(&id);
    }

    /// Drops every subscriber, e.g. when the webview reloads and their callbacks are gone.
    pub fn clear(&self) {
        self.lock().clear();
    }

    /// Sends `message` to every subscriber, dropping the ones whose webview is gone.
    fn notify(&self, message: &ReplayIngested) {
        let body = match serde_json::to_string(message) {
            Ok(json) => InvokeResponseBody::Json(json),
            Err(e) => {
                log::error!(
                    "failed to serialize replay {}: {e}",
                    message.replay.replay.id
                );
                return;
            }
        };
        self.lock()
            .retain(|_, channel| channel.send(body.clone()).is_ok());
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, HashMap<u32, Channel>> {
        lock(&self.channels)
    }
}

/// Starts ingesting the replays under `dir` in the background, and returns immediately.
///
/// Streams each replay stored to the [`IngestSubscribers`]. Both it and the
/// [`SqlitePool`] must already be registered as managed state.
pub fn start(app: tauri::AppHandle, dir: PathBuf) {
    let pool = app.state::<SqlitePool>().inner().clone();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel::<FoundReplay>();

    let Some(debouncer) = watcher::watch(&dir, tx.clone()) else {
        return;
    };

    // Scan only once the watch is up, so a replay saved meanwhile is caught by one or the other.
    // Both feed the same queue, so a file found twice is skipped by hash instead of racing.
    let scan_pool = pool.clone();
    tauri::async_runtime::spawn(async move {
        match scan::scan(&scan_pool, dir).await {
            Ok(scan) => {
                // An unreadable root (e.g. an unmounted drive) would look like every file got
                // deleted. A file the watcher supersedes after the walk is pruned too, which
                // only costs a re-parse on the next start.
                if let Some(seen) = scan.seen {
                    if let Err(e) = db::replays::prune_superseded(&scan_pool, &seen).await {
                        log::error!("failed to prune the superseded replays: {e}");
                    }
                }
                scan.unseen.into_iter().for_each(|path| {
                    let _ = tx.send(FoundReplay {
                        path,
                        source: Source::Scan,
                    });
                });
            }
            Err(e) => log::error!("failed to scan for existing replays: {e}"),
        }

        // Queued after the new replays, which matter more. A stale replay whose file is
        // gone keeps its old data, and is refreshed if the file turns up again.
        match scan::stale(&scan_pool).await {
            Ok(stale) => stale.into_iter().for_each(|path| {
                let _ = tx.send(FoundReplay {
                    path,
                    source: Source::Reparse,
                });
            }),
            Err(e) => log::error!("failed to list the stale replays: {e}"),
        }
    });

    tauri::async_runtime::spawn(async move {
        let _debouncer = debouncer;

        // Heroes are seeded before the ingester starts, so the lookup can't go stale.
        let heroes = Arc::new(SeededHeroes::new(
            db::heroes::seeded_ids_by_name(&pool)
                .await
                .unwrap_or_else(|e| {
                    log::error!("failed to load the seeded hero ids: {e}");
                    Default::default()
                }),
        ));
        let maps = Arc::new(SeededMaps::new(&MapFact::bundled().unwrap_or_else(|e| {
            log::error!("failed to load the bundled maps: {e}");
            Default::default()
        })));

        let workers = parse_workers();
        let permits = Arc::new(Semaphore::new(workers));
        let in_flight = Arc::new(Mutex::new(HashSet::new()));
        let (bundle_tx, bundle_rx) = tokio::sync::mpsc::channel(workers * 2);

        tauri::async_runtime::spawn(store(app, pool.clone(), bundle_rx, in_flight.clone()));

        while let Some(found) = rx.recv().await {
            let Ok(permit) = permits.clone().acquire_owned().await else {
                break;
            };
            let (pool, heroes, maps, in_flight, bundle_tx) = (
                pool.clone(),
                heroes.clone(),
                maps.clone(),
                in_flight.clone(),
                bundle_tx.clone(),
            );
            tauri::async_runtime::spawn(async move {
                let _permit = permit;
                let path = found.path.clone();
                match prepare(&pool, found, heroes, maps, &in_flight).await {
                    Ok(Some(bundle)) => {
                        let hash = bundle.replay.hash.clone();
                        if bundle_tx.send(bundle).await.is_err() {
                            lock(&in_flight).remove(&hash);
                        }
                    }
                    Ok(None) => {}
                    Err(e) => log::warn!("failed to ingest {}: {e}", path.display()),
                }
            });
        }
    });
}

/// Most replays stored in one transaction.
const MAX_BATCH: usize = 32;

/// Stores the bundles from `bundles` in batches, streaming each replay stored to the
/// [`IngestSubscribers`].
async fn store(
    app: tauri::AppHandle,
    pool: SqlitePool,
    mut bundles: tokio::sync::mpsc::Receiver<NewReplayBundle>,
    in_flight: Arc<Mutex<HashSet<String>>>,
) {
    let subscribers = app.state::<IngestSubscribers>();
    // Only this task stores replays, so the count can be kept up to date without
    // recounting after each one.
    let mut total = db::replays::count(&pool).await.unwrap_or_else(|e| {
        log::error!("failed to count the stored replays: {e}");
        0
    });

    let mut batch = Vec::with_capacity(MAX_BATCH);
    while bundles.recv_many(&mut batch, MAX_BATCH).await > 0 {
        let started = Instant::now();
        let stored = std::mem::take(&mut batch);
        let hashes: Vec<String> = stored.iter().map(|b| b.replay.hash.clone()).collect();
        let paths: Vec<String> = stored.iter().map(|b| b.replay.path.clone()).collect();
        let size = stored.len();

        let outcomes = db::replays::insert_bundles(&pool, stored).await;
        // Stored or not, the hashes are settled: a known one is caught by `hash_status`.
        {
            let mut in_flight = lock(&in_flight);
            hashes.iter().for_each(|hash| {
                in_flight.remove(hash);
            });
        }
        let outcomes = match outcomes {
            Ok(outcomes) => outcomes,
            Err(e) => {
                log::error!("failed to store {size} replays: {e}");
                continue;
            }
        };

        for (outcome, path) in outcomes.into_iter().zip(&paths) {
            let (id, removed, refreshed) = match outcome {
                Ok(InsertOutcome::Inserted(id)) => {
                    total += 1;
                    (id, None, false)
                }
                Ok(InsertOutcome::Replaced { removed, id }) => (id, Some(removed), false),
                Ok(InsertOutcome::Refreshed(id)) => (id, None, true),
                Ok(InsertOutcome::Skipped) => continue,
                Err(e) => {
                    log::warn!("failed to store {path}: {e}");
                    continue;
                }
            };
            match db::replays::get_list_row(&pool, id).await {
                Ok(Some(replay)) => subscribers.notify(&ReplayIngested {
                    replay,
                    removed,
                    refreshed,
                    total,
                }),
                Ok(None) => {}
                Err(e) => log::error!("failed to read back replay {id}: {e}"),
            }
        }
        log::debug!("stored {size} replays in {:?}", started.elapsed());
    }
}

/// Hashes and parses a single replay, returning the rows to store.
///
/// Returns `None` without parsing if a file with the same content was already handled
/// or is being handled.
async fn prepare(
    pool: &SqlitePool,
    found: FoundReplay,
    heroes: Arc<SeededHeroes>,
    maps: Arc<SeededMaps>,
    in_flight: &Mutex<HashSet<String>>,
) -> Result<Option<NewReplayBundle>> {
    let started = Instant::now();
    let FoundReplay { path, source } = found;

    let path_buf = path.clone();
    let hash = tauri::async_runtime::spawn_blocking(move || file_hash(&path_buf)).await??;

    // The watcher and the scan can both find a file, so claim its hash before the lookup.
    if !lock(in_flight).insert(hash.clone()) {
        return Ok(None);
    }
    let bundle = parse_unknown(pool, path, hash.clone(), source, heroes, maps).await;
    // A stored bundle's hash is released by the writer, once it's known.
    if !matches!(bundle, Ok(Some(_))) {
        lock(in_flight).remove(&hash);
    }

    if let Ok(Some(bundle)) = &bundle {
        log::debug!("parsed {} in {:?}", bundle.replay.path, started.elapsed());
    }
    bundle
}

/// Parses the replay at `path`, unless a file with the same content was already handled
/// at the current [`INGEST_VERSION`].
async fn parse_unknown(
    pool: &SqlitePool,
    path: PathBuf,
    hash: String,
    source: Source,
    heroes: Arc<SeededHeroes>,
    maps: Arc<SeededMaps>,
) -> Result<Option<NewReplayBundle>> {
    let refreshes = match db::replays::hash_status(pool, &hash, INGEST_VERSION).await? {
        HashStatus::Current => return Ok(None),
        HashStatus::Unknown => None,
        HashStatus::Stale(id) => Some(id),
    };

    let is_new = source == Source::Watcher;
    // Parsing is CPU-heavy and synchronous, so keep it off the async runtime.
    let mut bundle = tauri::async_runtime::spawn_blocking(move || {
        bundle::build_bundle(&path, hash, is_new, &heroes, &maps)
    })
    .await??;
    bundle.refreshes = refreshes;
    Ok(Some(bundle))
}

/// How many replays are parsed at once. Half the cores, so a bulk ingest leaves room for
/// the webview and the writer instead of making the UI lag.
fn parse_workers() -> usize {
    std::thread::available_parallelism().map_or(1, |n| (n.get() / 2).max(1))
}

fn lock<T>(mutex: &Mutex<T>) -> std::sync::MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|e| e.into_inner())
}

fn file_hash(path: &Path) -> std::io::Result<String> {
    let mut hasher = Sha256::new();
    std::io::copy(&mut File::open(path)?, &mut hasher)?;
    Ok(format!("{:x}", hasher.finalize()))
}

fn has_replay_extension(path: &Path) -> bool {
    path.extension().is_some_and(|ext| ext == REPLAY_EXTENSION)
}
