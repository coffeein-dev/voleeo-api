import { tryParseCommand } from "@/lib/commandImport"
import { pathFromUrl } from "@/lib/requestName"
import { useRequestStore } from "@/store/requests"
import { useToastStore } from "@/store/toast"

/**
 * Read the clipboard, parse it as a cURL / HTTPie command, and create a new
 * request in the right place:
 *   • `focusedId` is a folder id  → request goes inside it
 *   • `focusedId` is a request id → request goes in the same folder (sibling)
 *   • no focus                    → request goes at the root
 *
 * Reads stores via `.getState()` rather than React selectors so this can be
 * called from a one-shot event handler without dragging in re-renders.
 */
export async function pasteFromClipboard(
  workspaceId: string,
  focusedId: string | null,
): Promise<void> {
  const toast = useToastStore.getState()
  const text = await navigator.clipboard.readText().catch(() => null)
  if (!text) {
    toast.show("Clipboard is empty", undefined, "info")
    return
  }
  const parsed = tryParseCommand(text)
  if (!parsed) {
    toast.show(
      "Clipboard doesn't look like a cURL or HTTPie command",
      undefined,
      "error",
    )
    return
  }

  // Resolve target folder from the focused node.
  const { folders, requests, createRequest, updateRequest, renameRequest } =
    useRequestStore.getState()
  let folderId: string | undefined
  if (focusedId) {
    const focusedFolder = folders.find((f) => f.id === focusedId)
    if (focusedFolder) {
      folderId = focusedFolder.id
    } else {
      const focusedRequest = requests.find((r) => r.id === focusedId)
      if (focusedRequest) folderId = focusedRequest.folderId ?? undefined
    }
  }

  const created = await createRequest(workspaceId, {
    folderId,
    method: parsed.parsed.method,
    url: parsed.parsed.url,
  })
  if (!created) {
    toast.show("Failed to create request", undefined, "error")
    return
  }

  // `createRequest` only knows the basic fields. Push the parsed
  // headers / params / body / auth via `updateRequest` so the imported
  // command lands intact.
  await updateRequest(
    workspaceId,
    created.id,
    parsed.parsed.method,
    parsed.parsed.url,
    parsed.parsed.parameters,
    parsed.parsed.headers,
    parsed.parsed.body,
    parsed.parsed.auth,
  )

  // Mirror the manual-typed flow (RequestPane.commitUrl): when the request
  // is still named "New Request" we derive the name from the URL's path.
  // Pasted requests come in with that default, so this always fires when the
  // URL has a meaningful path — no manual rename needed.
  const path = pathFromUrl(parsed.parsed.url)
  if (path) await renameRequest(workspaceId, created.id, path)

  const label = parsed.source === "curl" ? "cURL" : "HTTPie"
  toast.show(`Pasted ${label} command as new request`, undefined, "success")
}
