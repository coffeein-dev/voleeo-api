import type {
  ApiFolder,
  EnvironmentVariable,
} from "../../../packages/types/bindings"

/** Walk ancestors rootmost→nearest. Cycle-safe; stops on first missing parent. */
export function ancestorChainRootFirst(
  startFolderId: string | null | undefined,
  folders: ApiFolder[],
): ApiFolder[] {
  const chain: ApiFolder[] = []
  const seen = new Set<string>()
  let current = startFolderId ?? null
  while (current && !seen.has(current)) {
    seen.add(current)
    const folder = folders.find((f) => f.id === current)
    if (!folder) break
    chain.push(folder)
    current = folder.folderId ?? null
  }
  return chain.reverse()
}

/** The nearest folder (the given one or an ancestor) that defines an enabled
 *  variable named `key`, or null. Mirrors send-time folder-var precedence, so
 *  it points at the folder whose value actually wins. */
export function findFolderVarSource(
  folderId: string | null | undefined,
  folders: ApiFolder[],
  key: string,
): string | null {
  const chain = ancestorChainRootFirst(folderId, folders) // root→nearest
  for (let i = chain.length - 1; i >= 0; i--) {
    if ((chain[i].variables ?? []).some((v) => v.enabled && v.key === key)) {
      return chain[i].id
    }
  }
  return null
}

/** Enabled folder variables along the ancestor chain, ordered nearest→root so
 *  the first match wins (`resolveTemplate` / autocomplete are first-match). */
export function inheritedFolderVars(
  folderId: string | null | undefined,
  folders: ApiFolder[],
): EnvironmentVariable[] {
  const chain = ancestorChainRootFirst(folderId, folders) // root→nearest
  const out: EnvironmentVariable[] = []
  for (let i = chain.length - 1; i >= 0; i--) {
    for (const v of chain[i].variables ?? []) {
      if (v.enabled) out.push(v)
    }
  }
  return out
}
