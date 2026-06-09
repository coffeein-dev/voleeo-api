// @ts-ignore
import { beforeEach, describe, expect, mock, test } from "bun:test"
import type { Context } from "@voleeo/plugin-api"

// Mock the bindings module BEFORE importing the plugin so the plugin's
// `commands` import binds to the mock. The path must match the one in
// plugins/encrypt/src/index.ts.
const encryptValueMock = mock(async (_workspaceId: string, _raw: string) => ({
  status: "ok" as const,
  data: "enc:v1:CIPHERTEXT",
}))

mock.module("../../../packages/types/bindings", () => ({
  commands: {
    workspaceEncryptValue: encryptValueMock,
  },
}))

// Import the plugin AFTER the mock is registered.
import { plugin } from "./index"

function encryptFn() {
  const f = plugin.templateFunctions?.find((f) => f.name === "encrypt")
  if (!f) throw new Error(`template function "encrypt" not found`)
  return f
}

function mkCtx(workspaceId: string | null = "w1"): Context {
  return {
    workspace: { currentId: () => workspaceId },
  } as unknown as Context
}

beforeEach(() => {
  encryptValueMock.mockClear()
})

describe("plugin meta", () => {
  test("has correct id", () => {
    expect(plugin.meta.id).toBe("@voleeo/encrypt")
  })


  test("exports the encrypt function", () => {
    expect(plugin.templateFunctions).toHaveLength(1)
    expect(plugin.templateFunctions?.[0].name).toBe("encrypt")
  })

  test("value arg is required + secret-typed", () => {
    const arg = encryptFn().args?.find((a) => a.name === "value")
    expect(arg?.required).toBe(true)
    expect(arg?.type).toBe("secret")
  })
})

describe("encrypt — already-encrypted passthrough", () => {
  test("returns input as-is when prefixed enc:v1:", async () => {
    const ctx = mkCtx()
    const result = await encryptFn().onRender(ctx, {
      value: "enc:v1:ABCDEF",
    })
    expect(result).toBe("enc:v1:ABCDEF")
  })

  test("does NOT call IPC for already-encrypted input", async () => {
    const ctx = mkCtx()
    await encryptFn().onRender(ctx, { value: "enc:v1:X" })
    expect(encryptValueMock).not.toHaveBeenCalled()
  })

  test("works even when no workspace is active (early return)", async () => {
    const ctx = mkCtx(null)
    const result = await encryptFn().onRender(ctx, { value: "enc:v1:Z" })
    expect(result).toBe("enc:v1:Z")
  })
})

describe("encrypt — plaintext path", () => {
  test("throws when no workspace is active", async () => {
    const ctx = mkCtx(null)
    let error: unknown = null
    try {
      await encryptFn().onRender(ctx, { value: "plaintext" })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe("No active workspace")
  })

  test("invokes workspaceEncryptValue with workspaceId + raw value", async () => {
    const ctx = mkCtx("ws-42")
    await encryptFn().onRender(ctx, { value: "hello" })
    expect(encryptValueMock).toHaveBeenCalledTimes(1)
    expect(encryptValueMock).toHaveBeenCalledWith("ws-42", "hello")
  })

  test("returns ciphertext from successful IPC call", async () => {
    const ctx = mkCtx()
    const result = await encryptFn().onRender(ctx, { value: "hello" })
    expect(result).toBe("enc:v1:CIPHERTEXT")
  })

  test("falls back to empty input when value arg is missing", async () => {
    const ctx = mkCtx()
    await encryptFn().onRender(ctx, {})
    expect(encryptValueMock).toHaveBeenCalledWith("w1", "")
  })
})

describe("encrypt — error mapping", () => {
  test("cancelled error → 'Cancelled' message", async () => {
    encryptValueMock.mockImplementationOnce(async () => ({
      status: "error",
      error: { kind: "cancelled" },
    }))
    const ctx = mkCtx()
    let error: unknown = null
    try {
      await encryptFn().onRender(ctx, { value: "x" })
    } catch (e) {
      error = e
    }
    expect((error as Error).message).toBe("Cancelled")
  })

  test("http_failed error → uses data.message", async () => {
    encryptValueMock.mockImplementationOnce(async () => ({
      status: "error",
      error: { kind: "http_failed", data: { message: "boom", events: [] } },
    }))
    const ctx = mkCtx()
    let error: unknown = null
    try {
      await encryptFn().onRender(ctx, { value: "x" })
    } catch (e) {
      error = e
    }
    expect((error as Error).message).toBe("boom")
  })

  test("generic error → uses string payload", async () => {
    encryptValueMock.mockImplementationOnce(async () => ({
      status: "error",
      error: { kind: "encryption_failed", data: "no key" },
    }))
    const ctx = mkCtx()
    let error: unknown = null
    try {
      await encryptFn().onRender(ctx, { value: "x" })
    } catch (e) {
      error = e
    }
    expect((error as Error).message).toBe("no key")
  })
})
