use std::path::PathBuf;

use commands::ingest::{get_ingest_progress, subscribe_ingest, unsubscribe_ingest};
use commands::replays::{count_replays, get_replay, list_replays, mark_replay_as_seen};
use commands::settings::{
    get_database_stats, get_replays_folder, get_settings, open_replays_folder,
    preview_event_retention, set_event_retention,
};
use commands::stats::{get_most_played_heroes, get_profile_summary};
use retention::EventRetention;
use tauri::webview::PageLoadEvent;
use tauri::Manager;
use types::settings::ReplaysFolder;

mod commands;
mod db;
mod error;
mod ingester;
mod retention;
mod timeline;
mod types;

const ACCOUNTS_DIR_ENV: &str = "SYMBIOTE_ACCOUNTS_DIR";

/// Resolves the Heroes of the Storm `Accounts` folder, where the game saves replays.
fn accounts_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    if let Some(dir) = std::env::var_os(ACCOUNTS_DIR_ENV) {
        return Some(dir.into());
    }
    default_accounts_dir(app)
}

#[cfg(target_os = "windows")]
fn default_accounts_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    let docs = app.path().document_dir().ok()?;
    Some(docs.join("Heroes of the Storm").join("Accounts"))
}

#[cfg(target_os = "macos")]
fn default_accounts_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    let home = app.path().home_dir().ok()?;
    Some(home.join("Library/Application Support/Blizzard/Heroes of the Storm/Accounts"))
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
fn default_accounts_dir(_app: &tauri::AppHandle) -> Option<PathBuf> {
    None
}

/// Builds and runs the Tauri application.
///
/// # Panics
///
/// Panics if the application fails to start, including when database setup fails.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }));

    builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let started = std::time::Instant::now();
            let pool = tauri::async_runtime::block_on(db::init(app.handle()))?;
            log::info!("database ready in {:?}", started.elapsed());
            let settings = tauri::async_runtime::block_on(db::settings::get(&pool))?;
            app.manage(EventRetention::new(settings.event_retention_years));
            let purge_app = app.handle().clone();
            let purge_pool = pool.clone();
            tauri::async_runtime::spawn(async move {
                retention::purge_expired(&purge_app, &purge_pool).await;
            });
            app.manage(pool);
            app.manage(ingester::IngestSubscribers::default());
            app.manage(ingester::Progress::default());
            let dir = accounts_dir(app.handle());
            match &dir {
                Some(dir) => ingester::start(app.handle().clone(), dir.clone()),
                None => log::warn!("couldn't find the replays folder, set {ACCOUNTS_DIR_ENV}"),
            }
            app.manage(ReplaysFolder(dir));
            Ok(())
        })
        .on_page_load(|webview, payload| {
            // A reload drops the frontend's channels without unsubscribing them.
            if payload.event() == PageLoadEvent::Started {
                webview.state::<ingester::IngestSubscribers>().clear();
            }
        })
        .invoke_handler(tauri::generate_handler![
            list_replays,
            get_replay,
            mark_replay_as_seen,
            count_replays,
            get_profile_summary,
            get_most_played_heroes,
            subscribe_ingest,
            unsubscribe_ingest,
            get_ingest_progress,
            get_settings,
            preview_event_retention,
            set_event_retention,
            get_database_stats,
            get_replays_folder,
            open_replays_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
