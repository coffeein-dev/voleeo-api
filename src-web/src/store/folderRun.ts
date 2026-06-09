import { create } from "zustand"

export type RunStrategy = "sequential" | "parallel"
export type ReqRunStatus = "pending" | "running" | "done" | "error" | "skipped"

interface FolderRunStore {
  folderId: string | null
  strategy: RunStrategy
  /** requestId → checked. Absent ids default to included. */
  included: Record<string, boolean>
  status: "idle" | "running"
  reqStatus: Record<string, ReqRunStatus>
  /** Sequential loop checks this between sends; parallel cancels in-flight. */
  cancelRequested: boolean
  /** Header run button → orchestrator handshake (the loop lives in the panel). */
  pendingStart: boolean

  /** Reset selection/status when the target folder or its request set changes.
   *  Idempotent: a no-op when the folder and id set are unchanged. */
  initFor: (folderId: string, requestIds: string[]) => void
  setStrategy: (s: RunStrategy) => void
  toggleIncluded: (id: string) => void
  setAll: (checked: boolean, ids: string[]) => void
  requestStart: () => void
  consumeStart: () => void
  start: (ids: string[]) => void
  setReqStatus: (id: string, s: ReqRunStatus) => void
  finish: () => void
  requestCancel: () => void
}

function sameKeys(a: Record<string, unknown>, ids: string[]): boolean {
  const keys = Object.keys(a)
  if (keys.length !== ids.length) return false
  return ids.every((id) => id in a)
}

export const useFolderRunStore = create<FolderRunStore>((set) => ({
  folderId: null,
  strategy: "sequential",
  included: {},
  status: "idle",
  reqStatus: {},
  cancelRequested: false,
  pendingStart: false,

  initFor: (folderId, requestIds) =>
    set((s) => {
      if (s.folderId === folderId && sameKeys(s.included, requestIds)) return s
      const included: Record<string, boolean> = {}
      for (const id of requestIds) included[id] = true
      return {
        folderId,
        included,
        reqStatus: {},
        status: "idle",
        cancelRequested: false,
        pendingStart: false,
      }
    }),

  setStrategy: (strategy) => set({ strategy }),

  toggleIncluded: (id) =>
    set((s) => ({ included: { ...s.included, [id]: !s.included[id] } })),

  setAll: (checked, ids) =>
    set(() => {
      const included: Record<string, boolean> = {}
      for (const id of ids) included[id] = checked
      return { included }
    }),

  requestStart: () => set({ pendingStart: true }),
  consumeStart: () => set({ pendingStart: false }),

  start: (ids) =>
    set(() => {
      const reqStatus: Record<string, ReqRunStatus> = {}
      for (const id of ids) reqStatus[id] = "pending"
      return { status: "running", cancelRequested: false, reqStatus }
    }),

  setReqStatus: (id, status) =>
    set((s) => ({ reqStatus: { ...s.reqStatus, [id]: status } })),

  finish: () => set({ status: "idle", cancelRequested: false }),

  requestCancel: () => set({ cancelRequested: true }),
}))
