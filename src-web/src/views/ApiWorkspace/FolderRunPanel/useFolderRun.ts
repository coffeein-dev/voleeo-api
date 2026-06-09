import { useEffect, useRef } from "react"
import type { ReqRunStatus } from "@/store/folderRun"
import { useFolderRunStore } from "@/store/folderRun"
import { useHttpStore } from "@/store/http"
import type { HttpRequest } from "@/store/requests"
import {
  clearResponseCycleCache,
  resolveAndSendStoredRequest,
  type StoredSendCtx,
} from "./useStoredSend"

/** Map a completed send to its row status. A status-0 response with no error is
 *  a cancellation shell (see useHttpStore) → "skipped". */
function outcomeFor(id: string, sent: "sent" | "aborted"): ReqRunStatus {
  if (sent === "aborted") return "skipped"
  const http = useHttpStore.getState()
  if (http.errors[id]) return "error"
  const resp = http.responses[id]
  if (resp && resp.status === 0) return "skipped"
  return "done"
}

async function runSequential(toRun: HttpRequest[], ctx: StoredSendCtx) {
  const store = useFolderRunStore.getState()
  for (const req of toRun) {
    if (useFolderRunStore.getState().cancelRequested) {
      store.setReqStatus(req.id, "skipped")
      continue
    }
    store.setReqStatus(req.id, "running")
    const sent = await resolveAndSendStoredRequest(req, ctx)
    store.setReqStatus(req.id, outcomeFor(req.id, sent))
  }
}

async function runParallel(toRun: HttpRequest[], ctx: StoredSendCtx) {
  const store = useFolderRunStore.getState()
  await Promise.allSettled(
    toRun.map((req) => {
      store.setReqStatus(req.id, "running")
      return resolveAndSendStoredRequest(req, ctx)
        .then((sent) => store.setReqStatus(req.id, outcomeFor(req.id, sent)))
        .catch(() => store.setReqStatus(req.id, "error"))
    }),
  )
}

/** Owns the run loop. The header button only flips `pendingStart`; this hook
 *  (mounted by FolderRunPanel) consumes it and drives the batch. */
export function useFolderRun(
  ordered: HttpRequest[],
  ctx: StoredSendCtx | null,
) {
  const pendingStart = useFolderRunStore((s) => s.pendingStart)
  const cancelRequested = useFolderRunStore((s) => s.cancelRequested)

  const orderedRef = useRef(ordered)
  orderedRef.current = ordered
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const runningRef = useRef(false)

  useEffect(() => {
    if (!pendingStart) return
    const store = useFolderRunStore.getState()
    store.consumeStart()
    if (runningRef.current) return
    const liveCtx = ctxRef.current
    if (!liveCtx) return

    const included = store.included
    const toRun = orderedRef.current.filter((r) => included[r.id] !== false)
    if (toRun.length === 0) return

    runningRef.current = true
    store.start(toRun.map((r) => r.id))
    clearResponseCycleCache()

    const run =
      store.strategy === "parallel"
        ? runParallel(toRun, liveCtx)
        : runSequential(toRun, liveCtx)
    void run.finally(() => {
      runningRef.current = false
      useFolderRunStore.getState().finish()
    })
  }, [pendingStart])

  // Abort every in-flight send. Each resolves to a cancellation shell; the
  // sequential loop then sees `cancelRequested` and skips the rest.
  useEffect(() => {
    if (!cancelRequested) return
    const { status, reqStatus } = useFolderRunStore.getState()
    if (status !== "running") return
    for (const [id, st] of Object.entries(reqStatus)) {
      if (st === "running") void useHttpStore.getState().cancelRequest(id)
    }
  }, [cancelRequested])
}
