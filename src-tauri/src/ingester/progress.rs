use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::Emitter;

use super::{lock, Source};

const EVENT: &str = "ingest-progress";
/// Shortest gap between two progress events, so a bulk ingest doesn't flood the webview.
const EMIT_EVERY: Duration = Duration::from_millis(100);

#[derive(Debug, Clone, Copy, Default, Serialize)]
pub struct Counter {
    pub done: u32,
    pub total: u32,
}

/// How far the startup backlogs are, each `0/0` when idle.
#[derive(Debug, Clone, Copy, Default, Serialize)]
pub struct IngestProgress {
    /// Replay files found by the scan.
    pub importing: Counter,
    /// Stored replays being re-parsed.
    pub updating: Counter,
}

/// Tracks the replays queued by the scan and the re-parse, streaming each change as an
/// `ingest-progress` event. Live replays from the watcher aren't counted.
#[derive(Default)]
pub struct Progress {
    // One lock for both, held while emitting, so events can't go out of order and leave
    // a finished phase showing as running.
    inner: Mutex<Inner>,
}

#[derive(Default)]
struct Inner {
    progress: IngestProgress,
    last_emit: Option<Instant>,
}

impl Progress {
    pub fn snapshot(&self) -> IngestProgress {
        lock(&self.inner).progress
    }

    pub(super) fn queue(&self, app: &tauri::AppHandle, source: Source, n: usize) {
        if n == 0 {
            return;
        }
        let mut inner = lock(&self.inner);
        let Some(counter) = counter(&mut inner.progress, source) else {
            return;
        };
        counter.total += u32::try_from(n).unwrap_or(u32::MAX);
        inner.emit(app, true);
    }

    /// Counts one queued replay of `source` as handled, whatever came of it.
    pub(super) fn settle(&self, app: &tauri::AppHandle, source: Source) {
        let mut inner = lock(&self.inner);
        let Some(counter) = counter(&mut inner.progress, source) else {
            return;
        };
        if counter.total == 0 {
            return;
        }
        counter.done += 1;
        let finished = counter.done >= counter.total;
        if finished {
            *counter = Counter::default();
        }
        inner.emit(app, finished);
    }
}

impl Inner {
    /// Emits the progress, unless an event went out less than [`EMIT_EVERY`] ago and it
    /// isn't `forced`: a phase starting or ending must never be dropped.
    fn emit(&mut self, app: &tauri::AppHandle, forced: bool) {
        let now = Instant::now();
        if !forced && self.last_emit.is_some_and(|at| now - at < EMIT_EVERY) {
            return;
        }
        self.last_emit = Some(now);
        if let Err(e) = app.emit(EVENT, self.progress) {
            log::warn!("failed to emit the ingest progress: {e}");
        }
    }
}

fn counter(state: &mut IngestProgress, source: Source) -> Option<&mut Counter> {
    match source {
        Source::Scan => Some(&mut state.importing),
        Source::Reparse => Some(&mut state.updating),
        Source::Watcher => None,
    }
}
