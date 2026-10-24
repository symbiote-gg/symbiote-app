use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Db(#[from] sqlx::Error),
    #[error(transparent)]
    Migrate(#[from] sqlx::migrate::MigrateError),
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error(transparent)]
    Json(#[from] serde_json::Error),
    #[error(transparent)]
    Tauri(#[from] tauri::Error),
    #[error("failed to parse the replay: {0}")]
    Parse(#[from] hots_replay_parser::Error),
    #[error("invalid replay: {0}")]
    InvalidReplay(String),
    #[error("invalid argument: {0}")]
    InvalidArgument(String),
    #[error("replay {0} not found")]
    ReplayNotFound(i64),
    #[error("replays folder not found")]
    ReplaysFolderNotFound,
    #[error(transparent)]
    Opener(#[from] tauri_plugin_opener::Error),
}

/// Commands send errors to the frontend as their message.
impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.collect_str(self)
    }
}

pub type Result<T, E = Error> = std::result::Result<T, E>;
