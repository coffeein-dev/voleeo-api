use std::time::{Duration, Instant};
use voleeo_core::TimelineEvent;

pub(crate) fn fmt_dur_ms(ms: f64) -> String {
    if ms < 10.0 {
        format!("{ms:.2} ms")
    } else if ms < 100.0 {
        format!("{ms:.1} ms")
    } else {
        format!("{:.0} ms", ms.round())
    }
}

pub(crate) fn fmt_bytes(n: usize) -> String {
    if n < 1024 {
        format!("{n} B")
    } else if n < 1_048_576 {
        format!("{:.1} kB", n as f64 / 1024.0)
    } else {
        format!("{:.1} MB", n as f64 / 1_048_576.0)
    }
}

pub(crate) fn fmt_age(d: Duration) -> String {
    let ms = d.as_secs_f64() * 1000.0;
    if ms < 1_000.0 {
        format!("{} ms", ms.round() as u64)
    } else if ms < 60_000.0 {
        format!("{:.1} s", ms / 1_000.0)
    } else {
        format!("{} m", (ms / 60_000.0).round() as u64)
    }
}

pub(crate) fn push_event_at(
    events: &mut Vec<TimelineEvent>,
    at_ms: f64,
    kind: &str,
    text: impl Into<String>,
) {
    events.push(TimelineEvent {
        at_ms,
        kind: kind.into(),
        text: text.into(),
    });
}

pub(crate) fn push_event(
    events: &mut Vec<TimelineEvent>,
    started: Instant,
    kind: &str,
    text: impl Into<String>,
) {
    push_event_at(events, started.elapsed().as_secs_f64() * 1000.0, kind, text);
}

pub(crate) fn http_error_message(e: reqwest::Error) -> String {
    use std::error::Error as StdError;

    if e.is_builder() {
        let root = {
            let mut source: Option<&dyn StdError> = e.source();
            let mut deepest = source;
            while let Some(s) = source {
                deepest = Some(s);
                source = s.source();
            }
            deepest.map(|s| s.to_string())
        };
        return match root {
            Some(msg) => format!("Could not build request: {msg}"),
            None => "Could not build request — check that the URL is valid and all headers contain only printable ASCII characters".into(),
        };
    }

    if e.is_connect() {
        return format!("Connection refused or timed out: {e}");
    }

    if e.is_timeout() {
        return "Request timed out".into();
    }

    e.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fmt_dur_ms_ranges() {
        assert_eq!(fmt_dur_ms(5.123), "5.12 ms");
        assert_eq!(fmt_dur_ms(50.5), "50.5 ms");
        assert_eq!(fmt_dur_ms(150.0), "150 ms");
        assert_eq!(fmt_dur_ms(999.9), "1000 ms");
    }

    #[test]
    fn fmt_bytes_ranges() {
        assert_eq!(fmt_bytes(0), "0 B");
        assert_eq!(fmt_bytes(500), "500 B");
        assert_eq!(fmt_bytes(1023), "1023 B");
        assert_eq!(fmt_bytes(1024), "1.0 kB");
        assert_eq!(fmt_bytes(1_048_576), "1.0 MB");
        assert_eq!(fmt_bytes(2_097_152), "2.0 MB");
    }

    #[test]
    fn fmt_age_ranges() {
        assert_eq!(fmt_age(Duration::from_millis(500)), "500 ms");
        assert_eq!(fmt_age(Duration::from_secs(2)), "2.0 s");
        assert_eq!(fmt_age(Duration::from_secs(120)), "2 m");
    }
}
