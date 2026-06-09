import { open } from "@tauri-apps/plugin-dialog"
import { useState } from "react"
import { useShallow } from "zustand/shallow"
import { Glyph } from "@/components/Glyph"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/error"
import { useUiStore } from "@/store/workspace"
import { commands } from "../../../../packages/types/bindings"
import { FlowBtn } from "./FlowBtn"
import { FlowShell } from "./FlowShell"

const INPUT =
  "w-full bg-bg border border-border rounded-[4px] px-2.5 py-1.5 text-[0.857rem] text-fg font-mono outline-none focus:border-accent"

interface ImportFlowProps {
  onCancel: () => void
}

export function ImportFlow({ onCancel }: ImportFlowProps) {
  const { openWorkspace, loadWorkspaces } = useUiStore(
    useShallow((s) => ({
      openWorkspace: s.openWorkspace,
      loadWorkspaces: s.loadWorkspaces,
    })),
  )
  const [folderLoading, setFolderLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [cloneUrl, setCloneUrl] = useState("")
  const [cloneParent, setCloneParent] = useState<string | null>(null)
  const [showCreds, setShowCreds] = useState(false)
  const [cloneUser, setCloneUser] = useState("")
  const [cloneToken, setCloneToken] = useState("")
  const [cloneLoading, setCloneLoading] = useState(false)

  // Returns the error message (and surfaces it) or null on success.
  async function adopt(
    run: () => Promise<
      | { status: "ok"; data: { id: string } }
      | { status: "error"; error: unknown }
    >,
  ): Promise<string | null> {
    const res = await run()
    if (res.status === "ok") {
      await loadWorkspaces()
      openWorkspace(res.data.id, "api")
      return null
    }
    const msg = errorMessage(res.error as never)
    setError(msg)
    return msg
  }

  async function handleOpenFolder() {
    setError(null)
    const selected = await open({ directory: true, multiple: false })
    if (!selected) return
    const folderPath = typeof selected === "string" ? selected : selected[0]
    setFolderLoading(true)
    try {
      await adopt(() => commands.workspaceOpenFolder(folderPath))
    } finally {
      setFolderLoading(false)
    }
  }

  async function handleClone() {
    const url = cloneUrl.trim()
    if (!url) return
    setError(null)
    let parent = cloneParent
    if (!parent) {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Choose where to clone the repository",
      })
      if (!selected) return
      parent = typeof selected === "string" ? selected : selected[0]
      setCloneParent(parent)
    }
    setCloneLoading(true)
    try {
      const msg = await adopt(() =>
        commands.gitCloneWorkspace(
          url,
          parent,
          cloneUser.trim() || null,
          cloneToken.trim() || null,
        ),
      )
      if (msg && /auth|credential|ssh/i.test(msg)) setShowCreds(true)
    } finally {
      setCloneLoading(false)
    }
  }

  return (
    <FlowShell
      icon="import"
      title="Import"
      description="Open an existing workspace folder or clone a repository."
      footer={
        <div className="flex items-center w-full">
          <FlowBtn onClick={onCancel}>Cancel</FlowBtn>
        </div>
      }
    >
      <div className="flex gap-2">
        <FlowBtn onClick={handleOpenFolder} disabled={folderLoading}>
          {folderLoading ? (
            <>
              <Spinner className="size-3 shrink-0" /> Opening…
            </>
          ) : (
            "Open Folder"
          )}
        </FlowBtn>
        <FlowBtn
          onClick={() => setCloneOpen((v) => !v)}
          disabled={cloneLoading}
        >
          Clone Git Repository
        </FlowBtn>
      </div>

      {cloneOpen && (
        <div className="flex flex-col gap-2 p-3 border border-border rounded-[5px]">
          <label className="text-[0.714rem] text-muted">
            Repository URL (SSH or HTTPS)
          </label>
          <input
            autoFocus
            value={cloneUrl}
            onChange={(e) => {
              setCloneUrl(e.target.value)
              setCloneParent(null)
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleClone()
            }}
            placeholder="git@github.com:your-org/api-collection.git"
            className={INPUT}
          />

          {showCreds && (
            <>
              <label className="text-[0.714rem] text-muted mt-1">
                Username + token (clones over HTTPS)
              </label>
              <div className="flex gap-2">
                <input
                  value={cloneUser}
                  onChange={(e) => setCloneUser(e.target.value)}
                  placeholder="Username"
                  className={INPUT}
                />
                <input
                  type="password"
                  value={cloneToken}
                  onChange={(e) => setCloneToken(e.target.value)}
                  placeholder="Personal access token"
                  className={INPUT}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[0.714rem] text-muted">
              {showCreds
                ? "Token is used to clone over HTTPS."
                : "Uses your SSH agent or git credential helper."}
            </span>
            <FlowBtn
              onClick={handleClone}
              disabled={cloneLoading || !cloneUrl.trim()}
            >
              {cloneLoading ? (
                <>
                  <Spinner className="size-3 shrink-0" /> Cloning…
                </>
              ) : cloneParent ? (
                "Clone"
              ) : (
                "Choose folder & clone"
              )}
            </FlowBtn>
          </div>
        </div>
      )}

      {error && (
        <div className="text-[0.786rem] text-error border border-error/50 rounded-[4px] px-2.5 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2.5 px-3.5 py-3 border border-border rounded-[5px] opacity-40 pointer-events-none">
        <Glyph kind="import" size={14} color="var(--base04)" />
        <div>
          <div className="font-sans text-[0.857rem] font-medium text-fg">
            Import OpenAPI / DSN
          </div>
          <div className="text-[0.714rem] text-muted">coming soon</div>
        </div>
      </div>
    </FlowShell>
  )
}
