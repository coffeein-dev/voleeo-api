import { useMemo } from "react"
import { useShallow } from "zustand/shallow"
import { Glyph } from "@/components/Glyph"
import { MonoLabel } from "@/components/Primitives"
import { loadItemsCount } from "@/lib/workspaceCounts"
import { getCachedSettings } from "@/lib/workspaceSettings"
import type { Workspace } from "@/store/workspace"
import { useUiStore } from "@/store/workspace"

export function RecentWorkspaces() {
  const { workspaces, openWorkspace } = useUiStore(
    useShallow((s) => ({
      workspaces: s.workspaces,
      openWorkspace: s.openWorkspace,
    })),
  )

  const sorted = useMemo(
    () =>
      [...workspaces].sort((a, b) => {
        // Sort by last-opened time; fall back to updatedAt for workspaces never opened from here
        const aKey = getCachedSettings(a.id).openedAt || a.updatedAt
        const bKey = getCachedSettings(b.id).openedAt || b.updatedAt
        return bKey.localeCompare(aKey)
      }),
    [workspaces],
  )

  if (sorted.length === 0) return null

  const overflow = sorted.length - 6

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <MonoLabel size={9.5}>Recent</MonoLabel>
        {overflow > 0 && (
          <MonoLabel size={9.5} style={{ opacity: 0.45 }}>
            ↓ {overflow} more — scroll to see
          </MonoLabel>
        )}
      </div>
      <div className="flex flex-col gap-2 max-h-[272px] overflow-y-auto">
        {sorted.map((w) => (
          <WorkspaceRow key={w.id} w={w} onOpen={openWorkspace} />
        ))}
      </div>
    </div>
  )
}

function WorkspaceRow({
  w,
  onOpen,
}: {
  w: Workspace
  onOpen: (id: string) => void
}) {
  const count = loadItemsCount(w.id)
  const badge =
    count === undefined
      ? "0 requests"
      : `${count} ${count === 1 ? "request" : "requests"}`

  return (
    <div
      onClick={() => onOpen(w.id)}
      className="flex items-center gap-3 px-3 py-2.5 border border-border bg-surface rounded-[5px] cursor-pointer hover:border-accent transition-colors"
    >
      <div className="w-[24px] h-[24px] rounded-[4px] border border-border bg-bg grid place-items-center shrink-0">
        <Glyph kind="api" size={12} color="var(--base05)" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-sans text-[0.929rem] font-medium text-fg truncate">
          {w.name}
        </div>
      </div>
      <span className="text-[0.714rem] text-muted shrink-0 px-2 py-0.5 border border-border rounded-[10px] bg-bg">
        {badge}
      </span>
      <Glyph kind="arrow" size={12} color="var(--base04)" />
    </div>
  )
}
