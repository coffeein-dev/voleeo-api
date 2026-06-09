use super::ApiBackend;
use crate::protocol::ToolResult;
use serde_json::Value;

impl ApiBackend {
    pub(super) fn workspace_list(&self) -> ToolResult {
        match self.workspaces.list() {
            Ok(ws) => ToolResult::json(&ws),
            Err(e) => ToolResult::error(e.to_string()),
        }
    }

    pub(super) fn workspace_create(&self, args: &Value) -> ToolResult {
        let name = require!(args, "name");
        let encrypted = args["encrypted"].as_bool().unwrap_or(false);
        match self.workspaces.create(name, encrypted) {
            Ok(ws) => ToolResult::json(&ws),
            Err(e) => ToolResult::error(e.to_string()),
        }
    }
}
