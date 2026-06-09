// @ts-ignore
import { describe, expect, test } from "bun:test"
import { plugin } from "./index"

function fn(name: string) {
  const f = plugin.templateFunctions?.find((f) => f.name === name)
  if (!f) throw new Error(`template function "${name}" not found`)
  return f
}

const ctx = {} as any

describe("plugin meta", () => {
  test("has correct id", () => {
    expect(plugin.meta.id).toBe("@voleeo/base64")
  })

  test("exports 4 template functions", () => {
    expect(plugin.templateFunctions).toHaveLength(4)
  })


  test("functions are named under the base64.* namespace", () => {
    const names = (plugin.templateFunctions ?? []).map((f) => f.name).sort()
    expect(names).toEqual([
      "base64.decode",
      "base64.decodeUrl",
      "base64.encode",
      "base64.encodeUrl",
    ])
  })
})

describe("base64.encode", () => {
  test("encodes ASCII", async () => {
    expect(await fn("base64.encode").onRender(ctx, { value: "hello" })).toBe(
      "aGVsbG8=",
    )
  })

  test("produces standard alphabet output (with /)", async () => {
    // "???" → bytes 0x3F×3 → "Pz8/" (last group is 63 = `/`).
    expect(await fn("base64.encode").onRender(ctx, { value: "???" })).toBe(
      "Pz8/",
    )
  })

  test("produces standard alphabet output (with +)", async () => {
    // ">>>" → bytes 0x3E×3 → "Pj4+" (last group is 62 = `+`).
    expect(await fn("base64.encode").onRender(ctx, { value: ">>>" })).toBe(
      "Pj4+",
    )
  })

  test("pads to a multiple of 4", async () => {
    expect(await fn("base64.encode").onRender(ctx, { value: "h" })).toBe(
      "aA==",
    )
    expect(await fn("base64.encode").onRender(ctx, { value: "hi" })).toBe(
      "aGk=",
    )
    expect(await fn("base64.encode").onRender(ctx, { value: "hel" })).toBe(
      "aGVs",
    )
  })

  test("UTF-8 multi-byte characters survive", async () => {
    // "é" is 0xC3 0xA9 in UTF-8 → "w6k=".
    expect(await fn("base64.encode").onRender(ctx, { value: "é" })).toBe(
      "w6k=",
    )
  })

  test("missing value falls back to empty string", async () => {
    expect(await fn("base64.encode").onRender(ctx, {})).toBe("")
  })

  test("empty string encodes to empty string", async () => {
    expect(await fn("base64.encode").onRender(ctx, { value: "" })).toBe("")
  })
})

describe("base64.decode", () => {
  test("decodes ASCII", async () => {
    expect(
      await fn("base64.decode").onRender(ctx, { value: "aGVsbG8=" }),
    ).toBe("hello")
  })

  test("decodes UTF-8", async () => {
    expect(await fn("base64.decode").onRender(ctx, { value: "w6k=" })).toBe(
      "é",
    )
  })

  test("missing value falls back to empty string", async () => {
    expect(await fn("base64.decode").onRender(ctx, {})).toBe("")
  })
})

describe("base64.encodeUrl", () => {
  test("swaps / for _", async () => {
    // "???" encodes to "Pz8/" in standard; URL-safe replaces the trailing / with _.
    expect(await fn("base64.encodeUrl").onRender(ctx, { value: "???" })).toBe(
      "Pz8_",
    )
  })

  test("swaps + for -", async () => {
    // ">>>" encodes to "Pj4+" in standard; URL-safe replaces the trailing + with -.
    expect(await fn("base64.encodeUrl").onRender(ctx, { value: ">>>" })).toBe(
      "Pj4-",
    )
  })

  test("strips trailing padding", async () => {
    expect(await fn("base64.encodeUrl").onRender(ctx, { value: "h" })).toBe(
      "aA",
    )
    expect(await fn("base64.encodeUrl").onRender(ctx, { value: "hi" })).toBe(
      "aGk",
    )
    // 3-byte input doesn't need padding even in standard base64; both forms agree.
    expect(await fn("base64.encodeUrl").onRender(ctx, { value: "hel" })).toBe(
      "aGVs",
    )
  })

  test("matches standard base64 when output contains no alphabet differences", async () => {
    // "hello" → "aGVsbG8=" in standard. URL-safe strips `=` but no `+`/`/`
    // present, so the two forms differ only in padding.
    const std = await fn("base64.encode").onRender(ctx, { value: "hello" })
    const url = await fn("base64.encodeUrl").onRender(ctx, { value: "hello" })
    expect(std).toBe("aGVsbG8=")
    expect(url).toBe("aGVsbG8")
  })

  test("missing value falls back to empty string", async () => {
    expect(await fn("base64.encodeUrl").onRender(ctx, {})).toBe("")
  })
})

describe("base64.decodeUrl", () => {
  test("decodes url-safe alphabet (_ and -)", async () => {
    expect(
      await fn("base64.decodeUrl").onRender(ctx, { value: "Pz8_" }),
    ).toBe("???")
    expect(
      await fn("base64.decodeUrl").onRender(ctx, { value: "Pj4-" }),
    ).toBe(">>>")
  })

  test("accepts input without trailing padding", async () => {
    expect(await fn("base64.decodeUrl").onRender(ctx, { value: "aA" })).toBe(
      "h",
    )
    expect(await fn("base64.decodeUrl").onRender(ctx, { value: "aGk" })).toBe(
      "hi",
    )
    expect(
      await fn("base64.decodeUrl").onRender(ctx, { value: "aGVsbG8" }),
    ).toBe("hello")
  })

  test("accepts input WITH trailing padding (re-pad is idempotent)", async () => {
    expect(
      await fn("base64.decodeUrl").onRender(ctx, { value: "aGVsbG8=" }),
    ).toBe("hello")
    expect(await fn("base64.decodeUrl").onRender(ctx, { value: "aA==" })).toBe(
      "h",
    )
  })

  test("missing value falls back to empty string", async () => {
    expect(await fn("base64.decodeUrl").onRender(ctx, {})).toBe("")
  })
})

describe("roundtrips", () => {
  test("standard encode → decode is identity for ASCII", async () => {
    const original = "hello world & friends?"
    const encoded = (await fn("base64.encode").onRender(ctx, {
      value: original,
    })) as string
    const decoded = await fn("base64.decode").onRender(ctx, { value: encoded })
    expect(decoded).toBe(original)
  })

  test("standard encode → decode is identity for unicode", async () => {
    const original = "café 北京 🚀"
    const encoded = (await fn("base64.encode").onRender(ctx, {
      value: original,
    })) as string
    const decoded = await fn("base64.decode").onRender(ctx, { value: encoded })
    expect(decoded).toBe(original)
  })

  test("url-safe encode → decode is identity for ASCII", async () => {
    const original = "hello world & friends?"
    const encoded = (await fn("base64.encodeUrl").onRender(ctx, {
      value: original,
    })) as string
    const decoded = await fn("base64.decodeUrl").onRender(ctx, {
      value: encoded,
    })
    expect(decoded).toBe(original)
  })

  test("url-safe encode → decode is identity for unicode", async () => {
    const original = "café 北京 🚀"
    const encoded = (await fn("base64.encodeUrl").onRender(ctx, {
      value: original,
    })) as string
    const decoded = await fn("base64.decodeUrl").onRender(ctx, {
      value: encoded,
    })
    expect(decoded).toBe(original)
  })

  test("standard and url-safe diverge on alphabet but agree on byte content", async () => {
    // "???>>>" produces both / and + in standard base64 output ("Pz8/Pj4+").
    const original = "???>>>"
    const std = (await fn("base64.encode").onRender(ctx, {
      value: original,
    })) as string
    const url = (await fn("base64.encodeUrl").onRender(ctx, {
      value: original,
    })) as string
    expect(std).toContain("/")
    expect(std).toContain("+")
    expect(url).not.toContain("/")
    expect(url).not.toContain("+")
    // Only the surface alphabet differs; both decode back to the same bytes.
    const a = await fn("base64.decode").onRender(ctx, { value: std })
    const b = await fn("base64.decodeUrl").onRender(ctx, { value: url })
    expect(a).toBe(b)
    expect(a).toBe(original)
  })
})
