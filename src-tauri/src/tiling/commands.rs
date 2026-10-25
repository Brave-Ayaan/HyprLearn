use std::sync::Mutex;

use tauri::{AppHandle, State};

use crate::config::project_config_dir;

use super::tree::{Axis, Dir, Layout, LayoutMode};

pub struct LayoutState(pub Mutex<Layout>);

fn snapshot(state: &State<LayoutState>) -> Layout {
    state.0.lock().unwrap().clone()
}

fn layout_path() -> std::path::PathBuf {
    project_config_dir().join("layout.json")
}

fn persist(_app: &AppHandle, layout: &Layout) {
    if let Ok(json) = serde_json::to_string(layout) {
        let _ = std::fs::write(layout_path(), json);
    }
}

/// Reads the last-saved layout from disk, if any, so the window reopens
/// where the user left it instead of always resetting to the config's
/// startup_tiles.
pub fn load_persisted(_app: &AppHandle) -> Option<Layout> {
    let text = std::fs::read_to_string(layout_path()).ok()?;
    serde_json::from_str(&text).ok()
}

#[tauri::command]
pub fn get_layout(state: State<LayoutState>) -> Layout {
    snapshot(&state)
}

#[tauri::command]
pub fn split_tile(app: AppHandle, state: State<LayoutState>, axis: Axis, tile_type: String) -> Result<Layout, String> {
    let mut layout = state.0.lock().unwrap();
    layout.split_focused(axis, &tile_type)?;
    persist(&app, &layout);
    Ok(layout.clone())
}

#[tauri::command]
pub fn close_tile(app: AppHandle, state: State<LayoutState>) -> Result<Layout, String> {
    let mut layout = state.0.lock().unwrap();
    layout.close_focused()?;
    persist(&app, &layout);
    Ok(layout.clone())
}

#[tauri::command]
pub fn move_focus(app: AppHandle, state: State<LayoutState>, dir: Dir) -> Layout {
    let mut layout = state.0.lock().unwrap();
    layout.move_focus(dir);
    persist(&app, &layout);
    layout.clone()
}

#[tauri::command]
pub fn swap_tile(app: AppHandle, state: State<LayoutState>, dir: Dir) -> Layout {
    let mut layout = state.0.lock().unwrap();
    layout.swap_focused(dir);
    persist(&app, &layout);
    layout.clone()
}

#[tauri::command]
pub fn resize_tile(app: AppHandle, state: State<LayoutState>, dir: Dir, delta: f32) -> Layout {
    let mut layout = state.0.lock().unwrap();
    layout.resize_focused(dir, delta);
    persist(&app, &layout);
    layout.clone()
}

#[tauri::command]
pub fn cycle_focus(app: AppHandle, state: State<LayoutState>, forward: bool) -> Layout {
    let mut layout = state.0.lock().unwrap();
    layout.cycle_focus(forward);
    persist(&app, &layout);
    layout.clone()
}

#[tauri::command]
pub fn jump_to_tile(app: AppHandle, state: State<LayoutState>, number: usize) -> Result<Layout, String> {
    let mut layout = state.0.lock().unwrap();
    layout.jump_to(number)?;
    persist(&app, &layout);
    Ok(layout.clone())
}

#[tauri::command]
pub fn toggle_fullscreen(app: AppHandle, state: State<LayoutState>) -> Layout {
    let mut layout = state.0.lock().unwrap();
    layout.toggle_fullscreen();
    persist(&app, &layout);
    layout.clone()
}

#[tauri::command]
pub fn set_layout_mode(app: AppHandle, state: State<LayoutState>, mode: LayoutMode) -> Layout {
    let mut layout = state.0.lock().unwrap();
    layout.set_mode(mode);
    persist(&app, &layout);
    layout.clone()
}

/// Safety valve: discards the persisted layout and resets to a single tile,
/// in case a saved layout ever ends up in a confusing state.
#[tauri::command]
pub fn reset_layout(_app: AppHandle, state: State<LayoutState>) -> Layout {
    let mut layout = state.0.lock().unwrap();
    *layout = Layout::new("dummy");
    let _ = std::fs::remove_file(layout_path());
    layout.clone()
}
