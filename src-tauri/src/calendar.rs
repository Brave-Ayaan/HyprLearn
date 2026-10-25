use std::sync::Mutex;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::config::project_config_dir;

pub struct CalendarState(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: i64,
    pub title: String,
    pub start_secs: i64,
    pub end_secs: i64,
    pub all_day: bool,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct NewEvent {
    pub title: String,
    pub start_secs: i64,
    pub end_secs: i64,
    pub all_day: bool,
    pub description: String,
}

fn row_to_event(row: &rusqlite::Row) -> rusqlite::Result<Event> {
    Ok(Event {
        id: row.get("id")?,
        title: row.get("title")?,
        start_secs: row.get("start_secs")?,
        end_secs: row.get("end_secs")?,
        all_day: row.get::<_, i64>("all_day")? != 0,
        description: row.get("description")?,
    })
}

pub fn open_db(_app: &AppHandle) -> Result<Connection, String> {
    let dir = project_config_dir();
    let conn = Connection::open(dir.join("calendar.db")).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            start_secs INTEGER NOT NULL,
            end_secs INTEGER NOT NULL,
            all_day INTEGER NOT NULL DEFAULT 0,
            description TEXT NOT NULL DEFAULT ''
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

#[tauri::command]
pub fn list_events(state: State<CalendarState>) -> Result<Vec<Event>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT * FROM events ORDER BY start_secs ASC").map_err(|e| e.to_string())?;
    stmt.query_map([], row_to_event)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_event(state: State<CalendarState>, event: NewEvent) -> Result<Event, String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO events (title, start_secs, end_secs, all_day, description) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![event.title, event.start_secs, event.end_secs, event.all_day as i64, event.description],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row("SELECT * FROM events WHERE id = ?1", params![id], row_to_event).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_event(state: State<CalendarState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM events WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}
