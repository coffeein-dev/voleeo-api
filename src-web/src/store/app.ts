import { invoke } from "@tauri-apps/api/core"
import type { z } from "zod"
import { create } from "zustand"
import { AppInfoSchema } from "@/lib/schemas"

export type AppInfo = z.infer<typeof AppInfoSchema>

interface AppStore {
  info: AppInfo | null
  fetchInfo: () => Promise<void>
}

export const useAppStore = create<AppStore>((set) => ({
  info: null,

  fetchInfo: async () => {
    try {
      const raw = await invoke("get_app_info")
      set({ info: AppInfoSchema.parse(raw) })
    } catch (e) {
      console.error("Failed to fetch app info:", e)
    }
  },
}))
