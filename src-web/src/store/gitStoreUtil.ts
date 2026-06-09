import { errorMessage } from "@/lib/error"
import type { GitOp, GitStore } from "./git"

type Result<T> = { status: "ok"; data: T } | { status: "error"; error: unknown }

export async function unwrap<T>(p: Promise<Result<T>>): Promise<T> {
  const res = await p
  if (res.status === "ok") return res.data
  throw new Error(errorMessage(res.error as never))
}

type Set = (partial: Partial<GitStore>) => void
type Get = () => GitStore

export async function withOp(
  set: Set,
  get: Get,
  op: GitOp,
  fn: (id: string) => Promise<void>,
) {
  const id = get().loadedWorkspaceId
  if (!id) return
  set({ op, error: null, authPrompt: null })
  try {
    await fn(id)
  } catch (e) {
    const msg = (e as Error).message
    // Auth failures open Git settings (handled by the view) rather than a banner.
    if (/credential|authentication|auth failed/i.test(msg))
      set({ authPrompt: msg })
    else set({ error: msg })
  } finally {
    set({ op: null })
  }
}

/** Run a one-shot mutation command, then refresh status. */
export async function mutate(
  get: Get,
  fn: (id: string) => Promise<Result<unknown>>,
) {
  const id = get().loadedWorkspaceId
  if (!id) return
  await unwrap(fn(id))
  await get().refresh(id)
}
