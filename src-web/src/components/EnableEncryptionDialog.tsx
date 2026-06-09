import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/error"
import { useUiStore } from "@/store/workspace"
import { commands } from "../../../packages/types/bindings"

interface Props {
  workspaceId: string
  onEnabled: () => void
  onCancel: () => void
}

export function EnableEncryptionDialog({
  workspaceId,
  onEnabled,
  onCancel,
}: Props) {
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleEnable() {
    setEnabling(true)
    setError(null)
    try {
      const res = await commands.workspaceEnableEncryption(workspaceId)
      if (res.status === "ok") {
        await useUiStore.getState().loadWorkspaces()
        onEnabled()
      } else {
        setError(errorMessage(res.error))
      }
    } finally {
      setEnabling(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[400] bg-black/50 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] w-[340px] p-5 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <span className="font-sans text-[1rem] font-semibold text-fg">
            Enable Workspace Encryption?
          </span>
          <span className="font-sans text-[0.929rem] text-muted leading-relaxed">
            Variable encryption requires workspace encryption to be enabled.
          </span>
        </div>

        {error && (
          <div className="text-[0.786rem] text-error border border-error/50 rounded-[3px] px-2.5 py-1.5">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={enabling}
            className="font-sans text-[0.929rem] text-muted px-3 py-1.5 rounded-[5px] border border-border cursor-pointer bg-transparent hover:bg-subtle outline-none disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleEnable()}
            disabled={enabling}
            className="font-sans text-[0.929rem] font-medium text-white px-3 py-1.5 rounded-[5px] border-0 cursor-pointer outline-none disabled:opacity-60 flex items-center gap-2"
            style={{ background: "var(--base0D)" }}
          >
            {enabling && <Spinner className="size-3 shrink-0" />}
            Enable Encryption
          </button>
        </div>
      </div>
    </div>
  )
}
