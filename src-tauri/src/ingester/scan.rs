use std::collections::HashSet;
use std::path::{Path, PathBuf};

use sqlx::SqlitePool;

use super::has_replay_extension;
use crate::db;
use crate::error::Result;

pub(super) struct Scan {
    pub unseen: Vec<PathBuf>,
    pub seen: Option<Vec<String>>,
}

/// Walks the replay files under `dir`, telling apart the ones whose path isn't stored yet.
pub(super) async fn scan(pool: &SqlitePool, dir: PathBuf) -> Result<Scan> {
    let stored: HashSet<String> = db::replays::list_known_paths(pool)
        .await?
        .into_iter()
        .collect();

    Ok(tauri::async_runtime::spawn_blocking(move || find_unseen_replays(&dir, &stored)).await?)
}

/// Walks `dir` recursively, collecting every replay file and the ones whose path isn't in
/// `stored`.
fn find_unseen_replays(dir: &Path, stored: &HashSet<String>) -> Scan {
    let mut replays = Vec::new();
    let mut seen = Vec::new();
    let mut root_read = true;
    let mut dirs = vec![dir.to_path_buf()];

    while let Some(current) = dirs.pop() {
        let entries = match std::fs::read_dir(&current) {
            Ok(entries) => entries,
            Err(e) => {
                log::warn!("failed to read {}: {e}", current.display());
                root_read &= current != dir;
                continue;
            }
        };

        for entry in entries.flatten() {
            let Ok(file_type) = entry.file_type() else {
                continue;
            };

            let path = entry.path();
            if file_type.is_dir() {
                dirs.push(path);
            } else if file_type.is_file() && has_replay_extension(&path) {
                let path_str = path.to_string_lossy().into_owned();
                if !stored.contains(&path_str) {
                    replays.push(path);
                }
                seen.push(path_str);
            }
        }
    }

    replays.sort_by_cached_key(|path| {
        std::cmp::Reverse(path.metadata().and_then(|m| m.modified()).ok())
    });
    Scan {
        unseen: replays,
        seen: root_read.then_some(seen),
    }
}
