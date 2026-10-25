use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::config::project_config_dir;

pub struct FlashcardsState(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Flashcard {
    pub id: i64,
    pub front: String,
    pub back: String,
    pub tags: Vec<String>,
    pub ease: f64,
    pub interval_days: f64,
    pub repetitions: i64,
    pub due_secs: i64,
    pub created_secs: i64,
}

fn now_secs() -> i64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as i64).unwrap_or(0)
}

fn join_tags(tags: &[String]) -> String {
    tags.join(",")
}
fn split_tags(s: &str) -> Vec<String> {
    if s.is_empty() {
        Vec::new()
    } else {
        s.split(',').map(|t| t.to_string()).collect()
    }
}

fn row_to_card(row: &rusqlite::Row) -> rusqlite::Result<Flashcard> {
    let tags_str: String = row.get("tags")?;
    Ok(Flashcard {
        id: row.get("id")?,
        front: row.get("front")?,
        back: row.get("back")?,
        tags: split_tags(&tags_str),
        ease: row.get("ease")?,
        interval_days: row.get("interval_days")?,
        repetitions: row.get("repetitions")?,
        due_secs: row.get("due_secs")?,
        created_secs: row.get("created_secs")?,
    })
}

pub fn open_db(_app: &AppHandle) -> Result<Connection, String> {
    let dir = project_config_dir();
    let conn = Connection::open(dir.join("flashcards.db")).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS flashcards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            front TEXT NOT NULL,
            back TEXT NOT NULL,
            tags TEXT NOT NULL DEFAULT '',
            ease REAL NOT NULL DEFAULT 2.5,
            interval_days REAL NOT NULL DEFAULT 0,
            repetitions INTEGER NOT NULL DEFAULT 0,
            due_secs INTEGER NOT NULL,
            created_secs INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

/// SM-2 spaced-repetition scheduling. quality is 0-5 (0 = total blackout, 5 = perfect recall).
pub fn sm2(ease: f64, interval_days: f64, repetitions: i64, quality: i64) -> (f64, f64, i64) {
    let q = quality.clamp(0, 5) as f64;
    if q < 3.0 {
        let new_ease = (ease - 0.2).max(1.3);
        return (new_ease, 1.0, 0);
    }
    let new_repetitions = repetitions + 1;
    let new_interval = match new_repetitions {
        1 => 1.0,
        2 => 6.0,
        _ => (interval_days * ease).round(),
    };
    let new_ease = (ease + (0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02))).max(1.3);
    (new_ease, new_interval, new_repetitions)
}

#[tauri::command]
pub fn list_due_flashcards(state: State<FlashcardsState>) -> Result<Vec<Flashcard>, String> {
    let conn = state.0.lock().unwrap();
    let now = now_secs();
    let mut stmt = conn
        .prepare("SELECT * FROM flashcards WHERE due_secs <= ?1 ORDER BY due_secs ASC")
        .map_err(|e| e.to_string())?;
    stmt.query_map(params![now], row_to_card)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn list_all_flashcards(state: State<FlashcardsState>) -> Result<Vec<Flashcard>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn.prepare("SELECT * FROM flashcards ORDER BY created_secs DESC").map_err(|e| e.to_string())?;
    stmt.query_map([], row_to_card)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_flashcard(state: State<FlashcardsState>, front: String, back: String, tags: Vec<String>) -> Result<Flashcard, String> {
    let conn = state.0.lock().unwrap();
    let now = now_secs();
    conn.execute(
        "INSERT INTO flashcards (front, back, tags, ease, interval_days, repetitions, due_secs, created_secs)
         VALUES (?1, ?2, ?3, 2.5, 0, 0, ?4, ?4)",
        params![front, back, join_tags(&tags), now],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row("SELECT * FROM flashcards WHERE id = ?1", params![id], row_to_card).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn review_flashcard(state: State<FlashcardsState>, id: i64, quality: i64) -> Result<Flashcard, String> {
    let conn = state.0.lock().unwrap();
    let card: Flashcard = conn.query_row("SELECT * FROM flashcards WHERE id = ?1", params![id], row_to_card).map_err(|e| e.to_string())?;
    let (ease, interval_days, repetitions) = sm2(card.ease, card.interval_days, card.repetitions, quality);
    let due_secs = now_secs() + (interval_days * 86400.0) as i64;
    conn.execute(
        "UPDATE flashcards SET ease = ?1, interval_days = ?2, repetitions = ?3, due_secs = ?4 WHERE id = ?5",
        params![ease, interval_days, repetitions, due_secs, id],
    )
    .map_err(|e| e.to_string())?;
    conn.query_row("SELECT * FROM flashcards WHERE id = ?1", params![id], row_to_card).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_flashcard(state: State<FlashcardsState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM flashcards WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sm2_resets_on_poor_recall() {
        let (ease, interval, reps) = sm2(2.5, 6.0, 2, 1);
        assert_eq!(reps, 0);
        assert_eq!(interval, 1.0);
        assert!(ease < 2.5);
    }

    #[test]
    fn sm2_grows_interval_on_good_recall() {
        let (_, interval1, reps1) = sm2(2.5, 0.0, 0, 5);
        assert_eq!((interval1, reps1), (1.0, 1));
        let (_, interval2, reps2) = sm2(2.5, interval1, reps1, 5);
        assert_eq!((interval2, reps2), (6.0, 2));
        let (_, interval3, reps3) = sm2(2.5, interval2, reps2, 5);
        assert_eq!(reps3, 3);
        assert!(interval3 > interval2);
    }

    #[test]
    fn sm2_ease_never_drops_below_floor() {
        let mut ease = 1.3;
        for _ in 0..10 {
            let (e, _, _) = sm2(ease, 1.0, 1, 0);
            ease = e;
        }
        assert!(ease >= 1.3);
    }
}
