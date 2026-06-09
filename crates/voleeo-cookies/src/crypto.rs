//! Shared encrypt/decrypt helpers for cookie values. Both the Tauri command
//! layer (`src-tauri/src/commands/cookie.rs`) and the MCP backend
//! (`voleeo-mcp::api::cookie`) need to round-trip cookie values through
//! workspace encryption — keep the iteration / no-op rules in one home so the
//! two paths can never drift on which cookies get encrypted vs. left alone.
//!
//! The key is passed in as raw bytes — workspace lookup + `voleeo_crypto::load_key`
//! belong in the caller (they need `WorkspaceStore` + the app_data_dir, neither
//! of which this pure crate sees).

use voleeo_core::VoleeoError;

use crate::model::StoredCookie;

/// Decrypt every `value_encrypted: true` cookie in-place. Cookies whose value
/// is already plaintext (`!is_encrypted`) are left untouched so re-running the
/// transform is safe.
pub fn decrypt_values(cookies: &mut [StoredCookie], key: &[u8; 32]) -> Result<(), VoleeoError> {
    for c in cookies.iter_mut() {
        if c.value_encrypted && voleeo_crypto::is_encrypted(&c.value) {
            c.value = voleeo_crypto::decrypt(&c.value, key)?;
        }
    }
    Ok(())
}

/// Encrypt every `value_encrypted: true` cookie whose value is still
/// plaintext. Idempotent — already-encrypted values pass through untouched.
pub fn encrypt_values(cookies: &mut [StoredCookie], key: &[u8; 32]) -> Result<(), VoleeoError> {
    for c in cookies.iter_mut() {
        if c.value_encrypted && !voleeo_crypto::is_encrypted(&c.value) {
            c.value = voleeo_crypto::encrypt(&c.value, key)?;
        }
    }
    Ok(())
}

/// True if the jar has at least one cookie whose value is supposed to be
/// encrypted at rest. Callers gate the workspace-key load on this so a jar
/// with only plaintext cookies skips the keychain round-trip entirely.
pub fn jar_needs_key(cookies: &[StoredCookie]) -> bool {
    cookies.iter().any(|c| c.value_encrypted)
}
