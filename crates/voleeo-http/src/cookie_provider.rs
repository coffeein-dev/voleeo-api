//! Bridges reqwest's `cookie_provider` to the task-local jars set up in
//! `HttpExecutor::send`. Reqwest calls into the provider synchronously while
//! polling the send future, so the task-locals from the outer `.scope` are
//! visible inside both `set_cookies` (capture) and `cookies` (attach), which
//! lets us capture `Set-Cookie` on intermediate redirect responses before the
//! follow happens.

use reqwest::cookie::CookieStore;
use reqwest::header::HeaderValue;
use reqwest::Url;

use crate::{ATTACHED_SINK, ATTACH_COOKIES, CAPTURE_SINK};

pub(crate) struct TaskLocalCookieJar;

impl CookieStore for TaskLocalCookieJar {
    fn set_cookies(&self, cookie_headers: &mut dyn Iterator<Item = &HeaderValue>, url: &Url) {
        let _ = CAPTURE_SINK.try_with(|sink| {
            let now = chrono::Utc::now();
            for hv in cookie_headers {
                if let Ok(s) = hv.to_str() {
                    if let Ok(mut guard) = sink.lock() {
                        let _ =
                            voleeo_cookies::matching::ingest_set_cookie(&mut guard, s, url, now);
                    }
                }
            }
        });
    }

    fn cookies(&self, url: &Url) -> Option<HeaderValue> {
        ATTACH_COOKIES
            .try_with(|cookies| {
                let now = chrono::Utc::now();
                let matched = voleeo_cookies::matching::matching(cookies, url, now);
                if matched.is_empty() {
                    return None;
                }
                // Record what we attached on this hop so the Response > Cookies
                // tab can show what was actually sent. The matched list can
                // differ per hop on a cross-origin redirect; dedupe by id so a
                // cookie surviving multiple hops isn't double-counted.
                let _ = ATTACHED_SINK.try_with(|sink| {
                    if let Ok(mut guard) = sink.lock() {
                        for c in &matched {
                            if !guard.iter().any(|e| e.id == c.id) {
                                guard.push((*c).clone());
                            }
                        }
                    }
                });
                HeaderValue::from_str(&voleeo_cookies::matching::format_cookie_header(&matched))
                    .ok()
            })
            .ok()
            .flatten()
    }
}
