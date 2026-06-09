import type { WorkspaceSettings } from "../../../packages/types/bindings"
import { commands } from "../../../packages/types/bindings"

export type { WorkspaceSettings }

// Module-level cache — populated once at startup via loadAllSettings(), then
// kept current by patchSettings(). All reads are synchronous; saves are
// fire-and-forget IPC calls so they never block the UI.
const cache = new Map<string, WorkspaceSettings>()

export function getCachedSettings(wsId: string): WorkspaceSettings {
  return cache.get(wsId) ?? {}
}

/** Merge `patch` into the cached entry and persist the merged result to disk. */
export function patchSettings(wsId: string, patch: WorkspaceSettings): void {
  const merged: WorkspaceSettings = { ...cache.get(wsId), ...patch }
  cache.set(wsId, merged)
  commands.workspaceSaveSettings(wsId, merged).catch(() => {})
}

/** Populate the cache from disk in one shot. Call this at app startup. */
export async function loadAllSettings(): Promise<void> {
  const res = await commands.workspaceListSettings().catch(() => null)
  if (!res || res.status !== "ok") return
  for (const [id, s] of Object.entries(res.data)) {
    cache.set(id, s)
  }
}
