use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};

use crate::config::project_config_dir;

pub struct TasksState(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRow {
    pub id: i64,
    pub title: String,
    pub project: Option<String>,
    pub tags: Vec<String>,
    pub due_date: Option<String>,
    pub recurrence: Option<String>,
    pub completed: bool,
    pub created_secs: i64,
}

#[derive(Debug, Deserialize)]
pub struct NewTask {
    pub title: String,
    pub project: Option<String>,
    pub tags: Vec<String>,
    pub due_date: Option<String>,
    pub recurrence: Option<String>,
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

fn row_to_task(row: &rusqlite::Row) -> rusqlite::Result<TaskRow> {
    let tags_str: String = row.get("tags")?;
    Ok(TaskRow {
        id: row.get("id")?,
        title: row.get("title")?,
        project: row.get("project")?,
        tags: split_tags(&tags_str),
        due_date: row.get("due_date")?,
        recurrence: row.get("recurrence")?,
        completed: row.get::<_, i64>("completed")? != 0,
        created_secs: row.get("created_secs")?,
    })
}

pub fn open_db(_app: &AppHandle) -> Result<Connection, String> {
    let dir = project_config_dir();
    let conn = Connection::open(dir.join("tasks.db")).map_err(|e| e.to_string())?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            project TEXT,
            tags TEXT NOT NULL DEFAULT '',
            due_date TEXT,
            recurrence TEXT,
            completed INTEGER NOT NULL DEFAULT 0,
            created_secs INTEGER NOT NULL
        )",
        [],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

#[tauri::command]
pub fn list_tasks(state: State<TasksState>) -> Result<Vec<TaskRow>, String> {
    let conn = state.0.lock().unwrap();
    let mut stmt = conn
        .prepare(
            "SELECT * FROM tasks
             ORDER BY completed ASC, due_date IS NULL, due_date ASC, created_secs ASC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_task)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn add_task(state: State<TasksState>, task: NewTask) -> Result<TaskRow, String> {
    let conn = state.0.lock().unwrap();
    let created = now_secs();
    conn.execute(
        "INSERT INTO tasks (title, project, tags, due_date, recurrence, completed, created_secs)
         VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
        params![task.title, task.project, join_tags(&task.tags), task.due_date, task.recurrence, created],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    conn.query_row("SELECT * FROM tasks WHERE id = ?1", params![id], row_to_task)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_task(state: State<TasksState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().unwrap();
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

/// Toggles completion. If the task is recurring and is being marked
/// complete (not un-completed), spawns the next occurrence.
#[tauri::command]
pub fn toggle_task(state: State<TasksState>, id: i64) -> Result<Vec<TaskRow>, String> {
    let conn = state.0.lock().unwrap();
    let task: TaskRow = conn
        .query_row("SELECT * FROM tasks WHERE id = ?1", params![id], row_to_task)
        .map_err(|e| e.to_string())?;
    let completing = !task.completed;
    conn.execute(
        "UPDATE tasks SET completed = ?1 WHERE id = ?2",
        params![if completing { 1 } else { 0 }, id],
    )
    .map_err(|e| e.to_string())?;

    if completing {
        if let (Some(recurrence), Some(due)) = (&task.recurrence, &task.due_date) {
            if let Some(next_due) = next_due_date(due, recurrence) {
                conn.execute(
                    "INSERT INTO tasks (title, project, tags, due_date, recurrence, completed, created_secs)
                     VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
                    params![task.title, task.project, join_tags(&task.tags), next_due, recurrence, now_secs()],
                )
                .map_err(|e| e.to_string())?;
            }
        }
    }

    let mut stmt = conn
        .prepare("SELECT * FROM tasks ORDER BY completed ASC, due_date IS NULL, due_date ASC, created_secs ASC")
        .map_err(|e| e.to_string())?;
    stmt.query_map([], row_to_task)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

// --- Minimal proleptic-Gregorian date math, no external crate needed. ---

fn parse_date(s: &str) -> Option<(i32, u32, u32)> {
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    Some((parts[0].parse().ok()?, parts[1].parse().ok()?, parts[2].parse().ok()?))
}

fn is_leap(y: i32) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

fn days_in_month(y: i32, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap(y) {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

fn format_date(y: i32, m: u32, d: u32) -> String {
    format!("{y:04}-{m:02}-{d:02}")
}

fn add_days(s: &str, mut days: i64) -> Option<String> {
    let (mut y, mut m, d) = parse_date(s)?;
    let mut day = d as i64;
    while days > 0 {
        let dim = days_in_month(y, m) as i64;
        if day + days <= dim {
            day += days;
            days = 0;
        } else {
            days -= dim - day + 1;
            day = 1;
            m += 1;
            if m > 12 {
                m = 1;
                y += 1;
            }
        }
    }
    Some(format_date(y, m, day as u32))
}

fn add_months(s: &str, months: u32) -> Option<String> {
    let (y, m, d) = parse_date(s)?;
    let total = (y as i64) * 12 + (m as i64 - 1) + months as i64;
    let new_y = (total.div_euclid(12)) as i32;
    let new_m = (total.rem_euclid(12) + 1) as u32;
    let dim = days_in_month(new_y, new_m);
    Some(format_date(new_y, new_m, d.min(dim)))
}

fn next_due_date(current: &str, recurrence: &str) -> Option<String> {
    match recurrence {
        "daily" => add_days(current, 1),
        "weekly" => add_days(current, 7),
        "monthly" => add_months(current, 1),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn add_days_rolls_over_month_end() {
        assert_eq!(add_days("2026-01-30", 1).unwrap(), "2026-01-31");
        assert_eq!(add_days("2026-01-31", 1).unwrap(), "2026-02-01");
        assert_eq!(add_days("2026-02-27", 2).unwrap(), "2026-03-01"); // 2026 not a leap year
    }

    #[test]
    fn add_days_handles_leap_year() {
        assert_eq!(add_days("2028-02-28", 1).unwrap(), "2028-02-29"); // 2028 is a leap year
    }

    #[test]
    fn add_months_rolls_over_year_and_clamps_day() {
        assert_eq!(add_months("2026-11-15", 2).unwrap(), "2027-01-15");
        assert_eq!(add_months("2026-01-31", 1).unwrap(), "2026-02-28"); // Feb has no 31st
    }

    #[test]
    fn next_due_date_dispatches_by_recurrence() {
        assert_eq!(next_due_date("2026-06-01", "daily").unwrap(), "2026-06-02");
        assert_eq!(next_due_date("2026-06-01", "weekly").unwrap(), "2026-06-08");
        assert_eq!(next_due_date("2026-06-01", "monthly").unwrap(), "2026-07-01");
        assert_eq!(next_due_date("2026-06-01", "none"), None);
    }

    #[test]
    fn tags_round_trip_through_join_and_split() {
        let tags = vec!["work".to_string(), "urgent".to_string()];
        let joined = join_tags(&tags);
        assert_eq!(split_tags(&joined), tags);
        assert_eq!(split_tags(""), Vec::<String>::new());
    }
}
