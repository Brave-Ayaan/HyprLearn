use std::collections::BTreeSet;
use std::time::UNIX_EPOCH;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteMeta {
    pub name: String,
    pub modified_secs: u64,
    pub tags: Vec<String>,
    pub preview: String,
}

fn notes_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let cfg = config::load_config(app);
    let dir = match cfg.notes.directory {
        Some(d) if !d.trim().is_empty() => std::path::PathBuf::from(d),
        _ => app
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?
            .join("notes"),
    };
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Scans for '#tag' tokens outside of word boundaries (so "tag#1" doesn't count).
fn extract_tags(content: &str) -> Vec<String> {
    let chars: Vec<char> = content.chars().collect();
    let mut tags = BTreeSet::new();
    let mut i = 0;
    while i < chars.len() {
        if chars[i] == '#' && (i == 0 || !chars[i - 1].is_alphanumeric()) {
            let mut j = i + 1;
            let mut tag = String::new();
            while j < chars.len() && (chars[j].is_alphanumeric() || chars[j] == '_' || chars[j] == '-') {
                tag.push(chars[j]);
                j += 1;
            }
            if !tag.is_empty() {
                tags.insert(tag.to_lowercase());
            }
            i = j;
        } else {
            i += 1;
        }
    }
    tags.into_iter().collect()
}

fn make_preview(content: &str) -> String {
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        return trimmed.chars().take(140).collect();
    }
    String::new()
}

fn sanitize_filename(title: &str) -> String {
    let mut out = String::new();
    let mut last_dash = false;
    for c in title.chars() {
        if c.is_alphanumeric() {
            out.push(c.to_ascii_lowercase());
            last_dash = false;
        } else if !last_dash && !out.is_empty() {
            out.push('-');
            last_dash = true;
        }
    }
    while out.ends_with('-') {
        out.pop();
    }
    if out.is_empty() {
        "untitled".to_string()
    } else {
        out
    }
}

#[tauri::command]
pub fn list_notes(app: AppHandle) -> Result<Vec<NoteMeta>, String> {
    let dir = notes_dir(&app)?;
    let mut notes = Vec::new();
    let entries = std::fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        let content = std::fs::read_to_string(&path).unwrap_or_default();
        let modified_secs = entry
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        notes.push(NoteMeta {
            name,
            modified_secs,
            tags: extract_tags(&content),
            preview: make_preview(&content),
        });
    }
    notes.sort_by(|a, b| b.modified_secs.cmp(&a.modified_secs));
    Ok(notes)
}

#[tauri::command]
pub fn read_note(app: AppHandle, name: String) -> Result<String, String> {
    let dir = notes_dir(&app)?;
    std::fs::read_to_string(dir.join(&name)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_note(app: AppHandle, name: String, content: String) -> Result<(), String> {
    let dir = notes_dir(&app)?;
    std::fs::write(dir.join(&name), content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_note(app: AppHandle, title: String) -> Result<String, String> {
    let dir = notes_dir(&app)?;
    let base = sanitize_filename(&title);
    let mut filename = format!("{base}.md");
    let mut n = 2;
    while dir.join(&filename).exists() {
        filename = format!("{base}-{n}.md");
        n += 1;
    }
    let heading = if title.trim().is_empty() { "Untitled" } else { title.trim() };
    let template = format!("# {heading}\n\n");
    std::fs::write(dir.join(&filename), &template).map_err(|e| e.to_string())?;
    Ok(filename)
}

#[tauri::command]
pub fn delete_note(app: AppHandle, name: String) -> Result<(), String> {
    let dir = notes_dir(&app)?;
    std::fs::remove_file(dir.join(&name)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_notes_dir(app: AppHandle) -> Result<String, String> {
    Ok(notes_dir(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
pub fn set_notes_dir(app: AppHandle, directory: String) -> Result<(), String> {
    let mut cfg = config::load_config(&app);
    cfg.notes.directory = if directory.trim().is_empty() { None } else { Some(directory) };
    config::save_config(&app, &cfg)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_tags_finds_hashtags_but_not_mid_word() {
        let content = "Shopping #groceries and #todo-list.\nAlso tag#1 is not a tag.\n#GROCERIES dup.";
        let tags = extract_tags(content);
        assert_eq!(tags, vec!["groceries".to_string(), "todo-list".to_string()]);
    }

    #[test]
    fn make_preview_skips_headings_and_blank_lines() {
        let content = "# Title\n\n\n  First real line here.\nSecond line.";
        assert_eq!(make_preview(content), "First real line here.");
    }

    #[test]
    fn sanitize_filename_collapses_punctuation() {
        assert_eq!(sanitize_filename("Hello, World!! "), "hello-world");
        assert_eq!(sanitize_filename("###"), "untitled");
    }
}
