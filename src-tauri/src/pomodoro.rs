use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::config::project_config_dir;

pub struct PomodoroState(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PomodoroSession {
    pub id: i64,
    pub kind: String,
    pub duration_secs: i64,
    pub completed_at_secs: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PomodoroStats {
    pub today_focus_count: i64,
    pub today_focus_secs: i64,
    pub total_focus_count: i64,
    pub total_focus_secs: i64,
}

fn now_secs() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

const SECS_PER_DAY: i64 = 86400;

pub fn open_db(_app: &AppHandle) -> Result<Connection, String> {
    let dir = project_config_dir();
    let conn = Connection::open(dir.join("pomodoro.db")).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pomodoro_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,
            duration_secs INTEGER NOT NULL,
            completed_at_secs INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

fn row_to_session(row: &rusqlite::Row) -> rusqlite::Result<PomodoroSession> {
    Ok(PomodoroSession {
        id: row.get("id")?,
        kind: row.get("kind")?,
        duration_secs: row.get("duration_secs")?,
        completed_at_secs: row.get("completed_at_secs")?,
    })
}

#[tauri::command]
pub fn log_pomodoro_session(state: State<PomodoroState>, kind: String, duration_secs: i64) -> Result<PomodoroSession, String> {
    let conn = state.0.lock().unwrap();
    let now = now_secs();
    conn.execute(
        "INSERT INTO pomodoro_sessions (kind, duration_secs, completed_at_secs) VALUES (?1, ?2, ?3)",
        params![kind, duration_secs, now],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row("SELECT * FROM pomodoro_sessions WHERE id = ?1", params![id], row_to_session).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_pomodoro_sessions(state: State<PomodoroState>) -> Result<Vec<PomodoroSession>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT * FROM pomodoro_sessions ORDER BY completed_at_secs DESC LIMIT 200")
        .map_err(|e| e.to_string())?;
    stmt.query_map([], row_to_session)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pomodoro_stats(state: State<PomodoroState>) -> Result<PomodoroStats, String> {
    let conn = state.0.lock().unwrap();
    let now = now_secs();
    let today_start = now - (now % SECS_PER_DAY);
    let today_focus_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM pomodoro_sessions WHERE kind = 'focus' AND completed_at_secs >= ?1",
            params![today_start],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let today_focus_secs: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(duration_secs), 0) FROM pomodoro_sessions WHERE kind = 'focus' AND completed_at_secs >= ?1",
            params![today_start],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;
    let total_focus_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM pomodoro_sessions WHERE kind = 'focus'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let total_focus_secs: i64 = conn
        .query_row("SELECT COALESCE(SUM(duration_secs), 0) FROM pomodoro_sessions WHERE kind = 'focus'", [], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    Ok(PomodoroStats { today_focus_count, today_focus_secs, total_focus_count, total_focus_secs })
}
