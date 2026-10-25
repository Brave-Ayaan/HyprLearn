use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

use crate::config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultNode {
    pub name: String,
    pub relpath: String,
    pub is_dir: bool,
    pub children: Vec<VaultNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultDraft {
    pub content: String,
    pub saved_unix: u64,
}

fn vault_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let cfg = config::load_config(app);
    let dir = match cfg.vault.directory {
        Some(d) if !d.trim().is_empty() => std::path::PathBuf::from(d),
        _ => config::project_root().join("vault"),
    };
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// Joins `relpath` onto the vault root and rejects anything that would
/// escape it (".." segments, absolute paths), so a crafted relpath from the
/// frontend can never read or write outside the vault folder.
fn safe_join(root: &std::path::Path, relpath: &str) -> Result<std::path::PathBuf, String> {
    if relpath.trim().is_empty() {
        return Err("empty path".to_string());
    }
    let mut out = root.to_path_buf();
    for part in relpath.split(['/', '\\']) {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." {
            return Err("path cannot contain '..'".to_string());
        }
        out.push(part);
    }
    Ok(out)
}

fn build_tree(dir: &std::path::Path, root: &std::path::Path) -> Vec<VaultNode> {
    let mut entries: Vec<std::fs::DirEntry> = match std::fs::read_dir(dir) {
        Ok(rd) => rd.flatten().collect(),
        Err(_) => return Vec::new(),
    };
    entries.sort_by_key(|e| e.file_name());

    let mut dirs = Vec::new();
    let mut files = Vec::new();
    for entry in entries {
        let path = entry.path();
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        let relpath = path
            .strip_prefix(root)
            .unwrap_or(&path)
            .to_string_lossy()
            .replace('\\', "/");
        let is_dir = path.is_dir();
        let node = VaultNode {
            name,
            relpath,
            is_dir,
            children: if is_dir { build_tree(&path, root) } else { Vec::new() },
        };
        if is_dir {
            dirs.push(node);
        } else {
            files.push(node);
        }
    }
    dirs.extend(files);
    dirs
}

#[tauri::command]
pub fn list_vault_tree(app: AppHandle) -> Result<Vec<VaultNode>, String> {
    let dir = vault_dir(&app)?;
    Ok(build_tree(&dir, &dir))
}

#[tauri::command]
pub fn read_vault_file(app: AppHandle, relpath: String) -> Result<String, String> {
    let dir = vault_dir(&app)?;
    let path = safe_join(&dir, &relpath)?;
    std::fs::read_to_string(&path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::InvalidData {
            "This file isn't text (looks like a binary/media file) - the Vault can only open and edit text files.".to_string()
        } else {
            e.to_string()
        }
    })
}

#[tauri::command]
pub fn write_vault_file(app: AppHandle, relpath: String, content: String) -> Result<(), String> {
    let dir = vault_dir(&app)?;
    let path = safe_join(&dir, &relpath)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_vault_entry(app: AppHandle, relpath: String, is_dir: bool) -> Result<(), String> {
    let dir = vault_dir(&app)?;
    let path = safe_join(&dir, &relpath)?;
    if path.exists() {
        return Err("a file or folder with that name already exists".to_string());
    }
    if is_dir {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())
    } else {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&path, "").map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn rename_vault_entry(app: AppHandle, old_relpath: String, new_relpath: String) -> Result<(), String> {
    let dir = vault_dir(&app)?;
    let old_path = safe_join(&dir, &old_relpath)?;
    let new_path = safe_join(&dir, &new_relpath)?;
    if new_path.exists() {
        return Err("a file or folder with that name already exists".to_string());
    }
    if let Some(parent) = new_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_vault_entry(app: AppHandle, relpath: String) -> Result<(), String> {
    let dir = vault_dir(&app)?;
    let path = safe_join(&dir, &relpath)?;
    let result = if path.is_dir() {
        std::fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(&path).map_err(|e| e.to_string())
    };
    let _ = std::fs::remove_file(draft_path(&relpath));
    result
}

#[tauri::command]
pub fn get_vault_dir(app: AppHandle) -> Result<String, String> {
    Ok(vault_dir(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
pub fn set_vault_dir(app: AppHandle, directory: String) -> Result<(), String> {
    let mut cfg = config::load_config(&app);
    cfg.vault.directory = if directory.trim().is_empty() { None } else { Some(directory) };
    config::save_config(&app, &cfg)
}

// --- Crash-recovery drafts ---
//
// A draft is a periodic snapshot of the *unsaved* editor buffer, written to
// its own folder outside the vault itself (so it never shows up as a fake
// entry in the file tree) and keyed by the file's relpath. It is NOT the
// real save - the Vault only ever writes the real file on an explicit
// :save - but it means a crash or force-quit with unsaved edits isn't a
// total loss: reopening that file offers the draft back.

fn vault_drafts_dir() -> std::path::PathBuf {
    let dir = config::project_config_dir().join("vault_drafts");
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn draft_path(relpath: &str) -> std::path::PathBuf {
    let key = URL_SAFE_NO_PAD.encode(relpath.as_bytes());
    vault_drafts_dir().join(format!("{key}.json"))
}

#[tauri::command]
pub fn write_vault_draft(relpath: String, content: String) -> Result<(), String> {
    let saved_unix = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0);
    let draft = VaultDraft { content, saved_unix };
    let json = serde_json::to_string(&draft).map_err(|e| e.to_string())?;
    std::fs::write(draft_path(&relpath), json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_vault_draft(relpath: String) -> Result<Option<VaultDraft>, String> {
    match std::fs::read_to_string(draft_path(&relpath)) {
        Ok(text) => serde_json::from_str(&text).map(Some).map_err(|e| e.to_string()),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
pub fn delete_vault_draft(relpath: String) -> Result<(), String> {
    let path = draft_path(&relpath);
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn safe_join_rejects_parent_traversal() {
        let root = Path::new("/vault");
        assert!(safe_join(root, "../escape.txt").is_err());
        assert!(safe_join(root, "notes/../../escape.txt").is_err());
    }

    #[test]
    fn safe_join_allows_nested_paths() {
        let root = Path::new("/vault");
        assert_eq!(safe_join(root, "a/b/c.txt").unwrap(), root.join("a").join("b").join("c.txt"));
    }

    #[test]
    fn draft_path_is_deterministic_and_collision_free_across_separators() {
        let a = draft_path("notes/todo.md");
        let b = draft_path("notes/todo.md");
        let c = draft_path("other/todo.md");
        assert_eq!(a, b, "same relpath must map to the same draft file every time");
        assert_ne!(a, c, "different relpaths must not collide on one draft file");
        // The encoded key must itself contain no path separators, otherwise
        // a crafted relpath could escape the drafts folder the same way a
        // naive vault path could.
        let filename = a.file_name().unwrap().to_string_lossy().into_owned();
        assert!(!filename.contains('/') && !filename.contains('\\'));
    }
}
