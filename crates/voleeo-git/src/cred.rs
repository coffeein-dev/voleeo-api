use git2::{Cred, CredentialType, Error, RemoteCallbacks, Repository};
use std::cell::Cell;

/// Auth callbacks shared by fetch/pull/push.
///
/// For HTTPS we use the caller-supplied `creds` (username + token) when present,
/// otherwise the system credential helper. For SSH we use the agent. We never
/// fall back to `Cred::default()`: libgit2 treats it as a passthrough (the
/// callback declining), which it then reports as the confusing "authentication
/// required but no callback set". Explicit errors surface actionable messages.
/// The attempt counter stops libgit2 looping forever on a rejected credential.
pub(crate) fn remote_callbacks(
    repo: &Repository,
    creds: Option<(String, String)>,
) -> RemoteCallbacks<'_> {
    let attempts = Cell::new(0u32);
    let mut cb = RemoteCallbacks::new();
    cb.credentials(move |url, username, allowed| {
        if attempts.get() >= 4 {
            return Err(Error::from_str(
                "Authentication failed — check the username/token in Git settings, your SSH agent, or credential helper",
            ));
        }
        attempts.set(attempts.get() + 1);

        if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) {
            if let Some((user, pass)) = &creds {
                return Cred::userpass_plaintext(user, pass);
            }
            let config = repo
                .config()
                .map_err(|_| Error::from_str("could not read git config"))?;
            return Cred::credential_helper(&config, url, username).map_err(|_| {
                Error::from_str(
                    "No credentials for this HTTPS remote — add a username and token in Git \
                     settings, or use the SSH remote URL",
                )
            });
        }
        if allowed.contains(CredentialType::SSH_KEY) {
            return Cred::ssh_key_from_agent(username.unwrap_or("git")).map_err(|_| {
                Error::from_str("SSH auth failed — add your key to ssh-agent (ssh-add), then retry")
            });
        }
        if allowed.contains(CredentialType::USERNAME) {
            return Cred::username(username.unwrap_or("git"));
        }
        Err(Error::from_str("Unsupported authentication method"))
    });
    // Per-ref push rejection (e.g. non-fast-forward) is reported ONLY here —
    // without this callback libgit2 can return Ok from `push` on a rejected ref,
    // so the push silently no-ops. Turn it into an actionable error.
    cb.push_update_reference(|_refname, status| match status {
        None => Ok(()),
        Some(msg) => {
            let m = msg.to_ascii_lowercase();
            // Non-fast-forward (the common "remote has newer changes") gets a
            // short, actionable message; other rejections keep the raw reason.
            let text = if m.contains("fast-forward")
                || m.contains("fast forward")
                || m.contains("fetch first")
            {
                "Can't push! Update first.".to_string()
            } else {
                format!("Remote rejected the push: {msg}")
            };
            Err(Error::from_str(&text))
        }
    });
    cb
}

/// Like `remote_callbacks` but with no repo yet (clone). Uses caller-supplied
/// `creds` (username + token) for HTTPS, else the global credential helper; SSH
/// uses the agent.
pub(crate) fn clone_callbacks(creds: Option<(String, String)>) -> RemoteCallbacks<'static> {
    let attempts = Cell::new(0u32);
    let mut cb = RemoteCallbacks::new();
    cb.credentials(move |url, username, allowed| {
        if attempts.get() >= 4 {
            return Err(Error::from_str(
                "Authentication failed — add your SSH key to ssh-agent, or enter a username and token",
            ));
        }
        attempts.set(attempts.get() + 1);

        if allowed.contains(CredentialType::USER_PASS_PLAINTEXT) {
            if let Some((user, pass)) = &creds {
                return Cred::userpass_plaintext(user, pass);
            }
            if let Ok(config) = git2::Config::open_default() {
                if let Ok(cred) = Cred::credential_helper(&config, url, username) {
                    return Ok(cred);
                }
            }
            return Err(Error::from_str(
                "No credentials for this HTTPS remote — enter a username and token, or clone via SSH",
            ));
        }
        if allowed.contains(CredentialType::SSH_KEY) {
            return Cred::ssh_key_from_agent(username.unwrap_or("git")).map_err(|_| {
                Error::from_str(
                    "SSH key not available — add it to ssh-agent (ssh-add), or enter a username + token to clone over HTTPS",
                )
            });
        }
        if allowed.contains(CredentialType::USERNAME) {
            return Cred::username(username.unwrap_or("git"));
        }
        Err(Error::from_str("Unsupported authentication method"))
    });
    cb
}
