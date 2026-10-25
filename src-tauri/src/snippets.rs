use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::config::project_config_dir;

pub struct SnippetsState(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snippet {
    pub id: i64,
    pub title: String,
    pub language: String,
    pub content: String,
    pub created_secs: i64,
    pub updated_secs: i64,
}

fn now_secs() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

fn row_to_snippet(row: &rusqlite::Row) -> rusqlite::Result<Snippet> {
    Ok(Snippet {
        id: row.get("id")?,
        title: row.get("title")?,
        language: row.get("language")?,
        content: row.get("content")?,
        created_secs: row.get("created_secs")?,
        updated_secs: row.get("updated_secs")?,
    })
}

pub fn open_db(_app: &AppHandle) -> Result<Connection, String> {
    let dir = project_config_dir();
    let conn = Connection::open(dir.join("snippets.db")).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS snippets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            language TEXT NOT NULL DEFAULT 'plain',
            content TEXT NOT NULL DEFAULT '',
            created_secs INTEGER NOT NULL,
            updated_secs INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

#[tauri::command]
pub fn list_snippets(state: State<SnippetsState>) -> Result<Vec<Snippet>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT * FROM snippets ORDER BY updated_secs DESC").map_err(|e| e.to_string())?;
    stmt.query_map([], row_to_snippet)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_snippet(state: State<SnippetsState>, title: String, language: String) -> Result<Snippet, String> {
    let conn = state.0.lock().unwrap();
    let now = now_secs();
    conn.execute(
        "INSERT INTO snippets (title, language, content, created_secs, updated_secs) VALUES (?1, ?2, '', ?3, ?3)",
        params![title, language, now],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row("SELECT * FROM snippets WHERE id = ?1", params![id], row_to_snippet).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_snippet(state: State<SnippetsState>, id: i64, content: String) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE snippets SET content = ?1, updated_secs = ?2 WHERE id = ?3",
        params![content, now_secs(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn rename_snippet(state: State<SnippetsState>, id: i64, title: String, language: String) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "UPDATE snippets SET title = ?1, language = ?2, updated_secs = ?3 WHERE id = ?4",
        params![title, language, now_secs(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_snippet(state: State<SnippetsState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM snippets WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}
