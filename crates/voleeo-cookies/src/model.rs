//! Re-exports of the cookie domain model. The canonical types live in
//! `voleeo-core` so `HttpResponse.captured_cookies` and the storage layer can
//! reference them without depending on this crate.
pub use voleeo_core::{CookieJar, SameSite, StoredCookie};
