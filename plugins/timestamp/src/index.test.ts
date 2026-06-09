// @ts-ignore
import { describe, expect, test } from "bun:test"
import { plugin } from "./index"

function fn(name: string) {
  const f = plugin.templateFunctions?.find((f) => f.name === name)
  if (!f) throw new Error(`template function "${name}" not found`)
  return f
}

const ctx = {} as any

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}:\d{2}$/

describe("plugin meta", () => {
  test("has correct id", () => {
    expect(plugin.meta.id).toBe("@voleeo/timestamp")
  })

  test("exports 7 template functions", () => {
    expect(plugin.templateFunctions).toHaveLength(7)
  })


  test("all function names start with 'timestamp.'", () => {
    for (const f of plugin.templateFunctions ?? []) {
      expect(f.name).toMatch(/^timestamp\./)
    }
  })
})

describe("timestamp.iso", () => {
  test("returns ISO 8601 UTC format", async () => {
    expect(await fn("timestamp.iso").onRender(ctx, {})).toMatch(ISO_RE)
  })
})

describe("timestamp.unix", () => {
  test("returns integer seconds as string", async () => {
    const result = (await fn("timestamp.unix").onRender(ctx, {})) as string
    expect(result).toMatch(/^\d+$/)
    // 10-digit unix seconds — works until 2286
    expect(result.length).toBe(10)
  })

  test("approximately equals Date.now() / 1000", async () => {
    const result = Number(await fn("timestamp.unix").onRender(ctx, {}))
    const expected = Math.floor(Date.now() / 1000)
    expect(Math.abs(result - expected)).toBeLessThanOrEqual(1)
  })
})

describe("timestamp.unixMs", () => {
  test("returns integer milliseconds as string", async () => {
    const result = (await fn("timestamp.unixMs").onRender(ctx, {})) as string
    expect(result).toMatch(/^\d+$/)
    expect(result.length).toBe(13)
  })

  test("approximately equals Date.now()", async () => {
    const result = Number(await fn("timestamp.unixMs").onRender(ctx, {}))
    expect(Math.abs(result - Date.now())).toBeLessThanOrEqual(100)
  })
})

describe("timestamp.date", () => {
  test("returns YYYY-MM-DD", async () => {
    expect(await fn("timestamp.date").onRender(ctx, {})).toMatch(DATE_RE)
  })
})

describe("timestamp.time", () => {
  test("returns HH:mm:ss", async () => {
    expect(await fn("timestamp.time").onRender(ctx, {})).toMatch(TIME_RE)
  })
})

describe("timestamp.format", () => {
  test("respects custom layout", async () => {
    const result = await fn("timestamp.format").onRender(ctx, {
      layout: "YYYY",
    })
    expect(result).toMatch(/^\d{4}$/)
  })

  test("empty layout falls back to ISO-like default", async () => {
    const result = (await fn("timestamp.format").onRender(ctx, {
      layout: "",
    })) as string
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
  })

  test("supports compound tokens", async () => {
    const result = await fn("timestamp.format").onRender(ctx, {
      layout: "YYYY-MM-DD HH:mm:ss",
    })
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })
})

describe("timestamp.offset", () => {
  test("zero offset returns current ISO", async () => {
    const before = Date.now()
    const result = (await fn("timestamp.offset").onRender(ctx, {
      amount: "0",
      unit: "seconds",
      as: "iso",
    })) as string
    const parsed = new Date(result).getTime()
    expect(Math.abs(parsed - before)).toBeLessThanOrEqual(100)
  })

  test("positive offset returns a future timestamp", async () => {
    const before = Date.now()
    const result = (await fn("timestamp.offset").onRender(ctx, {
      amount: "60",
      unit: "seconds",
      as: "unixMs",
    })) as string
    expect(Number(result)).toBeGreaterThanOrEqual(before + 60_000)
  })

  test("negative offset returns a past timestamp", async () => {
    const before = Date.now()
    const result = (await fn("timestamp.offset").onRender(ctx, {
      amount: "-1",
      unit: "hours",
      as: "unixMs",
    })) as string
    expect(Number(result)).toBeLessThanOrEqual(before - 3_600_000 + 100)
  })

  test("as=unix returns integer seconds", async () => {
    const result = (await fn("timestamp.offset").onRender(ctx, {
      amount: "0",
      unit: "seconds",
      as: "unix",
    })) as string
    expect(result).toMatch(/^\d{10}$/)
  })

  test("as=unixMs returns integer milliseconds", async () => {
    const result = (await fn("timestamp.offset").onRender(ctx, {
      amount: "0",
      unit: "seconds",
      as: "unixMs",
    })) as string
    expect(result).toMatch(/^\d{13}$/)
  })

  test("unit minutes/hours/days multiply correctly", async () => {
    const day = (await fn("timestamp.offset").onRender(ctx, {
      amount: "1",
      unit: "days",
      as: "unixMs",
    })) as string
    const hour = (await fn("timestamp.offset").onRender(ctx, {
      amount: "1",
      unit: "hours",
      as: "unixMs",
    })) as string
    // 1 day ≈ 24h. Allow a small window for the calls being a few ms apart.
    expect(Number(day) - Number(hour)).toBeGreaterThan(23 * 3_600_000 - 100)
    expect(Number(day) - Number(hour)).toBeLessThan(23 * 3_600_000 + 100)
  })

  test("unknown unit falls back to seconds", async () => {
    const before = Date.now()
    const result = (await fn("timestamp.offset").onRender(ctx, {
      amount: "10",
      unit: "weeks", // not in UNIT_MS
      as: "unixMs",
    })) as string
    // Falls back to 10 seconds, not 10 weeks
    expect(Math.abs(Number(result) - (before + 10_000))).toBeLessThan(200)
  })
})
