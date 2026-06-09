use tauri::State;
use voleeo_core::VoleeoError;
use voleeo_storage::{
    BodyFilterResult, BodySearchResult, BodyWindow, SearchOpts, StoredHttpResponse,
    StoredHttpResponseSummary,
};

use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn response_list(
    state: State<'_, AppState>,
    workspace_id: String,
    request_id: String,
) -> Result<Vec<StoredHttpResponseSummary>, VoleeoError> {
    let store = state.responses.clone();
    tokio::task::spawn_blocking(move || store.list(&workspace_id, &request_id))
        .await
        .map_err(|e| VoleeoError::Storage(e.to_string()))?
}

#[tauri::command]
#[specta::specta]
pub async fn response_get(
    state: State<'_, AppState>,
    workspace_id: String,
    request_id: String,
    response_id: String,
) -> Result<Option<StoredHttpResponse>, VoleeoError> {
    let store = state.responses.clone();
    tokio::task::spawn_blocking(move || store.get(&workspace_id, &request_id, &response_id))
        .await
        .map_err(|e| VoleeoError::Storage(e.to_string()))?
}

#[tauri::command]
#[specta::specta]
pub async fn response_clear(
    state: State<'_, AppState>,
    workspace_id: String,
    request_id: String,
) -> Result<(), VoleeoError> {
    let store = state.responses.clone();
    tokio::task::spawn_blocking(move || store.clear(&workspace_id, &request_id))
        .await
        .map_err(|e| VoleeoError::Storage(e.to_string()))?
}

/// A line window of a large (windowed) response body. Off-thread per rule 17.
#[tauri::command]
#[specta::specta]
pub async fn response_body_window(
    state: State<'_, AppState>,
    workspace_id: String,
    response_id: String,
    start_line: u32,
    count: u32,
) -> Result<BodyWindow, VoleeoError> {
    let store = state.responses.clone();
    tokio::task::spawn_blocking(move || {
        store.body_window(&workspace_id, &response_id, start_line, count)
    })
    .await
    .map_err(|e| VoleeoError::Storage(e.to_string()))?
}

/// Search a windowed response body; returns capped `{line, col, len}` matches.
#[tauri::command]
#[specta::specta]
pub async fn response_body_search(
    state: State<'_, AppState>,
    workspace_id: String,
    response_id: String,
    query: String,
    opts: SearchOpts,
) -> Result<BodySearchResult, VoleeoError> {
    let store = state.responses.clone();
    tokio::task::spawn_blocking(move || {
        store.body_search(&workspace_id, &response_id, &query, &opts)
    })
    .await
    .map_err(|e| VoleeoError::Storage(e.to_string()))?
}

/// Apply a JSONPath query to a windowed body; returns a key to window/search the
/// filtered result (empty query clears it).
#[tauri::command]
#[specta::specta]
pub async fn response_body_filter(
    state: State<'_, AppState>,
    workspace_id: String,
    response_id: String,
    query: String,
) -> Result<BodyFilterResult, VoleeoError> {
    let store = state.responses.clone();
    tokio::task::spawn_blocking(move || store.body_filter(&workspace_id, &response_id, &query))
        .await
        .map_err(|e| VoleeoError::Storage(e.to_string()))?
}
