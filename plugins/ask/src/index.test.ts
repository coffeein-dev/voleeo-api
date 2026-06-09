// @ts-ignore
import { beforeEach, describe, expect, test } from "bun:test"
import type { Context, PromptAskResult } from "@voleeo/plugin-api"
import { plugin } from "./index"

function askFn() {
  const f = plugin.templateFunctions?.find((f) => f.name === "ask")
  if (!f) throw new Error(`template function "ask" not found`)
  return f
}

interface FakeStore {
  data: Map<string, unknown>
  get<T>(k: string): Promise<T | undefined>
  set<T>(k: string, v: T): Promise<void>
  delete(k: string): Promise<void>
}

function mkStore(): FakeStore {
  const data = new Map<string, unknown>()
  return {
    data,
    async get<T>(k: string) {
      return data.get(k) as T | undefined
    },
    async set<T>(k: string, v: T) {
      data.set(k, v)
    },
    async delete(k: string) {
      data.delete(k)
    },
  }
}

function mkCtx(opts: {
  store?: FakeStore
  promptResult?: PromptAskResult | null
  /** Pulled by `ctx.prompt.ask` calls in FIFO order. */
  promptQueue?: Array<PromptAskResult | null>
}): { ctx: Context; promptCalls: number } {
  const store = opts.store ?? mkStore()
  const queue = opts.promptQueue ? [...opts.promptQueue] : null
  const stats = { promptCalls: 0 }
  const ctx = {
    store,
    prompt: {
      async ask() {
        stats.promptCalls++
        if (queue) return queue.shift() ?? null
        return opts.promptResult ?? null
      },
      async text() {
        return null
      },
    },
  } as unknown as Context
  return { ctx, get promptCalls() { return stats.promptCalls } }
}

describe("plugin meta", () => {
  test("has correct id", () => {
    expect(plugin.meta.id).toBe("@voleeo/ask")
  })

  test("exports the ask function", () => {
    expect(plugin.templateFunctions).toHaveLength(1)
    expect(plugin.templateFunctions?.[0].name).toBe("ask")
  })

  test("previewable: false (modal must not call onRender)", () => {
    expect(askFn().previewable).toBe(false)
  })

  test("title arg is required", () => {
    const titleArg = askFn().args?.find((a) => a.name === "title")
    expect(titleArg?.required).toBe(true)
  })
})

describe("ask — no cached value", () => {
  test("prompts and returns user's value", async () => {
    const { ctx } = mkCtx({
      promptResult: { value: "42", remember: "never" },
    })
    const result = await askFn().onRender(ctx, {
      title: "2FA code",
      placeholder: "",
    })
    expect(result).toBe("42")
  })

  test("cancellation throws AbortError", async () => {
    const { ctx } = mkCtx({ promptResult: null })
    let error: unknown = null
    try {
      await askFn().onRender(ctx, { title: "X", placeholder: "" })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(DOMException)
    expect((error as DOMException).name).toBe("AbortError")
  })
})

describe("ask — remember choices", () => {
  test("remember=never does NOT persist", async () => {
    const store = mkStore()
    const { ctx } = mkCtx({
      store,
      promptResult: { value: "v", remember: "never" },
    })
    await askFn().onRender(ctx, { title: "T", placeholder: "" })
    expect(store.data.size).toBe(0)
  })

  test("remember=forever persists with expiresAt=null", async () => {
    const store = mkStore()
    const { ctx } = mkCtx({
      store,
      promptResult: { value: "v", remember: "forever" },
    })
    await askFn().onRender(ctx, { title: "T", placeholder: "" })
    expect(store.data.size).toBe(1)
    const entry = [...store.data.values()][0] as {
      value: string
      expiresAt: number | null
    }
    expect(entry).toEqual({ value: "v", expiresAt: null })
  })

  test("remember=expire persists with future expiresAt", async () => {
    const store = mkStore()
    const before = Date.now()
    const { ctx } = mkCtx({
      store,
      promptResult: {
        value: "v",
        remember: "expire",
        expiresInMs: 5000,
      },
    })
    await askFn().onRender(ctx, { title: "T", placeholder: "" })
    const entry = [...store.data.values()][0] as {
      value: string
      expiresAt: number
    }
    expect(entry.expiresAt).toBeGreaterThanOrEqual(before + 5000)
    expect(entry.expiresAt).toBeLessThanOrEqual(before + 5100)
  })

  test("remember=expire with 0 expiresInMs does NOT persist", async () => {
    const store = mkStore()
    const { ctx } = mkCtx({
      store,
      promptResult: { value: "v", remember: "expire", expiresInMs: 0 },
    })
    await askFn().onRender(ctx, { title: "T", placeholder: "" })
    expect(store.data.size).toBe(0)
  })
})

describe("ask — cached value lookup", () => {
  test("returns cached value without prompting (forever)", async () => {
    const store = mkStore()
    // Pre-seed cache. Must match storageKey() = "ask:" + JSON.stringify([title, placeholder]).
    store.data.set(`ask:${JSON.stringify(["T", ""])}`, {
      value: "cached",
      expiresAt: null,
    })
    const stats = { calls: 0 }
    const ctx = {
      store,
      prompt: {
        async ask() {
          stats.calls++
          return null
        },
        async text() {
          return null
        },
      },
    } as unknown as Context
    const result = await askFn().onRender(ctx, { title: "T", placeholder: "" })
    expect(result).toBe("cached")
    expect(stats.calls).toBe(0)
  })

  test("returns cached value if not yet expired", async () => {
    const store = mkStore()
    store.data.set(`ask:${JSON.stringify(["T", ""])}`, {
      value: "cached",
      expiresAt: Date.now() + 10_000,
    })
    const { ctx, promptCalls } = mkCtx({ store, promptResult: null })
    const result = await askFn().onRender(ctx, { title: "T", placeholder: "" })
    expect(result).toBe("cached")
    // accessing promptCalls returns the live counter; should be 0
    expect(promptCalls).toBe(0)
  })

  test("expired cache entry is deleted and prompts again", async () => {
    const store = mkStore()
    const key = `ask:${JSON.stringify(["T", ""])}`
    store.data.set(key, { value: "old", expiresAt: Date.now() - 1000 })
    const { ctx } = mkCtx({
      store,
      promptResult: { value: "fresh", remember: "never" },
    })
    const result = await askFn().onRender(ctx, { title: "T", placeholder: "" })
    expect(result).toBe("fresh")
    expect(store.data.has(key)).toBe(false)
  })

  test("different placeholders produce different cache keys", async () => {
    const store = mkStore()
    const { ctx } = mkCtx({
      store,
      promptQueue: [
        { value: "a", remember: "forever" },
        { value: "b", remember: "forever" },
      ],
    })
    const a = await askFn().onRender(ctx, { title: "T", placeholder: "p1" })
    const b = await askFn().onRender(ctx, { title: "T", placeholder: "p2" })
    expect(a).toBe("a")
    expect(b).toBe("b")
    expect(store.data.size).toBe(2)
  })
})

describe("ask — previewRender", () => {
  test("returns null when no title", async () => {
    const { ctx } = mkCtx({})
    const result = await askFn().previewRender?.(ctx, { title: "" })
    expect(result).toBeNull()
  })

  test("returns null when no cached value", async () => {
    const { ctx } = mkCtx({})
    const result = await askFn().previewRender?.(ctx, {
      title: "T",
      placeholder: "",
    })
    expect(result).toBeNull()
  })

  test("returns cached value + 'Remembered forever' hint", async () => {
    const store = mkStore()
    store.data.set(`ask:${JSON.stringify(["T", ""])}`, {
      value: "v",
      expiresAt: null,
    })
    const { ctx } = mkCtx({ store })
    const result = await askFn().previewRender?.(ctx, {
      title: "T",
      placeholder: "",
    })
    expect(result).toEqual({ value: "v", hint: "Remembered forever" })
  })

  test("returns 'Expires in …' hint when entry has TTL", async () => {
    const store = mkStore()
    store.data.set(`ask:${JSON.stringify(["T", ""])}`, {
      value: "v",
      expiresAt: Date.now() + 90_000,
    })
    const { ctx } = mkCtx({ store })
    const result = await askFn().previewRender?.(ctx, {
      title: "T",
      placeholder: "",
    })
    expect(result?.value).toBe("v")
    expect(result?.hint).toMatch(/Expires in 1m( \d+s)?/)
  })

  test("drops expired entry and returns null", async () => {
    const store = mkStore()
    const key = `ask:${JSON.stringify(["T", ""])}`
    store.data.set(key, { value: "old", expiresAt: Date.now() - 1 })
    const { ctx } = mkCtx({ store })
    const result = await askFn().previewRender?.(ctx, {
      title: "T",
      placeholder: "",
    })
    expect(result).toBeNull()
    expect(store.data.has(key)).toBe(false)
  })
})
