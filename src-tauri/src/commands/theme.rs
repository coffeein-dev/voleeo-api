use crate::state::AppState;
use serde::Serialize;
use tauri::{Emitter, State};
use voleeo_core::VoleeoError;

#[tauri::command]
#[specta::specta]
pub async fn theme_get_color_mode(state: State<'_, AppState>) -> Result<String, VoleeoError> {
    Ok(state.color_mode.read().await.clone())
}

#[derive(Serialize, Clone)]
struct ColorModeChangedEvent {
    mode: String,
}

#[tauri::command]
#[specta::specta]
pub async fn theme_set_color_mode(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    mode: String,
) -> Result<(), VoleeoError> {
    *state.color_mode.write().await = mode.clone();
    state.save_settings().await;
    app.emit("color_mode:changed", ColorModeChangedEvent { mode })
        .ok();
    Ok(())
}

#[derive(Serialize, Clone)]
struct ThemeChangedEvent {
    id: String,
}

#[tauri::command]
#[specta::specta]
pub async fn theme_get_active(state: State<'_, AppState>) -> Result<String, VoleeoError> {
    Ok(state.active_theme_id.read().await.clone())
}

#[tauri::command]
#[specta::specta]
pub async fn theme_activate(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), VoleeoError> {
    *state.active_theme_id.write().await = id.clone();
    state.save_settings().await;
    app.emit("theme:changed", ThemeChangedEvent { id }).ok();
    Ok(())
}
