import type { PromptAskResult } from "@voleeo/plugin-api"
import { create } from "zustand"

interface PromptOpts {
  title?: string
  defaultValue?: string
  placeholder?: string
}

interface PendingPrompt {
  id: string
  opts: PromptOpts
  resolvers: Array<(result: PromptAskResult | null) => void>
}

function sameOpts(a: PromptOpts, b: PromptOpts): boolean {
  return (
    a.title === b.title &&
    a.defaultValue === b.defaultValue &&
    a.placeholder === b.placeholder
  )
}

/** Tracks whether a function-modal preview is in flight.
 *  When true, calls to `ctx.prompt.ask` short-circuit to `null` instead of opening a modal
 *  this prevents transitive resolves (e.g. opening a preview for `request.body`
 *  whose target request contains `{{ ask() }}`) from spawning unexpected
 *  prompts while the user is merely configuring a function. */
let previewDepth = 0
export function beginPreview() {
  previewDepth++
}
export function endPreview() {
  previewDepth = Math.max(0, previewDepth - 1)
}

interface PromptStore {
  current: PendingPrompt | null
  queue: PendingPrompt[]
  request(opts: PromptOpts): Promise<PromptAskResult | null>
  resolveCurrent(result: PromptAskResult | null): void
}

let nextId = 0

export const usePromptStore = create<PromptStore>((set, get) => ({
  current: null,
  queue: [],

  request(opts) {
    // Preview mode: don't surface a modal — caller will treat null as cancel.
    if (previewDepth > 0) return Promise.resolve(null)
    return new Promise<PromptAskResult | null>((resolve) => {
      const { current, queue } = get()
      // Coalesce: if an identical request is already pending, attach to it
      // instead of growing the queue. Prevents runaway prompts from loops.
      if (current && sameOpts(current.opts, opts)) {
        current.resolvers.push(resolve)
        return
      }
      const dup = queue.find((p) => sameOpts(p.opts, opts))
      if (dup) {
        dup.resolvers.push(resolve)
        return
      }
      const id = `prompt-${++nextId}`
      const pending: PendingPrompt = { id, opts, resolvers: [resolve] }
      if (current === null) {
        set({ current: pending })
      } else {
        set((s) => ({ queue: [...s.queue, pending] }))
      }
    })
  },

  resolveCurrent(result) {
    const { current, queue } = get()
    if (current === null) return
    for (const r of current.resolvers) r(result)
    if (queue.length === 0) {
      set({ current: null })
    } else {
      const [next, ...rest] = queue
      set({ current: next, queue: rest })
    }
  },
}))
