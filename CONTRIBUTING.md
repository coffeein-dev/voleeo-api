# Contributing to Voleeo

Thanks for your interest in Voleeo. This is a pre-release project, so expect things to move and break.

## Dev setup

Requires [Bun](https://bun.sh), a Rust toolchain, and **Node 24.15.0** (pinned in `.nvmrc`; run
`nvm use`). Tauri also needs your platform's webview/build dependencies — see the
[Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
nvm use
bun install
bun run dev        # Tauri + Vite HMR — both the Vite dev server and the Tauri window must run for IPC
```

## Quality gates

Before opening a PR, make sure all of these pass — CI runs the same set:

```bash
bun run typecheck
bun run lint               # biome; `bun run lint:fix` to auto-fix
bun run build              # production target ES2020
cargo fmt --all --check
cargo clippy --workspace
cargo check --workspace
cargo test --workspace
```

A pre-commit hook auto-fixes staged files with biome.

## Architecture & conventions

[`AGENTS.md`](AGENTS.md) is the source of truth for repository conventions, including:

- the workspace layout (`crates/` is pure Rust with zero Tauri deps; `src-tauri/` is the only
  assembly point; `src-web/` is the React/TypeScript frontend),
- the IPC / type-safety flow (`bun run codegen` regenerates `packages/types/bindings.ts` — never edit
  it by hand),
- file-size limits (250 lines for `.ts`/`.tsx` in `src-web/src/`, 500 for `.rs`),
- React render-loop and Zustand subscription rules, and
- Rust/Tauri command conventions.

Please read it before making non-trivial changes, and keep comments terse and load-bearing.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org) — releases are fully automatic,
and both the version bump and the release notes are derived from commit messages on `main`:

- `feat:` → minor release, listed under **Features**
- `fix:` → patch release, listed under **Bug Fixes**
- `perf:` → patch release, listed under **Performance**
- `feat!:` / `BREAKING CHANGE:` footer → major release (minor while pre-1.0)
- `chore:` / `docs:` / `ci:` / `refactor:` / `test:` → no release, not in notes

Write the subject as you'd want it to read in the release notes.

## Pull requests

- Keep PRs focused; split unrelated changes.
- Describe what changed and why; link any related issue.
- Ensure the quality gates above are green.

## Reporting bugs & requesting features

Open an issue using the templates in `.github/ISSUE_TEMPLATE/`. For security issues, follow
[SECURITY.md](SECURITY.md) instead of filing a public issue.
