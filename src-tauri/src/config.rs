use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::AppHandle;

/// The project's own root directory (parent of src-tauri), resolved at
/// compile time so it holds regardless of the process's working directory.
/// This app keeps all of its own config and data inside the project folder
/// instead of the OS app-data directory, so it's all visible in one place
/// and travels with the project.
pub fn project_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("src-tauri has a parent directory")
        .to_path_buf()
}

/// Where config.toml, layout.json, and every sqlite database live.
pub fn project_config_dir() -> PathBuf {
    let dir = project_root().join("config");
    std::fs::create_dir_all(&dir).ok();
    dir
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeybindingsConfig {
    #[serde(default)]
    pub normal: HashMap<String, String>,
    #[serde(default)]
    pub leader: HashMap<String, String>,
    #[serde(default)]
    pub visual: HashMap<String, String>,
    #[serde(default)]
    pub command: HashMap<String, String>,
    #[serde(default)]
    pub global: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutConfig {
    pub default_mode: String,
    pub gaps: u32,
    pub border_width: u32,
    pub startup_tiles: Vec<String>,
    pub leader_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeConfig {
    #[serde(default = "default_theme_name")]
    pub name: String,
    pub accent: String,
    pub background: String,
    pub foreground: String,
    #[serde(default = "default_surface")]
    pub surface: String,
    #[serde(default = "default_overlay")]
    pub overlay: String,
    #[serde(default = "default_border")]
    pub border: String,
    #[serde(default = "default_success")]
    pub success: String,
    #[serde(default = "default_warning")]
    pub warning: String,
    #[serde(default = "default_error")]
    pub error: String,
    pub border_radius: u32,
}

fn default_theme_name() -> String {
    "custom".to_string()
}
fn default_surface() -> String {
    "#2c313a".to_string()
}
fn default_overlay() -> String {
    "#323842".to_string()
}
fn default_border() -> String {
    "#3e4451".to_string()
}
fn default_success() -> String {
    "#98c379".to_string()
}
fn default_warning() -> String {
    "#e5c07b".to_string()
}
fn default_error() -> String {
    "#e06c75".to_string()
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct NotesConfig {
    #[serde(default)]
    pub directory: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct VaultConfig {
    #[serde(default)]
    pub directory: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub keybindings: KeybindingsConfig,
    pub layout: LayoutConfig,
    pub theme: ThemeConfig,
    #[serde(default)]
    pub notes: NotesConfig,
    #[serde(default)]
    pub vault: VaultConfig,
}

const DEFAULT_CONFIG_TOML: &str = include_str!("../resources/default_config.toml");

fn default_config() -> AppConfig {
    toml::from_str(DEFAULT_CONFIG_TOML).expect("bundled default_config.toml must parse")
}

fn config_path(_app: &AppHandle) -> std::path::PathBuf {
    project_config_dir().join("config.toml")
}

pub fn load_config(app: &AppHandle) -> AppConfig {
    let path = config_path(app);
    match std::fs::read_to_string(&path) {
        Ok(text) => toml::from_str(&text).unwrap_or_else(|e| {
            log::warn!("config.toml failed to parse ({e}), falling back to defaults");
            default_config()
        }),
        Err(_) => {
            let _ = std::fs::write(&path, DEFAULT_CONFIG_TOML);
            default_config()
        }
    }
}

pub fn save_config(app: &AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_path(app);
    let text = toml::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_config(app: AppHandle) -> AppConfig {
    load_config(&app)
}

#[tauri::command]
pub fn save_config_cmd(app: AppHandle, config: AppConfig) -> Result<(), String> {
    save_config(&app, &config)
}

/// Raw dotfile text, for an in-app "edit the TOML directly" settings view.
#[tauri::command]
pub fn get_raw_config(app: AppHandle) -> String {
    let path = config_path(&app);
    std::fs::read_to_string(&path).unwrap_or_else(|_| DEFAULT_CONFIG_TOML.to_string())
}

/// Validates that the text parses as a complete AppConfig *before* writing,
/// so a typo in the editor can't silently corrupt the live config.
#[tauri::command]
pub fn save_raw_config(app: AppHandle, text: String) -> Result<(), String> {
    let _: AppConfig = toml::from_str(&text).map_err(|e| e.to_string())?;
    let path = config_path(&app);
    std::fs::write(&path, text).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Catches a malformed bundled default_config.toml (e.g. a duplicate
    /// TOML key) at test time instead of as a runtime panic on first launch.
    /// A duplicate TOML key (e.g. two "o v" entries in [keybindings.leader])
    /// is a parse error, caught here instead of as a runtime panic on launch.
    #[test]
    fn bundled_default_config_parses() {
        let cfg: AppConfig = toml::from_str(DEFAULT_CONFIG_TOML).expect("default_config.toml must parse");
        assert!(!cfg.layout.startup_tiles.is_empty());
    }
}
