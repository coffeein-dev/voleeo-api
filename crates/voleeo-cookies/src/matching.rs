//! RFC 6265 storage and matching primitives. Operate on borrowed cookie slices
//! so the storage layer keeps full ownership; the HTTP executor only ever needs
//! a read view of the active jar plus a writable sink for captured cookies.

use chrono::{DateTime, Utc};
use cookie::{Cookie, SameSite as CookieSameSite};
use url::Url;
use voleeo_core::new_id;

use crate::model::{SameSite, StoredCookie};

/// Returns the cookies that should be sent on a request to `url` at `now`,
/// in the order produced by RFC 6265 §5.4 (longer paths first, then by
/// creation time). Caller serializes them into a single `Cookie:` header.
pub fn matching<'a>(
    cookies: &'a [StoredCookie],
    url: &Url,
    now: DateTime<Utc>,
) -> Vec<&'a StoredCookie> {
    let host = match url.host_str() {
        Some(h) => h.to_ascii_lowercase(),
        None => return Vec::new(),
    };
    let request_path = if url.path().is_empty() {
        "/"
    } else {
        url.path()
    };
    let is_https = url.scheme().eq_ignore_ascii_case("https");

    let mut matched: Vec<&StoredCookie> = cookies
        .iter()
        .filter(|c| {
            if c.secure && !is_https {
                return false;
            }
            if let Some(exp) = parse_expiry(&c.expires)
                && exp <= now
            {
                return false;
            }
            if !domain_match(&c.domain, &host, c.host_only) {
                return false;
            }
            path_match(&c.path, request_path)
        })
        .collect();

    matched.sort_by(|a, b| {
        b.path
            .len()
            .cmp(&a.path.len())
            .then_with(|| a.created_at.cmp(&b.created_at))
    });
    matched
}

/// Format a cookie list into the value of a single `Cookie:` request header.
pub fn format_cookie_header(cookies: &[&StoredCookie]) -> String {
    cookies
        .iter()
        .map(|c| format!("{}={}", c.name, c.value))
        .collect::<Vec<_>>()
        .join("; ")
}

/// Parse a single `Set-Cookie` header value and upsert it into `cookies`
/// per RFC 6265 §5.3. Returns the new/updated entry, or `None` if the
/// header was invalid or the cookie was rejected (e.g. `Secure` on http,
/// `Domain` that does not domain-match the request URI).
pub fn ingest_set_cookie(
    cookies: &mut Vec<StoredCookie>,
    header_value: &str,
    request_url: &Url,
    now: DateTime<Utc>,
) -> Option<StoredCookie> {
    let parsed = Cookie::parse(header_value.to_string()).ok()?;
    let name = parsed.name().trim();
    if name.is_empty() {
        return None;
    }

    let request_host = request_url.host_str()?.to_ascii_lowercase();
    let is_https = request_url.scheme().eq_ignore_ascii_case("https");

    // §5.3.5: Domain handling. No Domain attr ⇒ host-only with request host.
    let (domain, host_only) = match parsed.domain() {
        Some(d) => {
            let d = d.trim_start_matches('.').to_ascii_lowercase();
            if d.is_empty() {
                (request_host.clone(), true)
            } else if !domain_match(&d, &request_host, false) {
                // Server tried to set a cookie for a domain that doesn't cover
                // the request host (or it's an IP).
                return None;
            } else {
                (d, false)
            }
        }
        None => (request_host.clone(), true),
    };

    // §5.1.4: Default path is the URI's directory.
    let path = match parsed.path() {
        Some(p) if p.starts_with('/') => p.to_string(),
        _ => default_path(request_url.path()),
    };

    let secure = parsed.secure().unwrap_or(false);
    if secure && !is_https {
        return None;
    }

    let http_only = parsed.http_only().unwrap_or(false);
    let same_site = parsed.same_site().map(convert_same_site);

    let expires: Option<String> = if let Some(max_age) = parsed.max_age() {
        let secs = max_age.whole_seconds();
        let when = if secs <= 0 {
            // Max-Age <= 0 is an immediate expiry per spec.
            now - chrono::Duration::seconds(1)
        } else {
            now + chrono::Duration::seconds(secs)
        };
        Some(when.to_rfc3339())
    } else {
        parsed.expires().and_then(|e| e.datetime()).and_then(|odt| {
            DateTime::<Utc>::from_timestamp(odt.unix_timestamp(), 0).map(|dt| dt.to_rfc3339())
        })
    };

    let value = parsed.value().to_string();
    let now_str = now.to_rfc3339();

    // §5.3.11: upsert by (canonicalized-domain, path, name) — single home
    // for this key in `matches_identity`, also reused by the editor save path.
    let pos = cookies
        .iter()
        .position(|c| matches_identity(c, &domain, &path, name));

    if let Some(idx) = pos {
        let existing = &mut cookies[idx];
        existing.value = value;
        existing.host_only = host_only;
        existing.secure = secure;
        existing.http_only = http_only;
        existing.same_site = same_site;
        existing.expires = expires;
        existing.updated_at = now_str;
        return Some(existing.clone());
    }

    let cookie = StoredCookie {
        id: format!("ck_{}", new_id()),
        domain,
        host_only,
        path,
        name: name.to_string(),
        value,
        value_encrypted: false,
        secure,
        http_only,
        same_site,
        expires,
        created_at: now_str.clone(),
        updated_at: now_str,
    };
    cookies.push(cookie.clone());
    Some(cookie)
}

/// RFC 6265 §5.3.11 cookie identity — the upsert key shared by every code
/// path that has to merge a fresh cookie into an existing jar (Set-Cookie
/// ingest, user-side editor save, MCP imports, …). Defined here so the
/// definition (case-insensitive domain, exact path + name) has exactly one
/// home. Takes field refs rather than a `&StoredCookie` so the comparison
/// works even mid-construction (e.g. inside `ingest_set_cookie`, which has
/// the parsed values before building the struct).
pub fn matches_identity(c: &StoredCookie, domain: &str, path: &str, name: &str) -> bool {
    c.domain.eq_ignore_ascii_case(domain) && c.path == path && c.name == name
}

/// Pair-shape convenience for callers that already have two cookies.
pub fn same_identity(a: &StoredCookie, b: &StoredCookie) -> bool {
    matches_identity(a, &b.domain, &b.path, &b.name)
}

/// Removes cookies whose `expires` is in the past. Returns the number pruned.
pub fn prune_expired(cookies: &mut Vec<StoredCookie>, now: DateTime<Utc>) -> usize {
    let before = cookies.len();
    cookies.retain(|c| match parse_expiry(&c.expires) {
        Some(exp) => exp > now,
        None => true,
    });
    before - cookies.len()
}

fn parse_expiry(s: &Option<String>) -> Option<DateTime<Utc>> {
    s.as_deref()
        .and_then(|raw| DateTime::parse_from_rfc3339(raw).ok())
        .map(|dt| dt.with_timezone(&Utc))
}

fn convert_same_site(ss: CookieSameSite) -> SameSite {
    match ss {
        CookieSameSite::Strict => SameSite::Strict,
        CookieSameSite::Lax => SameSite::Lax,
        CookieSameSite::None => SameSite::None,
    }
}

/// RFC 6265 §5.1.3 domain matching. `host_only` short-circuits to exact match.
fn domain_match(cookie_domain: &str, request_host: &str, host_only: bool) -> bool {
    let cd = cookie_domain.trim_start_matches('.').to_ascii_lowercase();
    let rh = request_host.to_ascii_lowercase();
    if cd == rh {
        return true;
    }
    if host_only {
        return false;
    }
    if is_ip_literal(&rh) {
        return false;
    }
    rh.ends_with(&cd) && rh.as_bytes()[rh.len() - cd.len() - 1] == b'.'
}

fn is_ip_literal(host: &str) -> bool {
    host.parse::<std::net::IpAddr>().is_ok() || (host.starts_with('[') && host.ends_with(']'))
}

/// RFC 6265 §5.1.4 path matching.
fn path_match(cookie_path: &str, request_path: &str) -> bool {
    if cookie_path == request_path {
        return true;
    }
    if !request_path.starts_with(cookie_path) {
        return false;
    }
    cookie_path.ends_with('/') || request_path.as_bytes().get(cookie_path.len()) == Some(&b'/')
}

/// RFC 6265 §5.1.4 default-path algorithm.
fn default_path(uri_path: &str) -> String {
    if !uri_path.starts_with('/') {
        return "/".to_string();
    }
    let last_slash = uri_path.rfind('/').unwrap_or(0);
    if last_slash == 0 {
        return "/".to_string();
    }
    uri_path[..last_slash].to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(u: &str) -> Url {
        Url::parse(u).unwrap()
    }

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-01-01T00:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    #[test]
    fn domain_match_exact() {
        assert!(domain_match("api.example.com", "api.example.com", true));
        assert!(domain_match("api.example.com", "api.example.com", false));
    }

    #[test]
    fn domain_match_subdomain_only_when_not_host_only() {
        assert!(!domain_match("example.com", "api.example.com", true));
        assert!(domain_match("example.com", "api.example.com", false));
    }

    #[test]
    fn domain_match_rejects_partial_label() {
        assert!(!domain_match("ample.com", "example.com", false));
    }

    #[test]
    fn domain_match_ip_only_exact() {
        // Request host is an IP literal — suffix-matching is disabled, so
        // a cookie with domain "1.2.3.4" must match exactly.
        assert!(domain_match("192.168.1.1", "192.168.1.1", false));
        assert!(!domain_match("168.1.1", "192.168.1.1", false));
    }

    #[test]
    fn path_match_works() {
        assert!(path_match("/", "/"));
        assert!(path_match("/", "/foo"));
        assert!(path_match("/foo", "/foo"));
        assert!(path_match("/foo", "/foo/bar"));
        assert!(path_match("/foo/", "/foo/bar"));
        assert!(!path_match("/foo", "/foobar"));
        assert!(!path_match("/foo/bar", "/foo"));
    }

    #[test]
    fn default_path_uses_directory() {
        assert_eq!(default_path("/"), "/");
        assert_eq!(default_path("/foo"), "/");
        assert_eq!(default_path("/foo/bar"), "/foo");
        assert_eq!(default_path("/foo/bar/"), "/foo/bar");
        assert_eq!(default_path(""), "/");
    }

    #[test]
    fn ingest_host_only_no_domain_attr() {
        let mut jar = Vec::new();
        let c = ingest_set_cookie(
            &mut jar,
            "session=abc",
            &parse("https://api.example.com/v1"),
            now(),
        )
        .unwrap();
        assert_eq!(c.domain, "api.example.com");
        assert!(c.host_only);
        assert_eq!(c.path, "/");
        assert_eq!(c.value, "abc");
    }

    #[test]
    fn ingest_with_domain_attr_clears_host_only() {
        let mut jar = Vec::new();
        let c = ingest_set_cookie(
            &mut jar,
            "session=abc; Domain=example.com; Path=/api",
            &parse("https://api.example.com/v1/foo"),
            now(),
        )
        .unwrap();
        assert_eq!(c.domain, "example.com");
        assert!(!c.host_only);
        assert_eq!(c.path, "/api");
    }

    #[test]
    fn ingest_rejects_unrelated_domain() {
        let mut jar = Vec::new();
        let c = ingest_set_cookie(
            &mut jar,
            "session=abc; Domain=other.com",
            &parse("https://api.example.com/"),
            now(),
        );
        assert!(c.is_none());
    }

    #[test]
    fn ingest_rejects_secure_on_http() {
        let mut jar = Vec::new();
        let c = ingest_set_cookie(
            &mut jar,
            "session=abc; Secure",
            &parse("http://example.com/"),
            now(),
        );
        assert!(c.is_none());
    }

    #[test]
    fn ingest_with_max_age_sets_expiry() {
        let mut jar = Vec::new();
        let c = ingest_set_cookie(
            &mut jar,
            "a=1; Max-Age=3600",
            &parse("https://example.com/"),
            now(),
        )
        .unwrap();
        let exp = parse_expiry(&c.expires).unwrap();
        assert!(exp > now());
    }

    #[test]
    fn ingest_upsert_replaces_existing() {
        let mut jar = Vec::new();
        ingest_set_cookie(&mut jar, "k=v1", &parse("https://example.com/"), now()).unwrap();
        ingest_set_cookie(&mut jar, "k=v2", &parse("https://example.com/"), now()).unwrap();
        assert_eq!(jar.len(), 1);
        assert_eq!(jar[0].value, "v2");
    }

    #[test]
    fn matching_filters_by_domain_and_path() {
        let mut jar = Vec::new();
        ingest_set_cookie(&mut jar, "a=1", &parse("https://api.example.com/"), now());
        ingest_set_cookie(
            &mut jar,
            "b=2; Path=/api",
            &parse("https://api.example.com/"),
            now(),
        );
        ingest_set_cookie(&mut jar, "c=3", &parse("https://other.com/"), now());

        let m = matching(&jar, &parse("https://api.example.com/api/users"), now());
        let names: Vec<&str> = m.iter().map(|c| c.name.as_str()).collect();
        // longer path first
        assert_eq!(names, vec!["b", "a"]);
    }

    #[test]
    fn matching_filters_expired() {
        let mut jar = Vec::new();
        ingest_set_cookie(
            &mut jar,
            "a=1; Max-Age=-1",
            &parse("https://example.com/"),
            now(),
        );
        assert!(matching(&jar, &parse("https://example.com/"), now()).is_empty());
    }

    #[test]
    fn matching_filters_secure_on_http() {
        let mut jar = Vec::new();
        ingest_set_cookie(
            &mut jar,
            "a=1; Secure",
            &parse("https://example.com/"),
            now(),
        );
        assert!(matching(&jar, &parse("http://example.com/"), now()).is_empty());
        assert_eq!(
            matching(&jar, &parse("https://example.com/"), now()).len(),
            1
        );
    }

    #[test]
    fn format_cookie_header_joins() {
        let now = now();
        let c1 = StoredCookie {
            id: "1".into(),
            domain: "x".into(),
            host_only: true,
            path: "/".into(),
            name: "a".into(),
            value: "1".into(),
            value_encrypted: false,
            secure: false,
            http_only: false,
            same_site: None,
            expires: None,
            created_at: now.to_rfc3339(),
            updated_at: now.to_rfc3339(),
        };
        let mut c2 = c1.clone();
        c2.name = "b".into();
        c2.value = "2".into();
        assert_eq!(format_cookie_header(&[&c1, &c2]), "a=1; b=2");
    }
}
