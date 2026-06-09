// Builds the voleeo-mcp-bridge sidecar for the Tauri build's target triple and
// places it where externalBin expects it: binaries/voleeo-mcp-bridge-<triple>[.exe].
//
// Runs from beforeBuildCommand on every OS (replaces the old POSIX-only shell).
// TAURI_CONFIG clears externalBin so building the sidecar doesn't trigger the app's
// own resource check (the sidecar lives in the same crate as the app). The target
// comes from VOLEEO_TARGET (set per-matrix in CI); locally it falls back to the host.

import { execFileSync } from "node:child_process"
import { copyFileSync, mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join, resolve } from "node:path"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

const hostTriple = () => {
  const out = execFileSync("rustc", ["-vV"], { encoding: "utf8" })
  const line = out.split("\n").find((l) => l.startsWith("host: "))
  if (!line) throw new Error("could not determine host triple from `rustc -vV`")
  return line.slice("host: ".length).trim()
}

const target = process.env.VOLEEO_TARGET?.trim() || hostTriple()
const exe = target.includes("windows") ? ".exe" : ""

execFileSync(
  "cargo",
  ["build", "--release", "--bin", "voleeo-mcp-bridge", "--target", target],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, TAURI_CONFIG: '{"bundle":{"externalBin":[]}}' },
  },
)

const binDir = join(root, "src-tauri", "binaries")
mkdirSync(binDir, { recursive: true })
copyFileSync(
  join(root, "target", target, "release", `voleeo-mcp-bridge${exe}`),
  join(binDir, `voleeo-mcp-bridge-${target}${exe}`),
)
