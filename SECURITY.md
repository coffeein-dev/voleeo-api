# Security Policy

Voleeo handles sensitive data — request auth secrets, per-workspace AES-256-GCM encryption keys, and
OS keychain entries. We take security reports seriously.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Instead, report privately via GitHub's
[private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
on this repository (Security → Report a vulnerability).

Please include:

- a description of the issue and its impact,
- steps to reproduce or a proof of concept, and
- affected version/commit.

We'll acknowledge your report, investigate, and coordinate a fix and disclosure timeline with you.

## Scope

Of particular interest:

- key/secret handling (`voleeo-crypto`, keychain fallback key files, `secrets.json`),
- the MCP bridge auth and socket surface, and
- anything that could leak plaintext secrets or encryption keys to disk or over IPC.
