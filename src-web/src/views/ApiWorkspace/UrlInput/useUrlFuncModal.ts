import type { RefObject } from "react"
import { useState } from "react"
import { ensureTrailingTextNode, extractStoredValue } from "@/lib/caret"
import { parseExpr, serialize } from "@/lib/template"
import { commands } from "../../../../../packages/types/bindings"

export interface FuncModalState {
  fnName: string
  initialArgs: Record<string, string>
  oldToken: string
}

export interface UseUrlFuncModalResult {
  funcModal: FuncModalState | null
  setFuncModal: React.Dispatch<React.SetStateAction<FuncModalState | null>>
  showEncryptionDialog: boolean
  setShowEncryptionDialog: React.Dispatch<React.SetStateAction<boolean>>
  handleChipClick: (target: HTMLElement) => void
  handleFuncModalInsert: (args: Record<string, string>) => Promise<void>
}

interface UseUrlFuncModalOptions {
  divRef: RefObject<HTMLDivElement | null>
  skipSyncRef: RefObject<boolean>
  buildHtml: (text: string) => string
  onChange: (v: string) => void
  activeWorkspaceId: string | null
  insertUrlToken: (storedToken: string) => void
}

export function useUrlFuncModal({
  divRef,
  skipSyncRef,
  buildHtml,
  onChange,
  activeWorkspaceId,
  insertUrlToken,
}: UseUrlFuncModalOptions): UseUrlFuncModalResult {
  const [funcModal, setFuncModal] = useState<FuncModalState | null>(null)
  const [showEncryptionDialog, setShowEncryptionDialog] = useState(false)

  /**
   * Called when the user clicks an existing {{ func() }} chip.
   * Opens the modal empty and fills in decrypted plaintext asynchronously
   * so the raw ciphertext never flashes in the UI.
   */
  function handleChipClick(target: HTMLElement) {
    const fnName = target.dataset.func
    if (!fnName) return

    if (target.dataset.funcError === "true") {
      setShowEncryptionDialog(true)
      return
    }

    let initialArgs: Record<string, string> = {}
    try {
      initialArgs = target.dataset.args ? JSON.parse(target.dataset.args) : {}
    } catch {}

    const encryptedValue = initialArgs.value
    if (encryptedValue?.startsWith("enc:") && activeWorkspaceId) {
      initialArgs = { ...initialArgs, value: "" }
      commands
        .workspaceDecryptValue(activeWorkspaceId, encryptedValue.slice(4))
        .then((res) => {
          if (res.status === "ok") {
            setFuncModal((prev) =>
              prev
                ? {
                    ...prev,
                    initialArgs: { ...prev.initialArgs, value: res.data },
                  }
                : prev,
            )
          }
        })
    }

    const tok = parseExpr(
      `${fnName}(${Object.entries(initialArgs)
        .map(([k, v]) => `${k}="${v}"`)
        .join(", ")})`,
    )
    setFuncModal({ fnName, initialArgs, oldToken: tok ? serialize([tok]) : "" })
  }

  /**
   * Called when the user clicks Insert in the function modal.
   * For encrypt(), pre-encrypts the plaintext before storing.
   */
  async function handleFuncModalInsert(args: Record<string, string>) {
    const modal = funcModal
    setFuncModal(null)
    if (!modal) return

    let resolvedArgs = args
    if (modal.fnName === "encrypt" && activeWorkspaceId) {
      const res = await commands.workspaceEncryptValue(
        activeWorkspaceId,
        args.value ?? "",
      )
      if (res.status === "ok")
        resolvedArgs = { ...args, value: `enc:${res.data}` }
    }

    const token = serialize([
      { kind: "func", name: modal.fnName, args: resolvedArgs },
    ])

    if (modal.oldToken) {
      // Editing an existing chip — find by string match and replace in-place.
      const el = divRef.current
      if (!el) return
      const stored = extractStoredValue(el)
      const idx = stored.indexOf(modal.oldToken)
      const newStored =
        idx === -1
          ? stored + token
          : stored.slice(0, idx) +
            token +
            stored.slice(idx + modal.oldToken.length)
      el.innerHTML = buildHtml(newStored)
      ensureTrailingTextNode(el)
      skipSyncRef.current = true
      onChange(newStored)
      return
    }

    insertUrlToken(token)
  }

  return {
    funcModal,
    setFuncModal,
    showEncryptionDialog,
    setShowEncryptionDialog,
    handleChipClick,
    handleFuncModalInsert,
  }
}
