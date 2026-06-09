import { create } from "zustand"
import { saveItemsCount } from "@/lib/workspaceCounts"
import type {
  ApiFolder,
  AuthConfig,
  BodyField,
  BodyKind,
  EnvironmentVariable,
  HttpRequest,
  MoveItemUpdate,
  RequestBody,
  RequestParameter,
  WsConnection,
} from "../../../packages/types/bindings"
import { commands } from "../../../packages/types/bindings"

export type {
  ApiFolder,
  AuthConfig,
  BodyField,
  BodyKind,
  EnvironmentVariable,
  HttpRequest,
  MoveItemUpdate,
  RequestBody,
  RequestParameter,
  WsConnection,
}

export type TreeNode =
  | { kind: "folder"; folder: ApiFolder; children: TreeNode[] }
  | { kind: "request"; request: HttpRequest }
  | { kind: "websocket"; connection: WsConnection }

function effectiveOrder(order: number | undefined, createdAt: string): number {
  return order ? order : Date.parse(createdAt)
}

function nodeOrder(n: TreeNode): number {
  if (n.kind === "folder")
    return effectiveOrder(n.folder.order ?? undefined, n.folder.createdAt)
  if (n.kind === "request")
    return effectiveOrder(n.request.order ?? undefined, n.request.createdAt)
  return effectiveOrder(n.connection.order ?? undefined, n.connection.createdAt)
}

export const DEFAULT_REQUEST_NAME = "New Request"
export const DEFAULT_CONNECTION_NAME = "New WebSocket"

const LAST_REQUEST_KEY_PREFIX = "voleeo:lastRequest:"
const RECENT_REQUESTS_KEY_PREFIX = "voleeo:recentRequests:"
const MAX_RECENT = 6

function lastRequestStorageKey(workspaceId: string) {
  return `${LAST_REQUEST_KEY_PREFIX}${workspaceId}`
}

function recentRequestsStorageKey(workspaceId: string) {
  return `${RECENT_REQUESTS_KEY_PREFIX}${workspaceId}`
}

function loadLastRequestId(workspaceId: string): string | null {
  try {
    const raw = localStorage.getItem(lastRequestStorageKey(workspaceId))
    if (raw == null || raw === "") return null
    return raw
  } catch {
    return null
  }
}

function saveLastRequestId(workspaceId: string, requestId: string | null) {
  try {
    if (requestId == null)
      localStorage.removeItem(lastRequestStorageKey(workspaceId))
    else localStorage.setItem(lastRequestStorageKey(workspaceId), requestId)
  } catch {}
}

function loadRecentRequestIds(workspaceId: string): string[] {
  try {
    const raw = localStorage.getItem(recentRequestsStorageKey(workspaceId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : []
  } catch {
    return []
  }
}

function saveRecentRequestIds(workspaceId: string, ids: string[]) {
  try {
    localStorage.setItem(
      recentRequestsStorageKey(workspaceId),
      JSON.stringify(ids),
    )
  } catch {}
}

function pushRecent(current: string[], id: string): string[] {
  const deduped = current.filter((i) => i !== id)
  return [id, ...deduped].slice(0, MAX_RECENT)
}

export function buildTree(
  folders: ApiFolder[],
  requests: HttpRequest[],
  connections: WsConnection[] = [],
  parentId: string | null = null,
): TreeNode[] {
  const folderNodes: TreeNode[] = folders
    .filter((f) => (f.folderId ?? null) === parentId)
    .map((folder) => ({
      kind: "folder" as const,
      folder,
      children: buildTree(folders, requests, connections, folder.id),
    }))

  const requestNodes: TreeNode[] = requests
    .filter((r) => (r.folderId ?? null) === parentId)
    .map((request) => ({ kind: "request" as const, request }))

  const connectionNodes: TreeNode[] = connections
    .filter((c) => (c.folderId ?? null) === parentId)
    .map((connection) => ({ kind: "websocket" as const, connection }))

  // Sort all three kinds together by effective order (numeric, not string).
  return [...folderNodes, ...requestNodes, ...connectionNodes].sort(
    (a, b) => nodeOrder(a) - nodeOrder(b),
  )
}

export function selectActiveRequest(state: RequestStore): HttpRequest | null {
  const { activeRequestId, requests } = state
  if (!activeRequestId) return null
  return requests.find((r) => r.id === activeRequestId) ?? null
}

export function selectActiveFolder(state: RequestStore): ApiFolder | null {
  const { activeFolderId, folders } = state
  if (!activeFolderId) return null
  return folders.find((f) => f.id === activeFolderId) ?? null
}

export function selectActiveConnection(
  state: RequestStore,
): WsConnection | null {
  const { activeConnectionId, connections } = state
  if (!activeConnectionId) return null
  return connections.find((c) => c.id === activeConnectionId) ?? null
}

interface RequestStore {
  folders: ApiFolder[]
  requests: HttpRequest[]
  connections: WsConnection[]
  tree: TreeNode[]
  /** Mutually exclusive with `activeFolderId`/`activeConnectionId`. */
  activeRequestId: string | null
  /** Mutually exclusive with `activeRequestId`/`activeConnectionId`. */
  activeFolderId: string | null
  /** Mutually exclusive with `activeRequestId`/`activeFolderId`. */
  activeConnectionId: string | null
  loadedWorkspaceId: string | null
  recentRequestIds: string[]
  pendingFolderFocus: {
    folderId: string
    tab: "headers" | "variables"
    key: string
  } | null

  load: (workspaceId: string) => Promise<void>
  reload: () => Promise<void>
  setActiveRequest: (id: string | null) => void
  setActiveFolder: (id: string | null) => void
  setActiveConnection: (id: string | null) => void
  focusFolderVariable: (folderId: string, key: string) => void
  focusFolderHeader: (folderId: string, key: string) => void
  consumePendingFolderFocus: () => void
  createRequest: (
    workspaceId: string,
    opts?: { folderId?: string; name?: string; method?: string; url?: string },
  ) => Promise<HttpRequest | null>
  createFolder: (
    workspaceId: string,
    opts?: { folderId?: string; name?: string },
  ) => Promise<ApiFolder | null>
  createConnection: (
    workspaceId: string,
    opts?: { folderId?: string; name?: string; url?: string },
  ) => Promise<WsConnection | null>
  moveItems: (workspaceId: string, updates: MoveItemUpdate[]) => Promise<void>
  duplicateRequest: (workspaceId: string, id: string) => Promise<void>
  duplicateFolder: (workspaceId: string, id: string) => Promise<void>
  duplicateConnection: (workspaceId: string, id: string) => Promise<void>
  renameRequest: (
    workspaceId: string,
    id: string,
    name: string,
  ) => Promise<void>
  renameFolder: (workspaceId: string, id: string, name: string) => Promise<void>
  renameConnection: (
    workspaceId: string,
    id: string,
    name: string,
  ) => Promise<void>
  deleteRequest: (workspaceId: string, id: string) => Promise<void>
  deleteFolder: (workspaceId: string, id: string) => Promise<void>
  deleteConnection: (workspaceId: string, id: string) => Promise<void>
  updateRequest: (
    workspaceId: string,
    id: string,
    method: string,
    url: string,
    parameters?: RequestParameter[],
    headers?: RequestParameter[],
    body?: RequestBody | null,
    auth?: AuthConfig,
  ) => Promise<void>
  /** Persist a connection's editable fields + reflect optimistically in the tree. */
  updateConnection: (
    workspaceId: string,
    id: string,
    patch: {
      url: string
      parameters: RequestParameter[]
      headers: RequestParameter[]
      auth: AuthConfig
    },
  ) => Promise<void>
  updateFolder: (
    workspaceId: string,
    id: string,
    headers: RequestParameter[],
    auth: AuthConfig,
  ) => Promise<void>
  updateFolderColor: (
    workspaceId: string,
    id: string,
    color: string | null,
  ) => Promise<void>
  updateFolderVariables: (
    workspaceId: string,
    id: string,
    variables: EnvironmentVariable[],
  ) => Promise<void>
}

export const useRequestStore = create<RequestStore>((set, get) => ({
  folders: [],
  requests: [],
  connections: [],
  tree: [],
  activeRequestId: null,
  activeFolderId: null,
  activeConnectionId: null,
  loadedWorkspaceId: null,
  recentRequestIds: [],
  pendingFolderFocus: null,

  load: async (workspaceId) => {
    if (get().loadedWorkspaceId === workspaceId) return
    const [foldersRes, requestsRes, connectionsRes] = await Promise.all([
      commands.listFolders(workspaceId),
      commands.listRequests(workspaceId),
      commands.listWsConnections(workspaceId),
    ])
    const folders = foldersRes.status === "ok" ? foldersRes.data : []
    const requests = requestsRes.status === "ok" ? requestsRes.data : []
    const connections =
      connectionsRes.status === "ok" ? connectionsRes.data : []
    const remembered = loadLastRequestId(workspaceId)
    const activeRequestId =
      remembered != null && requests.some((r) => r.id === remembered)
        ? remembered
        : null
    const requestIds = new Set(requests.map((r) => r.id))
    const recentRequestIds = loadRecentRequestIds(workspaceId).filter((id) =>
      requestIds.has(id),
    )
    set({
      folders,
      requests,
      connections,
      tree: buildTree(folders, requests, connections),
      loadedWorkspaceId: workspaceId,
      activeRequestId,
      recentRequestIds,
    })
  },

  reload: async () => {
    const workspaceId = get().loadedWorkspaceId
    if (!workspaceId) return
    const [foldersRes, requestsRes, connectionsRes] = await Promise.all([
      commands.listFolders(workspaceId),
      commands.listRequests(workspaceId),
      commands.listWsConnections(workspaceId),
    ])
    const folders = foldersRes.status === "ok" ? foldersRes.data : []
    const requests = requestsRes.status === "ok" ? requestsRes.data : []
    const connections =
      connectionsRes.status === "ok" ? connectionsRes.data : []
    set({
      folders,
      requests,
      connections,
      tree: buildTree(folders, requests, connections),
    })
  },

  setActiveRequest: (id) => {
    const { loadedWorkspaceId, recentRequestIds } = get()
    if (loadedWorkspaceId) saveLastRequestId(loadedWorkspaceId, id)
    const next = id ? pushRecent(recentRequestIds, id) : recentRequestIds
    if (loadedWorkspaceId && id) saveRecentRequestIds(loadedWorkspaceId, next)
    set({
      activeRequestId: id,
      activeFolderId: null,
      activeConnectionId: null,
      recentRequestIds: next,
    })
  },

  setActiveFolder: (id) => {
    if (id)
      set({
        activeFolderId: id,
        activeRequestId: null,
        activeConnectionId: null,
      })
    else set({ activeFolderId: null })
  },

  setActiveConnection: (id) => {
    if (id)
      set({
        activeConnectionId: id,
        activeRequestId: null,
        activeFolderId: null,
      })
    else set({ activeConnectionId: null })
  },

  focusFolderVariable: (folderId, key) =>
    set({
      activeFolderId: folderId,
      activeRequestId: null,
      activeConnectionId: null,
      pendingFolderFocus: { folderId, tab: "variables", key },
    }),

  focusFolderHeader: (folderId, key) =>
    set({
      activeFolderId: folderId,
      activeRequestId: null,
      activeConnectionId: null,
      pendingFolderFocus: { folderId, tab: "headers", key },
    }),

  consumePendingFolderFocus: () => set({ pendingFolderFocus: null }),

  createRequest: async (workspaceId, opts = {}) => {
    const res = await commands.createRequest(
      workspaceId,
      opts.folderId ?? null,
      opts.name ?? DEFAULT_REQUEST_NAME,
      opts.method ?? "GET",
      opts.url ?? "",
    )
    if (res.status !== "ok") return null
    const req = res.data
    saveLastRequestId(workspaceId, req.id)
    set((s) => {
      const requests = [...s.requests, req]
      return {
        requests,
        tree: buildTree(s.folders, requests, s.connections),
        activeRequestId: req.id,
        activeFolderId: null,
        activeConnectionId: null,
      }
    })
    return req
  },

  createFolder: async (workspaceId, opts = {}) => {
    const res = await commands.createFolder(
      workspaceId,
      opts.folderId ?? null,
      opts.name ?? "New Folder",
    )
    if (res.status !== "ok") return null
    const folder = res.data
    set((s) => {
      const folders = [...s.folders, folder]
      return { folders, tree: buildTree(folders, s.requests, s.connections) }
    })
    return folder
  },

  createConnection: async (workspaceId, opts = {}) => {
    const res = await commands.createWsConnection(
      workspaceId,
      opts.folderId ?? null,
      opts.name ?? DEFAULT_CONNECTION_NAME,
      opts.url ?? "",
    )
    if (res.status !== "ok") return null
    const connection = res.data
    set((s) => {
      const connections = [...s.connections, connection]
      return {
        connections,
        tree: buildTree(s.folders, s.requests, connections),
        activeConnectionId: connection.id,
        activeRequestId: null,
        activeFolderId: null,
      }
    })
    return connection
  },

  duplicateRequest: async (workspaceId, id) => {
    const res = await commands.duplicateRequest(workspaceId, id)
    if (res.status !== "ok") return
    set((s) => {
      const requests = [...s.requests, res.data]
      return { requests, tree: buildTree(s.folders, requests, s.connections) }
    })
  },

  duplicateFolder: async (workspaceId, id) => {
    const res = await commands.duplicateFolder(workspaceId, id)
    if (res.status !== "ok") return
    await get().reload()
  },

  duplicateConnection: async (workspaceId, id) => {
    const res = await commands.duplicateWsConnection(workspaceId, id)
    if (res.status !== "ok") return
    set((s) => {
      const connections = [...s.connections, res.data]
      return {
        connections,
        tree: buildTree(s.folders, s.requests, connections),
      }
    })
  },

  renameRequest: async (workspaceId, id, name) => {
    set((s) => {
      const requests = s.requests.map((r) => (r.id === id ? { ...r, name } : r))
      return { requests, tree: buildTree(s.folders, requests, s.connections) }
    })
    await commands.renameRequest(workspaceId, id, name)
  },

  renameFolder: async (workspaceId, id, name) => {
    set((s) => {
      const folders = s.folders.map((f) => (f.id === id ? { ...f, name } : f))
      return { folders, tree: buildTree(folders, s.requests, s.connections) }
    })
    await commands.renameFolder(workspaceId, id, name)
  },

  renameConnection: async (workspaceId, id, name) => {
    set((s) => {
      const connections = s.connections.map((c) =>
        c.id === id ? { ...c, name } : c,
      )
      return {
        connections,
        tree: buildTree(s.folders, s.requests, connections),
      }
    })
    await commands.renameWsConnection(workspaceId, id, name)
  },

  deleteRequest: async (workspaceId, id) => {
    set((s) => {
      const idx = s.requests.findIndex((r) => r.id === id)
      const requests = s.requests.filter((r) => r.id !== id)
      const nextActiveId =
        s.activeRequestId === id
          ? ((requests[idx] ?? requests[idx - 1] ?? null)?.id ?? null)
          : s.activeRequestId
      return {
        requests,
        tree: buildTree(s.folders, requests, s.connections),
        activeRequestId: nextActiveId,
      }
    })
    await commands.deleteRequest(workspaceId, id)
  },

  deleteConnection: async (workspaceId, id) => {
    set((s) => {
      const connections = s.connections.filter((c) => c.id !== id)
      return {
        connections,
        tree: buildTree(s.folders, s.requests, connections),
        activeConnectionId:
          s.activeConnectionId === id ? null : s.activeConnectionId,
      }
    })
    await commands.deleteWsConnection(workspaceId, id)
  },

  deleteFolder: async (workspaceId, id) => {
    set((s) => {
      const allFolderIds = new Set<string>()
      const queue = [id]
      while (queue.length > 0) {
        const fid = queue.pop()
        if (!fid) break
        allFolderIds.add(fid)
        for (const f of s.folders.filter((f) => f.folderId === fid)) {
          queue.push(f.id)
        }
      }
      const folders = s.folders.filter((f) => !allFolderIds.has(f.id))
      const requests = s.requests.filter(
        (r) => !allFolderIds.has(r.folderId ?? ""),
      )
      const connections = s.connections.filter(
        (c) => !allFolderIds.has(c.folderId ?? ""),
      )
      const activeInDeleted =
        !!s.activeRequestId &&
        allFolderIds.has(
          s.requests.find((r) => r.id === s.activeRequestId)?.folderId ?? "",
        )
      let nextActiveId = s.activeRequestId
      if (activeInDeleted) {
        const oldIdx = s.requests.findIndex((r) => r.id === s.activeRequestId)
        nextActiveId =
          (requests[oldIdx] ?? requests[oldIdx - 1] ?? null)?.id ?? null
      }
      const nextActiveFolderId =
        s.activeFolderId && allFolderIds.has(s.activeFolderId)
          ? null
          : s.activeFolderId
      const connActiveInDeleted =
        !!s.activeConnectionId &&
        allFolderIds.has(
          s.connections.find((c) => c.id === s.activeConnectionId)?.folderId ??
            "",
        )
      return {
        folders,
        requests,
        connections,
        tree: buildTree(folders, requests, connections),
        activeRequestId: nextActiveId,
        activeFolderId: nextActiveFolderId,
        activeConnectionId: connActiveInDeleted ? null : s.activeConnectionId,
      }
    })
    await commands.deleteFolder(workspaceId, id)
  },

  updateRequest: async (
    workspaceId,
    id,
    method,
    url,
    parameters,
    headers,
    body,
    auth,
  ) => {
    const params = parameters ?? []
    const hdrs = headers ?? []
    const existing = get().requests.find((r) => r.id === id)
    const persistedBody = body !== undefined ? body : (existing?.body ?? null)
    const persistedAuth: AuthConfig = auth ?? existing?.auth ?? { kind: "none" }
    set((s) => {
      const requests = s.requests.map((r) =>
        r.id === id
          ? {
              ...r,
              method,
              url,
              parameters: params,
              headers: hdrs,
              body: body !== undefined ? body : r.body,
              auth: persistedAuth,
              updatedAt: new Date().toISOString(),
            }
          : r,
      )
      return { requests, tree: buildTree(s.folders, requests, s.connections) }
    })
    await commands.updateRequest(
      workspaceId,
      id,
      method,
      url,
      params,
      hdrs,
      persistedBody,
      persistedAuth,
    )
  },

  updateConnection: async (workspaceId, id, patch) => {
    set((s) => {
      const connections = s.connections.map((c) =>
        c.id === id
          ? { ...c, ...patch, updatedAt: new Date().toISOString() }
          : c,
      )
      return {
        connections,
        tree: buildTree(s.folders, s.requests, connections),
      }
    })
    await commands.updateWsConnection(
      workspaceId,
      id,
      patch.url,
      patch.parameters,
      patch.headers,
      patch.auth,
    )
  },

  updateFolder: async (workspaceId, id, headers, auth) => {
    set((s) => {
      const folders = s.folders.map((f) =>
        f.id === id
          ? { ...f, headers, auth, updatedAt: new Date().toISOString() }
          : f,
      )
      return { folders, tree: buildTree(folders, s.requests, s.connections) }
    })
    await commands.updateFolder(workspaceId, id, headers, auth)
  },

  updateFolderColor: async (workspaceId, id, color) => {
    set((s) => {
      const folders = s.folders.map((f) =>
        f.id === id ? { ...f, color, updatedAt: new Date().toISOString() } : f,
      )
      return { folders, tree: buildTree(folders, s.requests, s.connections) }
    })
    await commands.updateFolderColor(workspaceId, id, color)
  },

  updateFolderVariables: async (workspaceId, id, variables) => {
    set((s) => {
      const folders = s.folders.map((f) =>
        f.id === id
          ? { ...f, variables, updatedAt: new Date().toISOString() }
          : f,
      )
      return { folders, tree: buildTree(folders, s.requests, s.connections) }
    })
    await commands.updateFolderVariables(workspaceId, id, variables)
  },

  moveItems: async (workspaceId, updates) => {
    set((s) => {
      const folders = s.folders.map((f) => {
        const u = updates.find((u) => u.id === f.id && u.kind === "folder")
        return u ? { ...f, folderId: u.folderId, order: u.order } : f
      })
      const requests = s.requests.map((r) => {
        const u = updates.find((u) => u.id === r.id && u.kind === "request")
        return u ? { ...r, folderId: u.folderId, order: u.order } : r
      })
      const connections = s.connections.map((c) => {
        const u = updates.find((u) => u.id === c.id && u.kind === "webSocket")
        return u ? { ...c, folderId: u.folderId, order: u.order } : c
      })
      return {
        folders,
        requests,
        connections,
        tree: buildTree(folders, requests, connections),
      }
    })
    await commands.moveItems(workspaceId, updates)
  },
}))

useRequestStore.subscribe((state, prev) => {
  if (state.requests !== prev.requests && state.loadedWorkspaceId) {
    saveItemsCount(state.loadedWorkspaceId, state.requests.length)
  }
})
