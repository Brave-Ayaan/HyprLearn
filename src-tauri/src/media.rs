use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct NowPlaying {
    pub title: String,
    pub artist: String,
    pub status: String, // "playing" | "paused" | "stopped" | "none" | "unsupported"
    pub position_secs: f64,
    pub duration_secs: f64,
    pub thumbnail_base64: Option<String>,
}

#[cfg(target_os = "windows")]
mod platform {
    use super::NowPlaying;
    use base64::Engine;
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSession, GlobalSystemMediaTransportControlsSessionManager,
        GlobalSystemMediaTransportControlsSessionMediaProperties,
        GlobalSystemMediaTransportControlsSessionPlaybackStatus as PlaybackStatus,
    };
    use windows::Storage::Streams::DataReader;

    fn current_session() -> Result<Option<GlobalSystemMediaTransportControlsSession>, String> {
        let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
            .map_err(|e| e.message())?
            .get()
            .map_err(|e| e.message())?;
        match manager.GetCurrentSession() {
            Ok(session) => Ok(Some(session)),
            Err(_) => Ok(None),
        }
    }

    /// Best-effort: any failure along the way (no thumbnail, can't open the
    /// stream, etc.) just means no album art, not a broken now-playing card.
    fn thumbnail_base64(props: &GlobalSystemMediaTransportControlsSessionMediaProperties) -> Option<String> {
        let thumb_ref = props.Thumbnail().ok()?;
        let stream = thumb_ref.OpenReadAsync().ok()?.get().ok()?;
        let size = stream.Size().ok()?;
        if size == 0 || size > 8_000_000 {
            return None;
        }
        let reader = DataReader::CreateDataReader(&stream).ok()?;
        reader.LoadAsync(size as u32).ok()?.get().ok()?;
        let mut buffer = vec![0u8; size as usize];
        reader.ReadBytes(&mut buffer).ok()?;
        Some(base64::engine::general_purpose::STANDARD.encode(&buffer))
    }

    pub fn get_now_playing() -> Result<NowPlaying, String> {
        let Some(session) = current_session()? else {
            return Ok(NowPlaying {
                title: String::new(),
                artist: String::new(),
                status: "none".into(),
                position_secs: 0.0,
                duration_secs: 0.0,
                thumbnail_base64: None,
            });
        };
        let props = session.TryGetMediaPropertiesAsync().map_err(|e| e.message())?.get().map_err(|e| e.message())?;
        let title = props.Title().map(|h| h.to_string_lossy()).unwrap_or_default();
        let artist = props.Artist().map(|h| h.to_string_lossy()).unwrap_or_default();
        let thumb = thumbnail_base64(&props);

        let status = session.GetPlaybackInfo().map_err(|e| e.message())?.PlaybackStatus().map_err(|e| e.message())?;
        let status_str = match status {
            PlaybackStatus::Playing => "playing",
            PlaybackStatus::Paused => "paused",
            _ => "stopped",
        };

        let (position_secs, duration_secs) = session
            .GetTimelineProperties()
            .ok()
            .map(|tl| {
                let pos = tl.Position().map(|t| t.Duration as f64 / 10_000_000.0).unwrap_or(0.0);
                let end = tl.EndTime().map(|t| t.Duration as f64 / 10_000_000.0).unwrap_or(0.0);
                (pos, end)
            })
            .unwrap_or((0.0, 0.0));

        Ok(NowPlaying {
            title,
            artist,
            status: status_str.into(),
            position_secs,
            duration_secs,
            thumbnail_base64: thumb,
        })
    }

    pub fn control(action: &str) -> Result<(), String> {
        let session = current_session()?.ok_or_else(|| "No active media session".to_string())?;
        let op_result = match action {
            "play_pause" => session.TryTogglePlayPauseAsync().map_err(|e| e.message())?.get(),
            "next" => session.TrySkipNextAsync().map_err(|e| e.message())?.get(),
            "previous" => session.TrySkipPreviousAsync().map_err(|e| e.message())?.get(),
            _ => return Err(format!("Unknown media action '{action}'")),
        };
        op_result.map_err(|e| e.message())?;
        Ok(())
    }

    pub fn seek(position_secs: f64) -> Result<(), String> {
        let session = current_session()?.ok_or_else(|| "No active media session".to_string())?;
        let ticks = (position_secs * 10_000_000.0) as i64;
        session.TryChangePlaybackPositionAsync(ticks).map_err(|e| e.message())?.get().map_err(|e| e.message())?;
        Ok(())
    }
}

#[cfg(not(target_os = "windows"))]
mod platform {
    use super::NowPlaying;

    pub fn get_now_playing() -> Result<NowPlaying, String> {
        Ok(NowPlaying {
            title: String::new(),
            artist: String::new(),
            status: "unsupported".into(),
            position_secs: 0.0,
            duration_secs: 0.0,
            thumbnail_base64: None,
        })
    }

    pub fn control(_action: &str) -> Result<(), String> {
        Err("Media control is only implemented for Windows (SMTC) in this build".into())
    }

    pub fn seek(_position_secs: f64) -> Result<(), String> {
        Err("Media control is only implemented for Windows (SMTC) in this build".into())
    }
}

#[tauri::command]
pub fn get_now_playing() -> Result<NowPlaying, String> {
    platform::get_now_playing()
}

#[tauri::command]
pub fn media_play_pause() -> Result<(), String> {
    platform::control("play_pause")
}

#[tauri::command]
pub fn media_next() -> Result<(), String> {
    platform::control("next")
}

#[tauri::command]
pub fn media_previous() -> Result<(), String> {
    platform::control("previous")
}

#[tauri::command]
pub fn media_seek(position_secs: f64) -> Result<(), String> {
    platform::seek(position_secs)
}
