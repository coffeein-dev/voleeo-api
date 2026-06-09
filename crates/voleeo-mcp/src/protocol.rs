use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JsonRpcRequest {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<Value>,
    pub method: String,
    #[serde(default)]
    pub params: Value,
}

#[derive(Serialize, Debug, Clone)]
pub struct JsonRpcResponse {
    pub jsonrpc: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<JsonRpcError>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct JsonRpcError {
    pub code: i32,
    pub message: String,
}

impl JsonRpcResponse {
    pub fn ok(id: Option<Value>, result: Value) -> Self {
        Self {
            jsonrpc: "2.0".into(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn err(id: Option<Value>, code: i32, message: impl Into<String>) -> Self {
        Self {
            jsonrpc: "2.0".into(),
            id,
            result: None,
            error: Some(JsonRpcError {
                code,
                message: message.into(),
            }),
        }
    }
}

/// An MCP tool definition surfaced in `tools/list`.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ToolDef {
    pub name: String,
    pub description: String,
    #[serde(rename = "inputSchema")]
    pub input_schema: Value,
}

/// Result of a `tools/call` invocation.
#[derive(Serialize, Debug)]
pub struct ToolResult {
    pub content: Vec<ContentItem>,
    #[serde(rename = "isError", skip_serializing_if = "Option::is_none")]
    pub is_error: Option<bool>,
}

#[derive(Serialize, Debug)]
pub struct ContentItem {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub text: String,
}

impl ToolResult {
    pub fn text(s: impl Into<String>) -> Self {
        Self {
            content: vec![ContentItem {
                kind: "text",
                text: s.into(),
            }],
            is_error: None,
        }
    }

    pub fn error(s: impl Into<String>) -> Self {
        Self {
            content: vec![ContentItem {
                kind: "text",
                text: s.into(),
            }],
            is_error: Some(true),
        }
    }

    pub fn json(v: &impl Serialize) -> Self {
        match serde_json::to_string_pretty(v) {
            Ok(s) => Self::text(s),
            Err(e) => Self::error(e.to_string()),
        }
    }
}

/// Helper: build a JSON Schema for `object` with the given required + optional properties.
pub fn obj_schema(required: &[(&str, &str, Value)], optional: &[(&str, &str, Value)]) -> Value {
    let mut props = serde_json::Map::new();
    let mut req_names: Vec<Value> = Vec::new();

    for (name, desc, schema) in required {
        let mut prop = schema.as_object().cloned().unwrap_or_default();
        prop.insert("description".into(), Value::String(desc.to_string()));
        props.insert(name.to_string(), Value::Object(prop));
        req_names.push(Value::String(name.to_string()));
    }
    for (name, desc, schema) in optional {
        let mut prop = schema.as_object().cloned().unwrap_or_default();
        prop.insert("description".into(), Value::String(desc.to_string()));
        props.insert(name.to_string(), Value::Object(prop));
    }

    serde_json::json!({
        "type": "object",
        "properties": props,
        "required": req_names,
    })
}

pub fn str_schema() -> Value {
    serde_json::json!({ "type": "string" })
}

pub fn num_schema() -> Value {
    serde_json::json!({ "type": "number" })
}

pub fn bool_schema() -> Value {
    serde_json::json!({ "type": "boolean" })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tool_result_text_has_no_error_flag() {
        let r = ToolResult::text("hello");
        assert!(r.is_error.is_none());
        assert_eq!(r.content.len(), 1);
        assert_eq!(r.content[0].text, "hello");
        assert_eq!(r.content[0].kind, "text");
    }

    #[test]
    fn tool_result_error_sets_is_error() {
        let r = ToolResult::error("bad thing");
        assert_eq!(r.is_error, Some(true));
        assert_eq!(r.content[0].text, "bad thing");
    }

    #[test]
    fn tool_result_json_serializes_pretty() {
        let v = serde_json::json!({ "ok": true });
        let r = ToolResult::json(&v);
        assert!(r.is_error.is_none());
        // Pretty-printed JSON contains newlines.
        assert!(r.content[0].text.contains('\n'));
        assert!(r.content[0].text.contains("\"ok\""));
    }

    #[test]
    fn json_rpc_response_ok_sets_result_clears_error() {
        let resp = JsonRpcResponse::ok(Some(Value::from(1)), serde_json::json!("pong"));
        assert!(resp.result.is_some());
        assert!(resp.error.is_none());
        assert_eq!(resp.jsonrpc, "2.0");
    }

    #[test]
    fn json_rpc_response_err_sets_error_clears_result() {
        let resp = JsonRpcResponse::err(Some(Value::from(2)), -32600, "Invalid Request");
        assert!(resp.result.is_none());
        let err = resp.error.unwrap();
        assert_eq!(err.code, -32600);
        assert_eq!(err.message, "Invalid Request");
    }

    #[test]
    fn obj_schema_required_fields_in_required_array() {
        let schema = obj_schema(
            &[("name", "A name", str_schema())],
            &[("color", "A color", str_schema())],
        );
        let required = schema["required"].as_array().unwrap();
        let req_names: Vec<&str> = required.iter().map(|v| v.as_str().unwrap()).collect();
        assert!(
            req_names.contains(&"name"),
            "required field must be in required array"
        );
        assert!(
            !req_names.contains(&"color"),
            "optional field must not be in required array"
        );
    }

    #[test]
    fn obj_schema_descriptions_written_to_properties() {
        let schema = obj_schema(&[("id", "The ID", str_schema())], &[]);
        assert_eq!(schema["properties"]["id"]["description"], "The ID");
        assert_eq!(schema["properties"]["id"]["type"], "string");
    }
}
