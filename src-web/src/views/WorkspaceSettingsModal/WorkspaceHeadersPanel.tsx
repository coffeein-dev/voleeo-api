import { useCallback, useRef } from "react"
import {
  type RequestParameter,
  useUiStore,
  type Workspace,
} from "@/store/workspace"
import { HeadersTab } from "@/views/ApiWorkspace/HeadersTab"
import { PanelHeading } from "./PanelHeading"

// Stable reference → identity-stable headers prop when none are set.
const EMPTY: RequestParameter[] = []

export function WorkspaceHeadersPanel({
  workspace,
  focusKey,
}: {
  workspace: Workspace
  focusKey?: string
}) {
  const updateWorkspaceHeaders = useUiStore((s) => s.updateWorkspaceHeaders)
  // Read live headers from the store: the `workspace` prop is a stale copy, and
  // syncing from it would wipe in-progress edits.
  const headers = useUiStore(
    (s) => s.workspaces.find((w) => w.id === workspace.id)?.headers ?? EMPTY,
  )
  const commitRef = useRef<() => Promise<void>>(async () => {})

  const handleCommit = useCallback(
    async (next: RequestParameter[]) => {
      await updateWorkspaceHeaders(workspace.id, next)
    },
    [workspace.id, updateWorkspaceHeaders],
  )

  return (
    <div className="flex flex-col gap-3">
      <PanelHeading
        title="Headers"
        description="Attached to every request in this workspace unless overridden by a folder or the request itself."
      />
      <HeadersTab
        sourceId={workspace.id}
        headers={headers}
        onCommit={handleCommit}
        commitRef={commitRef}
        focusKey={focusKey}
      />
    </div>
  )
}
