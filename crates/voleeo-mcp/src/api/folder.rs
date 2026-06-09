use super::ApiBackend;
use crate::protocol::ToolResult;
use serde_json::Value;

impl ApiBackend {
    pub(super) fn folder_create(&self, args: &Value) -> ToolResult {
        let ws_id = require!(args, "workspaceId");
        let name = require!(args, "name");
        let folder_id = args["folderId"].as_str().map(str::to_string);
        match self.requests.create_folder(ws_id.clone(), folder_id, name) {
            Ok(f) => {
                self.notify_requests(&ws_id);
                ToolResult::json(&f)
            }
            Err(e) => ToolResult::error(e.to_string()),
        }
    }

    pub(super) fn folder_rename(&self, args: &Value) -> ToolResult {
        let ws_id = require!(args, "workspaceId");
        let folder_id = require!(args, "folderId");
        let name = require!(args, "name");
        match self.requests.rename_folder(&ws_id, &folder_id, name) {
            Ok(()) => {
                self.notify_requests(&ws_id);
                ToolResult::text("Renamed")
            }
            Err(e) => ToolResult::error(e.to_string()),
        }
    }
}
