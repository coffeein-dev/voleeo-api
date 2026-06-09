import { ancestorChainRootFirst } from "@/lib/folderChain"
import type { ApiFolder, RequestParameter } from "@/store/requests"
import type { Workspace } from "@/store/workspace"
import type { InheritedHeader } from "./InheritedHeaders"

/**
 * Headers a scope inherits from ancestor folders + workspace, each flagged
 * `overridden` when a nearer scope redefines the key. `ownHeaders` win but are
 * excluded from the result (they're editable directly).
 *
 * Precedence (workspace < folders root→nearest < own) must match the send-time
 * merge in `sendResolution.mergeInheritedHeadersAnnotated`.
 */
export function computeInheritedHeaders(
  scopeFolderId: string | null | undefined,
  ownHeaders: RequestParameter[],
  folders: ApiFolder[],
  workspace: Workspace | null | undefined,
): InheritedHeader[] {
  if (!workspace) return []
  const chain = ancestorChainRootFirst(scopeFolderId, folders)

  // Last claim wins, so apply weakest→strongest.
  const winners = new Map<string, RequestParameter>()
  const claim = (rows?: RequestParameter[]) => {
    for (const h of rows ?? []) {
      if (h.enabled && h.name.trim()) winners.set(h.name.toLowerCase(), h)
    }
  }
  claim(workspace.headers)
  for (const f of chain) claim(f.headers)
  claim(ownHeaders)

  const out: InheritedHeader[] = []
  const add = (
    rows: RequestParameter[] | undefined,
    origin: "folder" | "workspace",
    source: string,
    folderId?: string,
  ) => {
    for (const h of rows ?? []) {
      if (!h.enabled || !h.name.trim()) continue
      out.push({
        name: h.name,
        value: h.value,
        origin,
        folderId,
        source,
        overridden: winners.get(h.name.toLowerCase()) !== h,
      })
    }
  }
  add(workspace.headers, "workspace", "Workspace")
  for (const f of chain) add(f.headers, "folder", f.name, f.id)
  return out
}
