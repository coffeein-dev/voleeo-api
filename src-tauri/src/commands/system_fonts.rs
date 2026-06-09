use std::collections::BTreeSet;

use font_kit::source::SystemSource;
use voleeo_core::error::VoleeoError;

/// Enumerate installed font families on the system. Names are deduplicated and
/// returned in alphabetical order. Runs the (potentially slow) catalog scan on
/// a blocking pool so the Tauri runtime stays responsive.
#[tauri::command]
#[specta::specta]
pub async fn list_system_fonts() -> Result<Vec<String>, VoleeoError> {
    tokio::task::spawn_blocking(|| {
        let source = SystemSource::new();
        let mut families: BTreeSet<String> = source
            .all_families()
            .map_err(|e| VoleeoError::InvalidConfig(format!("font enumeration failed: {e}")))?
            .into_iter()
            // Hidden/system fonts on macOS are prefixed with `.` (e.g.
            // `.AppleSystemUIFont`); skip them so the dropdown is clean.
            .filter(|name| !name.starts_with('.'))
            .collect();
        // Some systems also return blank entries; drop them.
        families.retain(|s| !s.trim().is_empty());
        Ok(families.into_iter().collect())
    })
    .await
    .map_err(|e| VoleeoError::InvalidConfig(format!("font enumeration join error: {e}")))?
}
