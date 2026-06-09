use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Type, Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SameSite {
    Strict,
    Lax,
    None,
}

/// A single cookie. `value` is plaintext over IPC; the Tauri command layer
/// transforms it to ciphertext when `value_encrypted` is true and the workspace
/// is encrypted (mirrors `transform_auth_secrets` for request auth).
///
/// `(domain, path, name)` is the uniqueness key per RFC 6265 §5.3.
#[derive(Type, Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoredCookie {
    pub id: String,
    pub domain: String,
    /// When true, only the exact `domain` matches (cookie was set without an
    /// explicit `Domain=` attribute). When false, subdomains also match.
    #[serde(default)]
    pub host_only: bool,
    pub path: String,
    pub name: String,
    pub value: String,
    #[serde(default)]
    pub value_encrypted: bool,
    #[serde(default)]
    pub secure: bool,
    #[serde(default)]
    pub http_only: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub same_site: Option<SameSite>,
    /// RFC 3339 UTC. `None` ⇒ session cookie (kept across app restarts here —
    /// users want to keep sessions around between sends).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub expires: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Type, Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CookieJar {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    #[serde(default)]
    pub cookies: Vec<StoredCookie>,
    pub created_at: String,
    pub updated_at: String,
}
