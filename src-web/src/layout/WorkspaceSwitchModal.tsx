import { useEffect } from "react"
import { Glyph } from "@/components/Glyph"
import { Button } from "@/components/ui/button"
import type { Workspace } from "@/store/workspace"

interface Props {
  workspace: Workspace
  onCurrentWindow: () => void
  onNewWindow: () => void
  onCancel: () => void
}

export function WorkspaceSwitchModal({
  workspace,
  onCurrentWindow,
  onNewWindow,
  onCancel,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onCancel()
      } else if (e.key === "Enter") {
        e.preventDefault()
        onCurrentWindow()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onCancel, onCurrentWindow])

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="font-sans bg-surface border border-border rounded-[8px] shadow-[0_16px_48px_rgba(0,0,0,0.7)] w-[480px] max-w-[94vw] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-2.5 border-b border-border">
          <Glyph kind="api" size={18} color="var(--base05)" />
          <span className="flex-1 font-sans text-[1.071rem] font-semibold text-fg truncate">
            {workspace.name}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-[4px] cursor-pointer hover:bg-subtle bg-transparent border-0 outline-none"
          >
            <Glyph kind="x" size={13} color="var(--base04)" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          <p className="font-sans text-[0.929rem] text-fg leading-relaxed">
            Open in this window, replacing the current workspace, or keep both
            open side-by-side in a new window?
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="cursor-pointer border-border text-fg bg-transparent hover:bg-subtle hover:text-fg mr-auto"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onNewWindow}
            className="cursor-pointer border-border text-fg bg-transparent hover:bg-subtle hover:text-fg"
          >
            New Window
          </Button>
          <button
            type="button"
            onClick={onCurrentWindow}
            className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity whitespace-nowrap"
            style={{
              backgroundColor: "var(--base0D)",
              color: "var(--base00)",
              border: "none",
            }}
          >
            This Window
          </button>
        </div>
      </div>
    </div>
  )
}
