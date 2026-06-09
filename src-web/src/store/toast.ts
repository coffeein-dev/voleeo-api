import { create } from "zustand"

export type ToastKind = "info" | "success" | "warning" | "error"

interface ToastState {
  message: string | null
  kind: ToastKind
}

interface ToastStore extends ToastState {
  show: (message: string, durationMs?: number, kind?: ToastKind) => void
  _clear: () => void
}

let _timer: ReturnType<typeof setTimeout> | null = null

export const useToastStore = create<ToastStore>((set) => ({
  message: null,
  kind: "info",

  show: (message, durationMs = 2500, kind = "info") => {
    if (_timer) clearTimeout(_timer)
    set({ message, kind })
    _timer = setTimeout(() => set({ message: null }), durationMs)
  },

  _clear: () => {
    if (_timer) clearTimeout(_timer)
    set({ message: null })
  },
}))
