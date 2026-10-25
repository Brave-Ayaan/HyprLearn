use std::process::Stdio;
use std::time::Duration;

use serde::Serialize;
use tokio::process::Command;
use tokio::time::timeout;

#[derive(Debug, Clone, Serialize)]
pub struct RunResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub timed_out: bool,
    pub compile_error: Option<String>,
}

const RUN_TIMEOUT_SECS: u64 = 8;

fn unique_dir() -> std::path::PathBuf {
    let nanos = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_nanos()).unwrap_or(0);
    std::env::temp_dir().join(format!("hyprlearn_run_{nanos}"))
}

/// Compiles and runs the given C or C++ source using whatever gcc/g++ is on
/// PATH - the same trust boundary as the user compiling it themselves in a
/// terminal, since this only ever runs code they wrote in this editor on
/// their own machine. Runs under a hard timeout so an infinite loop can't
/// hang the app; the whole temp directory (source + compiled binary) is
/// cleaned up afterward either way.
#[tauri::command]
pub async fn run_c_cpp(code: String, language: String) -> Result<RunResult, String> {
    let dir = unique_dir();
    tokio::fs::create_dir_all(&dir).await.map_err(|e| e.to_string())?;

    let is_cpp = language != "c";
    let source_path = dir.join(if is_cpp { "main.cpp" } else { "main.c" });
    let exe_path = dir.join(if cfg!(windows) { "main.exe" } else { "main" });

    tokio::fs::write(&source_path, &code).await.map_err(|e| e.to_string())?;

    let compiler = if is_cpp { "g++" } else { "gcc" };
    let std_flag = if is_cpp { "-std=c++17" } else { "-std=c17" };

    let compile_output = Command::new(compiler)
        .args([std_flag, "-O0", "-Wall"])
        .arg(&source_path)
        .arg("-o")
        .arg(&exe_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await;

    let compile_output = match compile_output {
        Ok(o) => o,
        Err(e) => {
            let _ = tokio::fs::remove_dir_all(&dir).await;
            return Err(format!("Couldn't run '{compiler}' - is it installed and on PATH? ({e})"));
        }
    };

    if !compile_output.status.success() {
        let _ = tokio::fs::remove_dir_all(&dir).await;
        return Ok(RunResult {
            stdout: String::new(),
            stderr: String::new(),
            exit_code: compile_output.status.code(),
            timed_out: false,
            compile_error: Some(String::from_utf8_lossy(&compile_output.stderr).to_string()),
        });
    }

    let run_future = Command::new(&exe_path).current_dir(&dir).kill_on_drop(true).stdout(Stdio::piped()).stderr(Stdio::piped()).output();

    let result = match timeout(Duration::from_secs(RUN_TIMEOUT_SECS), run_future).await {
        Ok(Ok(output)) => RunResult {
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code(),
            timed_out: false,
            compile_error: None,
        },
        Ok(Err(e)) => RunResult { stdout: String::new(), stderr: e.to_string(), exit_code: None, timed_out: false, compile_error: None },
        Err(_) => RunResult {
            stdout: String::new(),
            stderr: format!("Timed out after {RUN_TIMEOUT_SECS}s (likely an infinite loop)"),
            exit_code: None,
            timed_out: true,
            compile_error: None,
        },
    };

    let _ = tokio::fs::remove_dir_all(&dir).await;
    Ok(result)
}
