import { useEffect, useMemo, useState } from "react"
import { Glyph } from "@/components/Glyph"
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog"
import { buildReview } from "@/lib/gitEntityDiff"
import { cn } from "@/lib/utils"
import { type GitCommit, type GitEntityChange, useGitStore } from "@/store/git"
import { useRequestStore } from "@/store/requests"
import { PaneSeparator } from "@/views/ApiWorkspace/PaneSeparator"
import { ChangeDetail } from "../ReviewChanges/ChangeDetail"
import { ChangesSidebar } from "../ReviewChanges/ChangesSidebar"
import { RV } from "../reviewClasses"
import { useSidebarResize } from "../useSidebarResize"

export function History() {
  const storeLog = useGitStore((s) => s.log)
  const loadLog = useGitStore((s) => s.loadLog)
  const logForPath = useGitStore((s) => s.logForPath)
  const commitChanges = useGitStore((s) => s.commitChanges)
  const revertCommit = useGitStore((s) => s.revertCommit)
  const ahead = useGitStore((s) => s.repo?.ahead ?? 0)
  const historyPath = useGitStore((s) => s.historyPath)
  const historyName = useGitStore((s) => s.historyName)
  const folders = useRequestStore((s) => s.folders)
  const wsId = useGitStore((s) => s.loadedWorkspaceId) ?? "default"
  const commits = useSidebarResize(`${wsId}:commits`)
  const side = useSidebarResize(`${wsId}:changes`)

  const [selCommit, setSelCommit] = useState<string | null>(null)
  const [changes, setChanges] = useState<GitEntityChange[]>([])
  const [selPath, setSelPath] = useState<string | null>(null)
  const [pathLog, setPathLog] = useState<GitCommit[]>([])
  const [revertTarget, setRevertTarget] = useState<GitCommit | null>(null)

  // Per-file history pulls the path-scoped log; whole-repo history uses the store.
  useEffect(() => {
    if (!historyPath) {
      loadLog(100)
      return
    }
    let cancelled = false
    logForPath(historyPath, 100)
      .then((cs) => !cancelled && setPathLog(cs))
      .catch(() => !cancelled && setPathLog([]))
    return () => {
      cancelled = true
    }
  }, [historyPath, loadLog, logForPath])

  const log = historyPath ? pathLog : storeLog
  const commitId = selCommit ?? log[0]?.id ?? null

  useEffect(() => {
    if (!commitId) {
      setChanges([])
      return
    }
    let cancelled = false
    commitChanges(commitId).then((c) => {
      if (!cancelled) setChanges(c)
    })
    return () => {
      cancelled = true
    }
  }, [commitId, commitChanges])

  const review = useMemo(() => {
    const built = buildReview(
      changes,
      folders.map((f) => ({ id: f.id, name: f.name })),
    )
    return historyPath ? built.filter((e) => e.path === historyPath) : built
  }, [changes, folders, historyPath])
  const selected = review.find((e) => e.path === selPath) ?? review[0] ?? null
  const selectedCommit = log.find((c) => c.id === commitId) ?? null

  return (
    <div className={RV.body}>
      <aside className={RV.histCommits} style={{ width: commits.width }}>
        {log.length === 0 && <div className={RV.empty}>No history yet.</div>}
        {log.map((c, i) => (
          <button
            type="button"
            key={c.id}
            className={cn(RV.histCommit, c.id === commitId && RV.histCommitSel)}
            onClick={() => {
              setSelCommit(c.id)
              setSelPath(null)
            }}
          >
            <span className={RV.histCommitTop}>
              <span className={RV.histCommitSummary}>{c.summary}</span>
              {i < ahead && (
                <span
                  className={RV.histLocal}
                  title="Saved locally — not shared yet"
                >
                  Local only
                </span>
              )}
            </span>
            <span className={RV.histCommitMeta}>
              <span className={RV.histSha}>{c.shortId}</span> · {c.author} ·{" "}
              {new Date((c.timestamp ?? 0) * 1000).toLocaleDateString()}
            </span>
          </button>
        ))}
      </aside>
      <PaneSeparator dir="col" onMouseDown={commits.onSepDown} />
      {/* Per-file history is a single entity — skip the change-list pane. */}
      {!historyPath && (
        <>
          <aside className={RV.side} style={{ width: side.width }}>
            <ChangesSidebar
              review={review}
              selectedPath={selected?.path ?? null}
              onSelect={setSelPath}
              readOnly
            />
          </aside>
          <PaneSeparator dir="col" onMouseDown={side.onSepDown} />
        </>
      )}
      <section className={RV.detail}>
        {commitId && selectedCommit ? (
          <>
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border">
              <span className="font-mono text-[0.714rem] text-muted truncate">
                {selectedCommit.shortId} · {selectedCommit.summary}
              </span>
              <button
                type="button"
                onClick={() => setRevertTarget(selectedCommit)}
                title="Revert this commit into pending changes"
                className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-border bg-transparent text-muted hover:text-fg hover:border-fg/30 cursor-pointer font-sans text-[0.786rem] transition-colors"
              >
                <Glyph
                  kind="arrow-counter-clockwise"
                  size={12}
                  color="currentColor"
                />
                {historyPath ? "Revert change" : "Revert commit"}
              </button>
            </div>
            <ChangeDetail entity={selected} readOnly />
          </>
        ) : (
          <div className={RV.detailEmpty}>Select a commit to inspect it.</div>
        )}
      </section>

      {revertTarget && (
        <ConfirmationDialog
          title={historyPath ? "Revert change?" : "Revert commit?"}
          icon="warning"
          description={
            historyPath ? (
              <>
                Restore <code>{historyName ?? "this entity"}</code> to its
                version before commit <code>{revertTarget.shortId}</code>. It's
                added as a pending change for you to review and publish.
              </>
            ) : (
              <>
                Restore the entities changed in commit{" "}
                <code>{revertTarget.shortId}</code> to their pre-commit version.
                They're added as pending changes for you to review and publish.
              </>
            )
          }
          confirmLabel="Revert"
          onConfirm={() => {
            void revertCommit(revertTarget.id, historyPath ?? undefined)
            setRevertTarget(null)
          }}
          onCancel={() => setRevertTarget(null)}
        />
      )}
    </div>
  )
}
