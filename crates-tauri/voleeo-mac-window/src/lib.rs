#[cfg(target_os = "macos")]
mod mac;

use tauri::{plugin, plugin::TauriPlugin, Runtime};

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    let mut builder = plugin::Builder::new("voleeo-mac-window");

    #[cfg(target_os = "macos")]
    {
        builder = builder.on_window_ready(|window| {
            let label = window.label();
            if label == "main" || label.starts_with("ws-") {
                mac::setup_traffic_light_positioner(&window);
            }
        });
    }

    builder.build()
}
