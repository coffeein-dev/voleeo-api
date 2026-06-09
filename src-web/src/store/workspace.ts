import { invoke } from "@tauri-apps/api/core"
import { emit, listen } from "@tauri-apps/api/event"
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import {
  currentMonitor,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window"
import { create } from "zustand"
import { WorkspaceListSchema } from "@/lib/schemas"
import type {
  AuthConfig,
  DnsOverride,
  RequestParameter,
} from "../../../packages/types/bindings"
import { commands } from "../../../packages/types/bindings"

export type { AuthConfig, DnsOverride, RequestParameter }

import {
  getCachedSettings,
  loadAllSettings,
  patchSettings,
} from "@/lib/workspaceSettings"

export type Tool = "welcome" | "api" | "git"
export type PanelLayout = "columns" | "rows"
/** Workspace settings sections that can be deep-linked from anywhere in the app. */
export type WorkspaceSettingsSection =
  | "workspace"
  | "storage"
  | "headers"
  | "auth"
  | "dns"

export interface Workspace {
  id: string
  name: string
  model: string
  encrypted?: boolean
  syncDir?: string | null
  headers?: RequestParameter[]
  auth?: AuthConfig
  dnsOverrides?: DnsOverride[]
  createdAt: string
  updatedAt: string
}

const WELCOME_WIDTH = 900
const WELCOME_HEIGHT = 680
const DEFAULT_WORKSPACE_WIDTH = 1000
const DEFAULT_WORKSPACE_HEIGHT = 800

function getLayout(wsId: string): PanelLayout {
  const l = getCachedSettings(wsId).panelLayout
  return l === "rows" ? "rows" : "columns"
}

function getTreeVisible(wsId: string): boolean {
  return getCachedSettings(wsId).treeVisible ?? true
}

let ignoringResizeCount = 0

async function applyWindowSize(
  width: number,
  height: number,
  resizable = true,
) {
  try {
    const win = getCurrentWebviewWindow()
    const monitor = await currentMonitor()
    ignoringResizeCount += 1
    await win.setResizable(resizable)
    await win.setSize(new LogicalSize(width, height))
    if (monitor) {
      const sf = monitor.scaleFactor
      const mw = monitor.size.width / sf
      const mh = monitor.size.height / sf
      const mx = monitor.position.x / sf
      const my = monitor.position.y / sf
      await win.setPosition(
        new LogicalPosition(
          Math.round(mx + (mw - width) / 2),
          Math.round(my + (mh - height) / 2),
        ),
      )
    }
  } catch {
  } finally {
    setTimeout(() => {
      ignoringResizeCount -= 1
    }, 600)
  }
}

/** Resize + centre the window to the welcome-screen dimensions. */
export function applyWelcomeWindowSize() {
  return applyWindowSize(WELCOME_WIDTH, WELCOME_HEIGHT, false)
}

interface UiStore {
  activeTool: Tool
  activeWorkspaceId: string | null
  workspaces: Workspace[]
  workspaceWindowMap: Record<string, string>
  panelLayout: PanelLayout
  treeVisible: boolean
  pendingSettingsSection: WorkspaceSettingsSection | null
  pendingSettingsFocusKey: string | null
  setActiveTool: (tool: Tool) => void
  openWorkspace: (id: string, tool?: Tool) => void
  loadWorkspaces: () => Promise<void>
  togglePanelLayout: () => void
  toggleTreeVisible: () => void
  requestWorkspaceSettings: (
    section: WorkspaceSettingsSection,
    focusKey?: string,
  ) => void
  clearPendingSettings: () => void
  pendingCookies: { jarId: string | null } | null
  pendingEnv: { envId: string | null } | null
  requestCookies: (jarId: string | null) => void
  clearPendingCookies: () => void
  requestEnvironments: (envId: string | null) => void
  clearPendingEnv: () => void
  updateWorkspaceHeaders: (
    workspaceId: string,
    headers: RequestParameter[],
  ) => Promise<void>
  updateWorkspaceAuth: (workspaceId: string, auth: AuthConfig) => Promise<void>
  updateWorkspaceDnsOverrides: (
    workspaceId: string,
    overrides: DnsOverride[],
  ) => Promise<void>
}

export const useUiStore = create<UiStore>((set, get) => ({
  activeTool: "welcome",
  activeWorkspaceId: null,
  workspaces: [],
  workspaceWindowMap: {},
  panelLayout: "columns",
  treeVisible: true,
  pendingSettingsSection: null,
  pendingSettingsFocusKey: null,
  setActiveTool: (tool) => {
    set({ activeTool: tool })
    if (tool === "welcome") {
      applyWindowSize(WELCOME_WIDTH, WELCOME_HEIGHT, false)
    }
  },
  requestWorkspaceSettings: (section, focusKey) =>
    set({
      pendingSettingsSection: section,
      pendingSettingsFocusKey: focusKey ?? null,
    }),
  clearPendingSettings: () =>
    set({ pendingSettingsSection: null, pendingSettingsFocusKey: null }),
  pendingCookies: null,
  pendingEnv: null,
  requestCookies: (jarId) => set({ pendingCookies: { jarId } }),
  clearPendingCookies: () => set({ pendingCookies: null }),
  requestEnvironments: (envId) => set({ pendingEnv: { envId } }),
  clearPendingEnv: () => set({ pendingEnv: null }),
  togglePanelLayout: () =>
    set((s) => {
      const next: PanelLayout = s.panelLayout === "columns" ? "rows" : "columns"
      if (s.activeWorkspaceId)
        patchSettings(s.activeWorkspaceId, { panelLayout: next })
      return { panelLayout: next }
    }),
  toggleTreeVisible: () =>
    set((s) => {
      const next = !s.treeVisible
      if (s.activeWorkspaceId)
        patchSettings(s.activeWorkspaceId, { treeVisible: next })
      return { treeVisible: next }
    }),
  openWorkspace: (id, tool?) => {
    patchSettings(id, { openedAt: new Date().toISOString() })
    set({
      activeWorkspaceId: id,
      activeTool: tool ?? "api",
      panelLayout: getLayout(id),
      treeVisible: getTreeVisible(id),
    })
    import("./environment")
      .then(({ useEnvironmentStore }) => {
        useEnvironmentStore.getState().load(id)
      })
      .catch(() => {})
    import("./git")
      .then(({ useGitStore }) => {
        useGitStore.getState().load(id)
      })
      .catch(() => {})
    import("./cookies")
      .then(({ useCookiesStore }) => {
        useCookiesStore.getState().load(id)
      })
      .catch(() => {})
    const saved = getCachedSettings(id).windowSize
    applyWindowSize(
      saved?.width ?? DEFAULT_WORKSPACE_WIDTH,
      saved?.height ?? DEFAULT_WORKSPACE_HEIGHT,
      true,
    )
    try {
      const label = getCurrentWebviewWindow().label
      emit("workspace:window:registered", {
        workspaceId: id,
        windowLabel: label,
      }).catch(() => {})
    } catch {}
  },
  loadWorkspaces: async () => {
    const [raw] = await Promise.all([
      invoke("list_workspaces").catch(() => null),
      loadAllSettings(),
    ])
    const workspaces = raw
      ? (WorkspaceListSchema.catch(get().workspaces).parse(raw) as Workspace[])
      : get().workspaces
    set({ workspaces })
  },
  updateWorkspaceHeaders: async (workspaceId, headers) => {
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId
          ? { ...w, headers, updatedAt: new Date().toISOString() }
          : w,
      ),
    }))
    await commands.updateWorkspaceHeaders(workspaceId, headers)
  },
  updateWorkspaceAuth: async (workspaceId, auth) => {
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId
          ? { ...w, auth, updatedAt: new Date().toISOString() }
          : w,
      ),
    }))
    await commands.updateWorkspaceAuth(workspaceId, auth)
  },
  updateWorkspaceDnsOverrides: async (workspaceId, overrides) => {
    set((s) => ({
      workspaces: s.workspaces.map((w) =>
        w.id === workspaceId
          ? {
              ...w,
              dnsOverrides: overrides,
              updatedAt: new Date().toISOString(),
            }
          : w,
      ),
    }))
    await commands.updateWorkspaceDnsOverrides(workspaceId, overrides)
  },
}))

let resizeTimer: ReturnType<typeof setTimeout> | null = null
getCurrentWebviewWindow()
  .onResized(async ({ payload: size }) => {
    if (ignoringResizeCount > 0) return
    const { activeWorkspaceId } = useUiStore.getState()
    if (!activeWorkspaceId) return
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(async () => {
      try {
        // onResized delivers physical pixels — convert to logical before saving
        const monitor = await currentMonitor()
        const sf = monitor?.scaleFactor ?? 1
        patchSettings(activeWorkspaceId, {
          windowSize: {
            width: Math.round(size.width / sf),
            height: Math.round(size.height / sf),
          },
        })
      } catch {}
    }, 500)
  })
  .catch(() => {})

listen<{ workspaceId: string; windowLabel: string }>(
  "workspace:window:registered",
  (e) => {
    useUiStore.setState((s) => ({
      workspaceWindowMap: {
        ...s.workspaceWindowMap,
        [e.payload.workspaceId]: e.payload.windowLabel,
      },
    }))
  },
).catch(() => {})

listen("workspace:window:announce", () => {
  const { activeWorkspaceId } = useUiStore.getState()
  if (!activeWorkspaceId) return
  try {
    const label = getCurrentWebviewWindow().label
    emit("workspace:window:registered", {
      workspaceId: activeWorkspaceId,
      windowLabel: label,
    }).catch(() => {})
  } catch {}
}).catch(() => {})

listen("workspace:close", () => {
  useUiStore.setState({ activeTool: "welcome", activeWorkspaceId: null })
  applyWindowSize(WELCOME_WIDTH, WELCOME_HEIGHT, false)
  import("./environment")
    .then(({ useEnvironmentStore }) => {
      useEnvironmentStore.getState().reset()
    })
    .catch(() => {})
  import("./cookies")
    .then(({ useCookiesStore }) => {
      useCookiesStore.getState().reset()
    })
    .catch(() => {})
  import("./git")
    .then(({ useGitStore }) => {
      useGitStore.getState().reset()
    })
    .catch(() => {})
}).catch(() => {})
