//! Commit log and per-commit entity changes for the read-only history viewer.

use super::entity::blobs_to_changes;
use super::{notify, path_of, run};
use crate::commands::request::Stores;
use crate::state::AppState;
use tauri::State;
use voleeo_core::{GitCommit, GitEntityChange, VoleeoError};

#[tauri::command]
#[specta::specta]
pub async fn git_log(
    state: State<'_, AppState>,
    workspace_id: String,
    limit: u32,
) -> Result<Vec<GitCommit>, VoleeoError> {
    let dir = path_of(&state, &workspace_id);
    run(move || voleeo_git::log(&dir, limit as usize)).await
}

#[tauri::command]
#[specta::specta]
pub async fn git_log_for_path(
    state: State<'_, AppState>,
    workspace_id: String,
    path: String,
    limit: u32,
) -> Result<Vec<GitCommit>, VoleeoError> {
    let dir = path_of(&state, &workspace_id);
    run(move || voleeo_git::log_for_path(&dir, &path, limit as usize)).await
}

/// The decrypted entity changes a single commit introduced (vs its parent) —
/// powers the read-only history viewer.
#[tauri::command]
#[specta::specta]
pub async fn git_commit_changes(
    state: State<'_, AppState>,
    workspace_id: String,
    commit_id: String,
) -> Result<Vec<GitEntityChange>, VoleeoError> {
    let dir = path_of(&state, &workspace_id);
    let blobs = run(move || voleeo_git::commit_blobs(&dir, &commit_id)).await?;
    blobs_to_changes(blobs, &workspace_id, &Stores::from(&state))
}

/// Revert a commit by writing the pre-commit version of its files into the
/// working tree (unstaged) for the user to review and publish. `path` scopes the
/// revert to a single entity (per-file history); `None` reverts the whole commit.
#[tauri::command]
#[specta::specta]
pub async fn git_revert_commit(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    workspace_id: String,
    commit_id: String,
    path: Option<String>,
) -> Result<(), VoleeoError> {
    let dir = path_of(&state, &workspace_id);
    run(move || voleeo_git::revert_commit_files(&dir, &commit_id, path.as_deref())).await?;
    notify(&app, workspace_id);
    Ok(())
}
