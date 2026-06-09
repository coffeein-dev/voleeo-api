import { create } from "zustand"
import { errorMessage } from "@/lib/error"
import type {
  CookieJar_Serialize as CookieJar,
  SameSite,
  StoredCookie_Serialize as StoredCookie,
} from "../../../packages/types/bindings"
import { commands } from "../../../packages/types/bindings"

export type { CookieJar, SameSite, StoredCookie }

export const DEFAULT_JAR_ID = "default"

interface CookieStore {
  jars: CookieJar[]
  loadedWorkspaceId: string | null
  activeJarId: string | null
  isLoading: boolean
  error: string | null

  load: (workspaceId: string) => Promise<void>
  reload: () => Promise<void>
  createJar: (workspaceId: string, name: string) => Promise<CookieJar>
  renameJar: (workspaceId: string, jarId: string, name: string) => Promise<void>
  deleteJar: (workspaceId: string, jarId: string) => Promise<void>
  setActive: (workspaceId: string, jarId: string) => Promise<void>
  saveCookie: (
    workspaceId: string,
    jarId: string,
    cookie: StoredCookie,
  ) => Promise<StoredCookie>
  deleteCookie: (
    workspaceId: string,
    jarId: string,
    cookieId: string,
  ) => Promise<void>
  clearJar: (workspaceId: string, jarId: string) => Promise<void>
  clearExpired: (workspaceId: string, jarId: string) => Promise<number>
  reset: () => void
}

function resolveActive(
  jars: CookieJar[],
  requested: string | null,
): string | null {
  if (requested && jars.some((j) => j.id === requested)) return requested
  return jars[0]?.id ?? null
}

export const useCookiesStore = create<CookieStore>((set, get) => ({
  jars: [],
  loadedWorkspaceId: null,
  activeJarId: null,
  isLoading: false,
  error: null,

  load: async (workspaceId) => {
    set({ isLoading: true, error: null })
    const [jarsRes, activeRes] = await Promise.all([
      commands.cookiesListJars(workspaceId),
      commands.cookiesGetActiveJar(workspaceId),
    ])
    if (jarsRes.status === "error") {
      set({
        isLoading: false,
        error: errorMessage(jarsRes.error) ?? "Failed to load cookie jars",
      })
      return
    }
    const jars = jarsRes.data
    const requested = activeRes.status === "ok" ? activeRes.data : null
    set({
      jars,
      loadedWorkspaceId: workspaceId,
      activeJarId: resolveActive(jars, requested),
      isLoading: false,
    })
  },

  reload: async () => {
    const workspaceId = get().loadedWorkspaceId
    if (!workspaceId) return
    const result = await commands.cookiesListJars(workspaceId)
    if (result.status === "ok") {
      set((s) => ({
        jars: result.data,
        activeJarId: resolveActive(result.data, s.activeJarId),
      }))
    }
  },

  createJar: async (workspaceId, name) => {
    const result = await commands.cookiesCreateJar(workspaceId, name)
    if (result.status === "error") {
      throw new Error(errorMessage(result.error) ?? "Failed to create jar")
    }
    set((s) => ({ jars: [...s.jars, result.data] }))
    return result.data
  },

  renameJar: async (workspaceId, jarId, name) => {
    const result = await commands.cookiesRenameJar(workspaceId, jarId, name)
    if (result.status === "error") {
      throw new Error(errorMessage(result.error) ?? "Failed to rename jar")
    }
    set((s) => ({
      jars: s.jars.map((j) => (j.id === jarId ? result.data : j)),
    }))
  },

  deleteJar: async (workspaceId, jarId) => {
    const result = await commands.cookiesDeleteJar(workspaceId, jarId)
    if (result.status === "error") {
      throw new Error(errorMessage(result.error) ?? "Failed to delete jar")
    }
    set((s) => {
      const jars = s.jars.filter((j) => j.id !== jarId)
      return {
        jars,
        activeJarId: resolveActive(jars, result.data ?? null),
      }
    })
  },

  setActive: async (workspaceId, jarId) => {
    const result = await commands.cookiesSetActiveJar(workspaceId, jarId)
    if (result.status === "error") {
      throw new Error(errorMessage(result.error) ?? "Failed to set active jar")
    }
    set({ activeJarId: jarId })
  },

  saveCookie: async (workspaceId, jarId, cookie) => {
    const result = await commands.cookiesSaveCookie(workspaceId, jarId, cookie)
    if (result.status === "error") {
      throw new Error(errorMessage(result.error) ?? "Failed to save cookie")
    }
    const saved = result.data
    set((s) => ({
      jars: s.jars.map((j) => {
        if (j.id !== jarId) return j
        const idx = j.cookies.findIndex((c) => c.id === saved.id)
        const next =
          idx >= 0
            ? j.cookies.map((c) => (c.id === saved.id ? saved : c))
            : [...j.cookies, saved]
        return { ...j, cookies: next }
      }),
    }))
    return saved
  },

  deleteCookie: async (workspaceId, jarId, cookieId) => {
    const result = await commands.cookiesDeleteCookie(
      workspaceId,
      jarId,
      cookieId,
    )
    if (result.status === "error") {
      throw new Error(errorMessage(result.error) ?? "Failed to delete cookie")
    }
    set((s) => ({
      jars: s.jars.map((j) =>
        j.id === jarId
          ? { ...j, cookies: j.cookies.filter((c) => c.id !== cookieId) }
          : j,
      ),
    }))
  },

  clearJar: async (workspaceId, jarId) => {
    const result = await commands.cookiesClearJar(workspaceId, jarId)
    if (result.status === "error") {
      throw new Error(errorMessage(result.error) ?? "Failed to clear jar")
    }
    set((s) => ({
      jars: s.jars.map((j) => (j.id === jarId ? { ...j, cookies: [] } : j)),
    }))
  },

  clearExpired: async (workspaceId, jarId) => {
    const result = await commands.cookiesClearExpired(workspaceId, jarId)
    if (result.status === "error") {
      throw new Error(
        errorMessage(result.error) ?? "Failed to clear expired cookies",
      )
    }
    const now = Date.now()
    set((s) => ({
      jars: s.jars.map((j) =>
        j.id === jarId
          ? {
              ...j,
              cookies: j.cookies.filter(
                (c) => !c.expires || new Date(c.expires).getTime() > now,
              ),
            }
          : j,
      ),
    }))
    return result.data
  },

  reset: () => {
    set({
      jars: [],
      loadedWorkspaceId: null,
      activeJarId: null,
      isLoading: false,
      error: null,
    })
  },
}))
