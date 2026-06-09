import { useCallback } from "react"
import { serialize } from "@/lib/template"
import { commands } from "../../../../packages/types/bindings"

/**
 * Returns a factory that creates per-row `onEncryptInsert` callbacks.
 * The factory encrypts the plaintext and calls `updateValue` with a
 * `{{ encrypt(value="enc:v1:...") }}` chip — the ciphertext is stored
 * inside the chip so `onRender` returns it as-is (no re-encryption).
 */
export function useMakeEncryptInsertHandler(workspaceId: string | null) {
  return useCallback(
    (updateValue: (v: string) => void) => async (plaintext: string) => {
      if (!workspaceId) return
      const res = await commands.workspaceEncryptValue(workspaceId, plaintext)
      if (res.status !== "ok") return
      updateValue(
        serialize([
          { kind: "func", name: "encrypt", args: { value: res.data } },
        ]),
      )
    },
    [workspaceId],
  )
}
