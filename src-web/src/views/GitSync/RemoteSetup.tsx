import { useState } from "react"
import { Glyph } from "@/components/Glyph"
import { ManagementModal } from "@/components/ManagementModal"
import { Button } from "@/components/ui/button"
import { useGitStore } from "@/store/git"

export function RemoteSetup({ onClose }: { onClose: () => void }) {
  const repo = useGitStore((s) => s.repo)
  const setRemote = useGitStore((s) => s.setRemote)
  const [url, setUrl] = useState(repo?.remotes[0]?.url ?? "")
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!url.trim()) return
    setSaving(true)
    try {
      await setRemote("origin", url.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <ManagementModal
      title={
        <span className="flex items-center gap-1.5 font-sans text-sm text-fg">
          <Glyph kind="globe" size={14} color="var(--base04)" /> Remote
        </span>
      }
      width={460}
      fitContent
      onClose={onClose}
    >
      <div className="p-4 flex flex-col gap-3 w-full">
        <label className="text-[0.78rem] text-muted">
          Origin URL (SSH or HTTPS)
        </label>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
          }}
          placeholder="git@github.com:your-org/api-collection.git"
          className="w-full bg-bg border border-border rounded-md px-2.5 py-1.5 text-sm text-fg font-mono outline-none focus:border-accent"
        />
        <p className="text-[0.72rem] text-muted">
          Pushing and pulling use your SSH agent or git credential helper — the
          same auth as your terminal.
        </p>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={saving || !url.trim()} onClick={save}>
            {saving ? "Saving…" : "Save remote"}
          </Button>
        </div>
      </div>
    </ManagementModal>
  )
}
