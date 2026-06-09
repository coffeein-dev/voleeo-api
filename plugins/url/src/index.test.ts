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
    expect(plugin.meta.id).toBe("@voleeo/url")
  })

  test("exports 2 template functions", () => {
    expect(plugin.templateFunctions).toHaveLength(2)
  })

})

describe("url.encode", () => {
  test("percent-encodes spaces", async () => {
    expect(await fn("url.encode").onRender(ctx, { value: "a b" })).toBe("a%20b")
  })

  test("percent-encodes reserved chars", async () => {
    expect(await fn("url.encode").onRender(ctx, { value: "a/b?c=d&e" })).toBe(
      "a%2Fb%3Fc%3Dd%26e",
    )
  })

  test("leaves unreserved chars alone", async () => {
    expect(
      await fn("url.encode").onRender(ctx, { value: "abc-XYZ_0.9~" }),
    ).toBe("abc-XYZ_0.9~")
  })

  test("missing value falls back to empty string", async () => {
    expect(await fn("url.encode").onRender(ctx, {})).toBe("")
  })

  test("unicode is encoded as UTF-8 percent escapes", async () => {
    expect(await fn("url.encode").onRender(ctx, { value: "é" })).toBe("%C3%A9")
  })
})

describe("url.decode", () => {
  test("decodes percent-encoded spaces", async () => {
    expect(await fn("url.decode").onRender(ctx, { value: "a%20b" })).toBe("a b")
  })

  test("decodes reserved chars", async () => {
    expect(
      await fn("url.decode").onRender(ctx, { value: "a%2Fb%3Fc%3Dd%26e" }),
    ).toBe("a/b?c=d&e")
  })

  test("decodes unicode", async () => {
    expect(await fn("url.decode").onRender(ctx, { value: "%C3%A9" })).toBe("é")
  })

  test("missing value falls back to empty string", async () => {
    expect(await fn("url.decode").onRender(ctx, {})).toBe("")
  })
})

describe("url encode/decode roundtrip", () => {
  test("encode then decode is identity for ASCII", async () => {
    const original = "hello world & friends?"
    const encoded = (await fn("url.encode").onRender(ctx, {
      value: original,
    })) as string
    const decoded = await fn("url.decode").onRender(ctx, { value: encoded })
    expect(decoded).toBe(original)
  })

  test("encode then decode is identity for unicode", async () => {
    const original = "café 北京"
    const encoded = (await fn("url.encode").onRender(ctx, {
      value: original,
    })) as string
    const decoded = await fn("url.decode").onRender(ctx, { value: encoded })
    expect(decoded).toBe(original)
  })
})
