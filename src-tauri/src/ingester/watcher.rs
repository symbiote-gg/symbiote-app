use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::time::Duration;

use notify_debouncer_full::notify::{EventKind, RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{new_debouncer, DebounceEventResult, Debouncer, RecommendedCache};
use tokio::sync::mpsc::UnboundedSender;

use super::{has_replay_extension, FoundReplay, Source};

/// Watches `dir` recursively and queues each created or modified replay to `tx` as new.
///
/// The watch stops when the returned debouncer is dropped, so the caller must keep it
/// alive. Returns `None`, after logging the error, if the watcher can't be set up.
pub(super) fn watch(
    dir: &Path,
    tx: UnboundedSender<FoundReplay>,
) -> Option<Debouncer<RecommendedWatcher, RecommendedCache>> {
    // Debounce so a replay still being written by the game is only picked up once it settles.
    let debouncer = new_debouncer(
        Duration::from_secs(2),
        None,
        move |res: DebounceEventResult| match res {
            Ok(events) => {
                // One file emits several create/modify events, so send each path once per batch.
                let paths: HashSet<PathBuf> = events
                    .into_iter()
                    .filter(|event| {
                        matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_))
                    })
                    .flat_map(|event| event.event.paths)
                    .filter(|path| is_replay(path))
                    .collect();
                for path in paths {
                    let _ = tx.send(FoundReplay {
                        path,
                        source: Source::Watcher,
                    });
                }
            }
            Err(errors) => errors
                .iter()
                .for_each(|e| log::warn!("replay watcher error: {e}")),
        },
    );
    let mut debouncer = match debouncer {
        Ok(d) => d,
        Err(e) => {
            log::error!("failed to create replay watcher: {e}");
            return None;
        }
    };
    // Recursive, so every account and toon is covered, including ones created later.
    if let Err(e) = debouncer.watch(dir, RecursiveMode::Recursive) {
        log::error!("failed to watch {}: {e}", dir.display());
        return None;
    }
    Some(debouncer)
}

fn is_replay(path: &Path) -> bool {
    has_replay_extension(path) && path.is_file()
}
