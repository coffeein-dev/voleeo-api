import { sendRequestCommand } from "@/store/http"
import type { StoredHttpResponse } from "../../../../packages/types/bindings"
import { commands } from "../../../../packages/types/bindings"
import { markResolving, unmarkResolving } from "../shared/cycleGuard"

export { markResolving, unmarkResolving }

export type ResponseStrategy = "cache" | "refresh-after" | "force"

// Called by the builtin's onRender to fire the source request with templates resolved.
export type RequestSender = (
  workspaceId: string,
  requestId: string,
) => Promise<void>

// Dedup concurrent calls for the same request within a single template resolution.
const inFlight = new Map<string, Promise<StoredHttpResponse>>()

// Per-send-cycle cache: persists completed results across sequential resolutions
// (params are resolved one-by-one, so inFlight is already cleared when the next
// param's onRender runs). RequestPane clears this before each send.
const cycleCache = new Map<string, StoredHttpResponse>()
export function clearResponseCycleCache() {
  cycleCache.clear()
}

export async function ensureResponse(
  workspaceId: string,
  requestId: string,
  strategy: ResponseStrategy,
  ttlSec: number,
  sender?: RequestSender,
): Promise<StoredHttpResponse> {
  const key = `${workspaceId}:${requestId}`

  // Per-send-cycle cache: params resolve sequentially so inFlight is gone by
  // the time the second token runs. cycleCache persists the result for the
  // entire send cycle so we don't fire the same pre-flight request twice.
  const cycleCached = cycleCache.get(key)
  if (cycleCached) return cycleCached

  // Dedup: if another token in the same template is already resolving this,
  // share the promise so we don't send the request twice.
  const existing = inFlight.get(key)
  if (existing) return existing

  const promise = resolveResponse(
    workspaceId,
    requestId,
    strategy,
    ttlSec,
    sender,
  )
    .then((result) => {
      cycleCache.set(key, result)
      return result
    })
    .finally(() => {
      inFlight.delete(key)
    })
  inFlight.set(key, promise)
  return promise
}

async function resolveResponse(
  workspaceId: string,
  requestId: string,
  strategy: ResponseStrategy,
  ttlSec: number,
  sender?: RequestSender,
): Promise<StoredHttpResponse> {
  if (strategy === "force") {
    return executeAndFetch(workspaceId, requestId, sender)
  }

  const latest = await fetchLatest(workspaceId, requestId)

  if (strategy === "cache") {
    if (!latest)
      throw new Error("No stored response yet. Run the request first.")
    return latest
  }

  // refresh-after: use cached if recent enough
  if (latest) {
    const ageMs = Date.now() - new Date(latest.recordedAt).getTime()
    if (ageMs <= ttlSec * 1000) return latest
  }

  return executeAndFetch(workspaceId, requestId, sender)
}

async function fetchLatest(
  workspaceId: string,
  requestId: string,
): Promise<StoredHttpResponse | null> {
  const listRes = await commands.responseList(workspaceId, requestId)
  if (listRes.status !== "ok" || listRes.data.length === 0) return null
  const summary = listRes.data[0]
  const getRes = await commands.responseGet(workspaceId, requestId, summary.id)
  if (getRes.status !== "ok" || !getRes.data) return null
  return getRes.data
}

async function executeAndFetch(
  workspaceId: string,
  requestId: string,
  sender?: RequestSender,
): Promise<StoredHttpResponse> {
  if (sender) {
    await sender(workspaceId, requestId)
  } else {
    // No overrides — chained `response.*` resolution uses the backend's
    // load+resolve path because the function executor isn't reachable here.
    const sendRes = await sendRequestCommand(workspaceId, requestId)
    if (sendRes.status !== "ok") {
      const err = sendRes.error
      const msg = "data" in err ? String(err.data) : err.kind
      throw new Error(`Pre-flight request failed: ${msg}`)
    }
  }
  // The send stores the response; fetch the latest from history.
  const latest = await fetchLatest(workspaceId, requestId)
  if (!latest) throw new Error("Request executed but response was not stored")
  return latest
}
