//! Custom DNS resolver for reqwest that consults the per-workspace overrides
//! task-local first and falls back to the system resolver. The resolver is
//! registered once on the shared client; overrides are scoped per-send via
//! the `DNS_OVERRIDES` task-local, so a workspace's overrides only affect
//! that workspace's requests.

use crate::DNS_OVERRIDES;
use reqwest::dns::{Addrs, Name, Resolve, Resolving};
use std::net::SocketAddr;

pub(crate) struct TaskLocalResolver;

impl Resolve for TaskLocalResolver {
    fn resolve(&self, name: Name) -> Resolving {
        let host = name.as_str().to_ascii_lowercase();
        let overrides = DNS_OVERRIDES
            .try_with(|o| o.clone())
            .unwrap_or_else(|_| std::sync::Arc::new(Vec::new()));

        Box::pin(async move {
            if let Some(ip) = overrides
                .iter()
                .find(|(h, _)| h == &host)
                .map(|(_, ip)| *ip)
            {
                let addrs: Addrs = Box::new(std::iter::once(SocketAddr::new(ip, 0)));
                return Ok(addrs);
            }

            let collected: Vec<SocketAddr> = tokio::net::lookup_host((host.as_str(), 0u16))
                .await
                .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { Box::new(e) })?
                .collect();
            let addrs: Addrs = Box::new(collected.into_iter());
            Ok(addrs)
        })
    }
}
