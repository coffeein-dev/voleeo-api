use std::collections::HashMap;
use std::path::PathBuf;
use tauri::State;
use voleeo_core::VoleeoError;

use crate::state::AppState;

/// Read the plugin's JSON store file.
async fn read_store(app_data_dir: PathBuf, plugin_id: String) -> HashMap<String, String> {
    let path = store_path(&app_data_dir, &plugin_id);
    tokio::task::spawn_blocking(move || {
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    })
    .await
    .unwrap_or_default()
}

/// Persist the plugin's JSON store file.
async fn write_store(
    app_data_dir: PathBuf,
    plugin_id: String,
    store: HashMap<String, String>,
) -> Result<(), VoleeoError> {
    let dir = store_dir(&app_data_dir, &plugin_id);
    let json = serde_json::to_string(&store).map_err(|e| VoleeoError::Storage(e.to_string()))?;
    tokio::task::spawn_blocking(move || {
        std::fs::create_dir_all(&dir).map_err(|e| VoleeoError::Storage(e.to_string()))?;
        let path = dir.join("store.json");
        std::fs::write(&path, json).map_err(|e| VoleeoError::Storage(e.to_string()))
    })
    .await
    .map_err(|e| VoleeoError::Storage(e.to_string()))?
}

fn store_dir(app_data_dir: &std::path::Path, plugin_id: &str) -> PathBuf {
    // Sanitise plugin_id so it's safe to use as a directory name.
    let safe_id = plugin_id.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|', '@'], "_");
    app_data_dir.join("plugins").join(safe_id)
}

fn store_path(app_data_dir: &std::path::Path, plugin_id: &str) -> PathBuf {
    store_dir(app_data_dir, plugin_id).join("store.json")
}

/// Retrieve a stored value by key. Returns `null` if the key does not exist.
#[tauri::command]
#[specta::specta]
pub async fn plugin_store_get(
    state: State<'_, AppState>,
    plugin_id: String,
    key: String,
) -> Result<Option<String>, VoleeoError> {
    let store = read_store(state.app_data_dir.clone(), plugin_id).await;
    Ok(store.get(&key).cloned())
}

/// Set a value. The value must be a JSON string (the frontend serialises it).
#[tauri::command]
#[specta::specta]
pub async fn plugin_store_set(
    state: State<'_, AppState>,
    plugin_id: String,
    key: String,
    value: String,
) -> Result<(), VoleeoError> {
    let mut store = read_store(state.app_data_dir.clone(), plugin_id.clone()).await;
    store.insert(key, value);
    write_store(state.app_data_dir.clone(), plugin_id, store).await
}

/// Delete a key. Returns true if the key existed.
#[tauri::command]
#[specta::specta]
pub async fn plugin_store_delete(
    state: State<'_, AppState>,
    plugin_id: String,
    key: String,
) -> Result<bool, VoleeoError> {
    let mut store = read_store(state.app_data_dir.clone(), plugin_id.clone()).await;
    let existed = store.remove(&key).is_some();
    if existed {
        write_store(state.app_data_dir.clone(), plugin_id, store).await?;
    }
    Ok(existed)
}
