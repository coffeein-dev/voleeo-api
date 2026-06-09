use std::path::PathBuf;
use std::sync::Arc;

use tauri::Emitter;
use voleeo_mcp::ApiBackend;

use crate::state::AppState;

/// Spawn the MCP Unix socket server as a background task.
/// The task runs for the lifetime of the app.
pub fn spawn(app: &tauri::AppHandle, state: &AppState, socket_path: PathBuf) {
    // The notify callback emits Tauri events to all windows so the UI
    // reacts to MCP mutations immediately — no restart or workspace switch needed.
    let app_handle = app.clone();
    let notify = Arc::new(move |event: &str, payload: serde_json::Value| {
        let _ = app_handle.emit(event, payload);
    });

    let backend = Arc::new(ApiBackend {
        workspaces: state.workspaces.clone(),
        requests: state.requests.clone(),
        environments: state.environments.clone(),
        cookies: state.cookies.clone(),
        responses: state.responses.clone(),
        selections: state.selections.clone(),
        ws: state.ws.clone(),
        ws_transcripts: state.ws_transcripts.clone(),
        executor: state.executor.clone(),
        ws_manager: state.ws_manager.clone(),
        notify,
        app_data_dir: state.app_data_dir.clone(),
    });
    let token = state.mcp_token.clone();
    let enabled = state.mcp_enabled.clone();

    tauri::async_runtime::spawn(async move {
        loop {
            // The server always runs; `enabled` is checked per-request so that
            // connected MCP clients receive a clear "bridge disabled" error
            // instead of a connection-refused that causes infinite retry loops.
            voleeo_mcp::run_server(
                socket_path.clone(),
                backend.clone(),
                token.clone(),
                enabled.clone(),
            )
            .await;

            eprintln!("[mcp] server exited unexpectedly — restarting in 1s");
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
    });
}

/// Platform-specific default socket path inside app_data_dir.
pub fn socket_path(app_data_dir: &std::path::Path) -> PathBuf {
    app_data_dir.join("mcp.sock")
}
