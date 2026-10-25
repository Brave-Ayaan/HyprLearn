use std::sync::Mutex;

use serde::Serialize;
use sysinfo::System;
use tauri::State;

pub struct SysState(pub Mutex<System>);

impl Default for SysState {
    fn default() -> Self {
        SysState(Mutex::new(System::new_all()))
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct SystemBarInfo {
    pub cpu_percent: f32,
    pub mem_used_mb: u64,
    pub mem_total_mb: u64,
}

#[tauri::command]
pub fn get_system_bar_info(state: State<SysState>) -> SystemBarInfo {
    let mut sys = state.0.lock().unwrap();
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu_percent = sys.global_cpu_usage();
    let mem_used_mb = sys.used_memory() / 1024 / 1024;
    let mem_total_mb = sys.total_memory() / 1024 / 1024;

    SystemBarInfo { cpu_percent, mem_used_mb, mem_total_mb }
}
