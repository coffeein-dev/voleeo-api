import { useCallback, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { serialize, type TemplateToken, tokenize } from "@/lib/template"
import { useUiStore } from "@/store/workspace"

interface Options {
  value: string
  encrypted: boolean
  onChange: (v: string) => void
  onEncryptedChange: (next: boolean) => void
  onCommit?: () => void
}

/** Replaces every `encrypt()` function token with its plaintext `value` arg. */
function collapseEncryptTokens(v: string): {
  collapsed: string
  changed: boolean
} {
  const tokens = tokenize(v)
  const changed = tokens.some((t) => t.kind === "func" && t.name === "encrypt")
  if (!changed) return { collapsed: v, changed: false }
  const mapped: TemplateToken[] = tokens.map((t) =>
    t.kind === "func" && t.name === "encrypt"
      ? { kind: "plain", text: t.args.value ?? "" }
      : t,
  )
  return { collapsed: serialize(mapped), changed: true }
}

/**
 * Drives an `EncryptedInput`: the shield toggle, the enable-encryption dialog,
 * and the on-blur collapse of `encrypt()` blocks. A nested `encrypt()` is
 * redundant inside an encrypted field, so on commit it is unwrapped to its
 * plaintext and the field's `encrypted` flag is turned on.
 *
 * `pending` non-null means the dialog is open. `pending.collapsed` carries the
 * collapsed value to apply once encryption is enabled (null for a plain toggle).
 */
export function useEncryptCollapse({
  value,
  encrypted,
  onChange,
  onEncryptedChange,
  onCommit,
}: Options) {
  const { workspaceId, workspaceEncrypted } = useUiStore(
    useShallow((s) => ({
      workspaceId: s.activeWorkspaceId,
      workspaceEncrypted:
        s.workspaces.find((w) => w.id === s.activeWorkspaceId)?.encrypted ??
        false,
    })),
  )
  const [pending, setPending] = useState<{ collapsed: string | null } | null>(
    null,
  )

  const handleCommit = useCallback(() => {
    const { collapsed, changed } = collapseEncryptTokens(value)
    if (!changed) {
      onCommit?.()
      return
    }
    if (encrypted) {
      onChange(collapsed)
      onCommit?.()
    } else if (workspaceEncrypted) {
      onChange(collapsed)
      onEncryptedChange(true)
      onCommit?.()
    } else {
      setPending({ collapsed })
    }
  }, [
    value,
    encrypted,
    workspaceEncrypted,
    onChange,
    onEncryptedChange,
    onCommit,
  ])

  // Autocomplete `encrypt()` path: the func modal hands us the plaintext
  // directly (no chip inserted). The field becomes that secret, encrypted.
  const handleEncryptInsert = useCallback(
    (plaintext: string) => {
      onChange(plaintext)
      onEncryptedChange(true)
      onCommit?.()
    },
    [onChange, onEncryptedChange, onCommit],
  )

  const requestToggle = useCallback(() => {
    if (encrypted) {
      onEncryptedChange(false)
    } else if (workspaceEncrypted) {
      onEncryptedChange(true)
    } else {
      setPending({ collapsed: null })
    }
  }, [encrypted, workspaceEncrypted, onEncryptedChange])

  const handleEncryptionEnabled = useCallback(() => {
    if (pending?.collapsed != null) onChange(pending.collapsed)
    onEncryptedChange(true)
    onCommit?.()
    setPending(null)
  }, [pending, onChange, onEncryptedChange, onCommit])

  const handleEncryptionCancelled = useCallback(() => {
    // Collapse the redundant block anyway, but leave the field unencrypted.
    if (pending?.collapsed != null) {
      onChange(pending.collapsed)
      onCommit?.()
    }
    setPending(null)
  }, [pending, onChange, onCommit])

  return {
    workspaceId,
    dialogOpen: pending !== null,
    handleCommit,
    handleEncryptInsert,
    requestToggle,
    handleEncryptionEnabled,
    handleEncryptionCancelled,
  }
}
