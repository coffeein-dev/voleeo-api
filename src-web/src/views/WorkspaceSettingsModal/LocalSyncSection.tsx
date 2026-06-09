import { open } from "@tauri-apps/plugin-dialog"
import { useEffect, useState } from "react"
import { Glyph } from "@/components/Glyph"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Workspace } from "@/store/workspace"
import { commands } from "../../../../packages/types/bindings"

interface LocalSyncSectionProps {
  workspaceId: string
  syncDir: string | null
  onChanged: (ws: Workspace) => void
}

export function LocalSyncSection({
  workspaceId,
  syncDir,
  onChanged,
}: LocalSyncSectionProps) {
  const [saving, setSaving] = useState(false)
  const [defaultPath, setDefaultPath] = useState<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: syncDir is a prop — biome incorrectly classifies it as an outer scope value; re-fetch when sync dir changes
  useEffect(() => {
    commands.workspaceGetPath(workspaceId).then((res) => {
      if (res.status === "ok") setDefaultPath(res.data)
    })
  }, [workspaceId, syncDir])

  const isCustom = syncDir !== null
  const displayPath = syncDir ?? defaultPath

  async function handleChange() {
    const selected = await open({ directory: true, multiple: false })
    if (!selected) return
    setSaving(true)
    try {
      const dir = typeof selected === "string" ? selected : selected[0]
      const res = await commands.workspaceSetSyncDir(workspaceId, dir)
      if (res.status === "ok") onChanged(res.data)
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    setSaving(true)
    try {
      const res = await commands.workspaceSetSyncDir(workspaceId, null)
      if (res.status === "ok") onChanged(res.data)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <span className="font-sans text-[0.929rem] font-semibold text-fg">
          Local directory sync
        </span>
        <p className="text-[0.75rem] text-muted mt-1 leading-relaxed">
          Store workspace files in a custom folder — useful for Git or
          cross-device sync.
        </p>
      </div>

      <div className="flex items-center border border-border rounded-[5px] bg-bg overflow-hidden">
        <div className="px-3 py-2 shrink-0">
          <Glyph
            kind="folder"
            size={13}
            color={isCustom ? "var(--base05)" : "var(--base04)"}
          />
        </div>

        <span
          className={cn(
            "flex-1 min-w-0 font-mono text-[0.786rem] truncate",
            isCustom ? "text-fg" : "text-muted",
          )}
          title={displayPath ?? undefined}
        >
          {displayPath ?? "Loading…"}
        </span>

        <div className="flex items-center border-l border-border shrink-0">
          {saving ? (
            <div className="px-3 py-2">
              <Spinner className="size-3.5 text-muted" />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleChange}
                className="px-3 py-[7px] font-sans text-[0.786rem] font-medium text-fg cursor-pointer hover:bg-subtle bg-transparent border-0 outline-none transition-colors"
              >
                {isCustom ? "Change…" : "Set folder…"}
              </button>
              {isCustom && (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Reset to default location"
                  className="px-2 py-2 cursor-pointer hover:bg-subtle bg-transparent border-0 border-l border-border outline-none transition-colors"
                >
                  <Glyph kind="x" size={13} color="var(--base04)" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
