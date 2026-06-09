import { getCurrentWindow } from "@tauri-apps/api/window"
import { useEffect } from "react"
import { useGitStore } from "@/store/git"
import { GitVars } from "./gitTheme"
import { InitPanel } from "./InitPanel"
import { ResolveConflicts } from "./ResolveConflicts"
import { ReviewChanges } from "./ReviewChanges"

export function GitSync() {
  const repo = useGitStore((s) => s.repo)
  const error = useGitStore((s) => s.error)
  const showHistory = useGitStore((s) => s.showHistory)
  const historyName = useGitStore((s) => s.historyName)
  const merging = useGitStore(
    (s) => (s.repo?.merging ?? false) || s.entityConflicts.length > 0,
  )

  const showConflicts = merging && !showHistory

  // Reflect the active view in the native window title.
  useEffect(() => {
    const title = showHistory
      ? historyName
        ? `History — ${historyName}`
        : "History"
      : merging
        ? "Resolve conflicts"
        : "Changes"
    getCurrentWindow()
      .setTitle(title)
      .catch(() => {})
  }, [merging, showHistory, historyName])

  if (!repo) {
    return (
      <div className="h-full grid place-items-center px-6 text-center text-sm text-muted">
        {error ?? "Loading…"}
      </div>
    )
  }
  if (!repo.isRepo) return <InitPanel />

  return (
    <div className="git-root">
      <GitVars />
      {showConflicts ? <ResolveConflicts /> : <ReviewChanges />}
    </div>
  )
}
