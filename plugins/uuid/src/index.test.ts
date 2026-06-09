// @ts-ignore
import { describe, expect, test } from "bun:test"
import { plugin } from "./index"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fn(name: string) {
  const f = plugin.templateFunctions?.find((f) => f.name === name)
  if (!f) throw new Error(`template function "${name}" not found`)
  return f
}

const ctx = {} as any

describe("plugin meta", () => {
  test("has correct id", () => {
    expect(plugin.meta.id).toBe("@voleeo/uuid")
  })

  test("exports 6 template functions", () => {
    expect(plugin.templateFunctions).toHaveLength(6)
  })

  test("all function names start with 'uuid.'", () => {
    for (const f of plugin.templateFunctions ?? []) {
      expect(f.name).toMatch(/^uuid\.v\d$/)
    }
  })
})

describe("uuid.v4", () => {
  test("returns a valid UUID", async () => {
    const result = await fn("uuid.v4").onRender(ctx, {})
    expect(result).toMatch(UUID_RE)
  })

  test("returns a different UUID each call", async () => {
    const a = await fn("uuid.v4").onRender(ctx, {})
    const b = await fn("uuid.v4").onRender(ctx, {})
    expect(a).not.toBe(b)
  })

  test("version nibble is 4", async () => {
    const result = (await fn("uuid.v4").onRender(ctx, {})) as string
    expect(result[14]).toBe("4")
  })
})

describe("uuid.v7", () => {
  test("returns a valid UUID", async () => {
    const result = await fn("uuid.v7").onRender(ctx, {})
    expect(result).toMatch(UUID_RE)
  })

  test("version nibble is 7", async () => {
    const result = (await fn("uuid.v7").onRender(ctx, {})) as string
    expect(result[14]).toBe("7")
  })

  test("successive calls are monotonically non-decreasing", async () => {
    const a = (await fn("uuid.v7").onRender(ctx, {})) as string
    const b = (await fn("uuid.v7").onRender(ctx, {})) as string
    // Lexicographic comparison works because v7 encodes timestamp in the high bits.
    expect(b >= a).toBe(true)
  })
})

describe("uuid.v1", () => {
  test("returns a valid UUID", async () => {
    expect(await fn("uuid.v1").onRender(ctx, {})).toMatch(UUID_RE)
  })

  test("version nibble is 1", async () => {
    const result = (await fn("uuid.v1").onRender(ctx, {})) as string
    expect(result[14]).toBe("1")
  })
})

describe("uuid.v6", () => {
  test("returns a valid UUID", async () => {
    expect(await fn("uuid.v6").onRender(ctx, {})).toMatch(UUID_RE)
  })

  test("version nibble is 6", async () => {
    const result = (await fn("uuid.v6").onRender(ctx, {})) as string
    expect(result[14]).toBe("6")
  })
})

// ── name-based variants ────────────────────────────────────────────────────

const DNS_NS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
const URL_NS = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"

describe("uuid.v3", () => {
  test("returns a valid UUID", async () => {
    expect(await fn("uuid.v3").onRender(ctx, { name: "example.com", namespace: DNS_NS })).toMatch(UUID_RE)
  })

  test("version nibble is 3", async () => {
    const result = (await fn("uuid.v3").onRender(ctx, { name: "x", namespace: DNS_NS })) as string
    expect(result[14]).toBe("3")
  })

  test("is deterministic — same input yields same output", async () => {
    const args = { name: "hello", namespace: DNS_NS }
    const a = await fn("uuid.v3").onRender(ctx, args)
    const b = await fn("uuid.v3").onRender(ctx, args)
    expect(a).toBe(b)
  })

  test("different names produce different UUIDs", async () => {
    const a = await fn("uuid.v3").onRender(ctx, { name: "foo", namespace: DNS_NS })
    const b = await fn("uuid.v3").onRender(ctx, { name: "bar", namespace: DNS_NS })
    expect(a).not.toBe(b)
  })

  test("different namespaces produce different UUIDs for the same name", async () => {
    const a = await fn("uuid.v3").onRender(ctx, { name: "example.com", namespace: DNS_NS })
    const b = await fn("uuid.v3").onRender(ctx, { name: "example.com", namespace: URL_NS })
    expect(a).not.toBe(b)
  })

  test("falls back to DNS namespace when namespace arg is omitted", async () => {
    const withDns = await fn("uuid.v3").onRender(ctx, { name: "test", namespace: DNS_NS })
    const withDefault = await fn("uuid.v3").onRender(ctx, { name: "test" })
    expect(withDefault).toBe(withDns)
  })
})

describe("uuid.v5", () => {
  test("returns a valid UUID", async () => {
    expect(await fn("uuid.v5").onRender(ctx, { name: "example.com", namespace: DNS_NS })).toMatch(UUID_RE)
  })

  test("version nibble is 5", async () => {
    const result = (await fn("uuid.v5").onRender(ctx, { name: "x", namespace: DNS_NS })) as string
    expect(result[14]).toBe("5")
  })

  test("is deterministic — same input yields same output", async () => {
    const args = { name: "hello", namespace: DNS_NS }
    const a = await fn("uuid.v5").onRender(ctx, args)
    const b = await fn("uuid.v5").onRender(ctx, args)
    expect(a).toBe(b)
  })

  test("different names produce different UUIDs", async () => {
    const a = await fn("uuid.v5").onRender(ctx, { name: "foo", namespace: DNS_NS })
    const b = await fn("uuid.v5").onRender(ctx, { name: "bar", namespace: DNS_NS })
    expect(a).not.toBe(b)
  })

  test("different namespaces produce different UUIDs for the same name", async () => {
    const a = await fn("uuid.v5").onRender(ctx, { name: "example.com", namespace: DNS_NS })
    const b = await fn("uuid.v5").onRender(ctx, { name: "example.com", namespace: URL_NS })
    expect(a).not.toBe(b)
  })

  test("v3 and v5 produce different UUIDs for the same input", async () => {
    const args = { name: "example.com", namespace: DNS_NS }
    const v3result = await fn("uuid.v3").onRender(ctx, args)
    const v5result = await fn("uuid.v5").onRender(ctx, args)
    expect(v3result).not.toBe(v5result)
  })
})
