mod calendar;
mod coderunner;
mod config;
mod flashcards;
mod media;
mod notes;
mod pomodoro;
mod snippets;
mod sysbar;
mod tasks;
mod tiling;
mod vault;

use std::sync::Mutex;

use tauri::Manager;
use tiling::commands::LayoutState;
use tiling::tree::Layout;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      let initial_layout = tiling::commands::load_persisted(&app.handle()).unwrap_or_else(|| {
        let cfg = config::load_config(&app.handle());
        let initial_tile = cfg.layout.startup_tiles.first().cloned().unwrap_or_else(|| "dummy".to_string());
        Layout::new(&initial_tile)
      });
      app.manage(LayoutState(Mutex::new(initial_layout)));

      let task_conn = tasks::open_db(&app.handle())?;
      app.manage(tasks::TasksState(Mutex::new(task_conn)));

      let flashcards_conn = flashcards::open_db(&app.handle())?;
      app.manage(flashcards::FlashcardsState(Mutex::new(flashcards_conn)));

      let pomodoro_conn = pomodoro::open_db(&app.handle())?;
      app.manage(pomodoro::PomodoroState(Mutex::new(pomodoro_conn)));

      let snippets_conn = snippets::open_db(&app.handle())?;
      app.manage(snippets::SnippetsState(Mutex::new(snippets_conn)));

      let calendar_conn = calendar::open_db(&app.handle())?;
      app.manage(calendar::CalendarState(Mutex::new(calendar_conn)));

      app.manage(sysbar::SysState::default());

      Ok(())
    })
    .plugin(tauri_plugin_dialog::init())
    .invoke_handler(tauri::generate_handler![
      tiling::commands::get_layout,
      tiling::commands::split_tile,
      tiling::commands::close_tile,
      tiling::commands::move_focus,
      tiling::commands::swap_tile,
      tiling::commands::resize_tile,
      tiling::commands::cycle_focus,
      tiling::commands::jump_to_tile,
      tiling::commands::toggle_fullscreen,
      tiling::commands::set_layout_mode,
      tiling::commands::reset_layout,
      config::get_config,
      config::save_config_cmd,
      config::get_raw_config,
      config::save_raw_config,
      notes::list_notes,
      notes::read_note,
      notes::write_note,
      notes::create_note,
      notes::delete_note,
      notes::get_notes_dir,
      notes::set_notes_dir,
      tasks::list_tasks,
      tasks::add_task,
      tasks::toggle_task,
      tasks::delete_task,
      flashcards::list_due_flashcards,
      flashcards::list_all_flashcards,
      flashcards::add_flashcard,
      flashcards::review_flashcard,
      flashcards::delete_flashcard,
      pomodoro::log_pomodoro_session,
      pomodoro::list_pomodoro_sessions,
      pomodoro::pomodoro_stats,
      snippets::list_snippets,
      snippets::create_snippet,
      snippets::save_snippet,
      snippets::rename_snippet,
      snippets::delete_snippet,
      media::get_now_playing,
      media::media_play_pause,
      media::media_next,
      media::media_previous,
      media::media_seek,
      calendar::list_events,
      calendar::add_event,
      calendar::delete_event,
      sysbar::get_system_bar_info,
      coderunner::run_c_cpp,
      vault::list_vault_tree,
      vault::read_vault_file,
      vault::write_vault_file,
      vault::create_vault_entry,
      vault::rename_vault_entry,
      vault::delete_vault_entry,
      vault::get_vault_dir,
      vault::set_vault_dir,
      vault::write_vault_draft,
      vault::read_vault_draft,
      vault::delete_vault_draft,
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
