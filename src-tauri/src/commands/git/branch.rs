//! Branch listing, checkout, create, and rename.

use super::{notify, path_of, run};
use crate::state::AppState;
use tauri::State;
use voleeo_core::{GitBranch, VoleeoError};

#[tauri::command]
#[specta::specta]
pub async fn git_branches(
    state: State<'_, AppState>,
    workspace_id: String,
) -> Result<Vec<GitBranch>, VoleeoError> {
    let dir = path_of(&state, &workspace_id);
    run(move || voleeo_git::branches(&dir)).await
}

#[tauri::command]
#[specta::specta]
pub async fn git_checkout(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    workspace_id: String,
    branch: String,
) -> Result<(), VoleeoError> {
    let dir = path_of(&state, &workspace_id);
    run(move || voleeo_git::checkout_branch(&dir, &branch)).await?;
    notify(&app, workspace_id);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn git_create_branch(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    workspace_id: String,
    name: String,
) -> Result<(), VoleeoError> {
    let dir = path_of(&state, &workspace_id);
    run(move || voleeo_git::create_branch(&dir, &name)).await?;
    notify(&app, workspace_id);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn git_rename_branch(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    workspace_id: String,
    old_name: String,
    new_name: String,
) -> Result<(), VoleeoError> {
    let dir = path_of(&state, &workspace_id);
    run(move || voleeo_git::rename_branch(&dir, &old_name, &new_name)).await?;
    notify(&app, workspace_id);
    Ok(())
}
