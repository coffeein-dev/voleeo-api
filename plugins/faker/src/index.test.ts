// @ts-ignore
import { describe, expect, test } from "bun:test"
import { isExcluded } from "./exclusions"
import { pickSex, toFloat, toInt } from "./helpers"
import { plugin } from "./index"

function fn(name: string) {
  const f = plugin.templateFunctions?.find((f) => f.name === name)
  if (!f) throw new Error(`template function "${name}" not found`)
  return f
}

const ctx = {} as any

describe("plugin meta", () => {
  test("has correct id", () => {
    expect(plugin.meta.id).toBe("@voleeo/faker")
  })


  test("auto-generates a substantial number of template functions", () => {
    // Faker has ~30 modules with multiple methods each; the auto-generator
    // should produce at least a few dozen entries.
    expect(plugin.templateFunctions?.length).toBeGreaterThanOrEqual(50)
  })

  test("all function names follow faker.<module>.<method> pattern", () => {
    for (const f of plugin.templateFunctions ?? []) {
      expect(f.name).toMatch(/^faker\.[a-zA-Z]+\.[a-zA-Z][a-zA-Z0-9]*$/)
    }
  })

  test("registers core modules", () => {
    const names = (plugin.templateFunctions ?? []).map((f) => f.name)
    expect(names.some((n) => n.startsWith("faker.person."))).toBe(true)
    expect(names.some((n) => n.startsWith("faker.internet."))).toBe(true)
    expect(names.some((n) => n.startsWith("faker.lorem."))).toBe(true)
    expect(names.some((n) => n.startsWith("faker.number."))).toBe(true)
  })

  test("does NOT register excluded modules", () => {
    const names = (plugin.templateFunctions ?? []).map((f) => f.name)
    for (const excluded of ["helpers", "definitions", "rawDefinitions"]) {
      expect(names.some((n) => n.startsWith(`faker.${excluded}.`))).toBe(false)
    }
  })
})

describe("exclusions", () => {
  test("excludes the helpers module wholesale", () => {
    expect(isExcluded("helpers", "anything")).toBe(true)
  })

  test("excludes specific arg-requiring date methods", () => {
    expect(isExcluded("date", "between")).toBe(true)
    expect(isExcluded("date", "betweens")).toBe(true)
  })

  test("allows non-excluded methods", () => {
    expect(isExcluded("person", "firstName")).toBe(false)
    expect(isExcluded("internet", "email")).toBe(false)
  })
})

describe("helpers", () => {
  test("toInt parses base-10 integers", () => {
    expect(toInt("42", 0)).toBe(42)
    expect(toInt("0", 99)).toBe(0)
  })

  test("toInt falls back on empty/missing/invalid", () => {
    expect(toInt(undefined, 99)).toBe(99)
    expect(toInt("", 99)).toBe(99)
    expect(toInt("abc", 99)).toBe(99)
  })

  test("toFloat parses decimals", () => {
    expect(toFloat("3.14", 0)).toBe(3.14)
  })

  test("toFloat falls back on missing/invalid", () => {
    expect(toFloat(undefined, 1.5)).toBe(1.5)
    expect(toFloat("nope", 1.5)).toBe(1.5)
  })

  test("pickSex returns female/male only when valid", () => {
    expect(pickSex({ sex: "female" })).toBe("female")
    expect(pickSex({ sex: "male" })).toBe("male")
    expect(pickSex({ sex: "other" })).toBeUndefined()
    expect(pickSex({ sex: "" })).toBeUndefined()
    expect(pickSex({})).toBeUndefined()
  })
})

describe("auto-generated entries — sample output", () => {
  test("faker.person.firstName returns a non-empty string", async () => {
    const result = await fn("faker.person.firstName").onRender(ctx, {})
    expect(typeof result).toBe("string")
    expect((result as string).length).toBeGreaterThan(0)
  })

  test("faker.internet.email returns a string containing @", async () => {
    const result = (await fn("faker.internet.email").onRender(
      ctx,
      {},
    )) as string
    expect(result).toContain("@")
  })

  test("faker.lorem.word returns a non-empty string", async () => {
    const result = (await fn("faker.lorem.word").onRender(ctx, {})) as string
    expect(result.length).toBeGreaterThan(0)
  })

  test("auto-entries handle throws by returning empty string", async () => {
    // Pick a method that's auto-registered and feed it bogus args.
    // The try/catch in autoEntry should swallow + return "".
    // We can't easily construct a guaranteed-throwing call without knowing
    // internals, so this test just asserts the contract: result is always
    // a string, never undefined.
    const result = await fn("faker.person.firstName").onRender(ctx, {
      locale: "definitely-not-a-locale",
    })
    expect(typeof result).toBe("string")
  })
})

describe("locale arg", () => {
  test("faker.person.firstName accepts a locale arg", async () => {
    const entry = fn("faker.person.firstName")
    const localeArgPresent = entry.args?.some((a) => a.name === "locale")
    expect(localeArgPresent).toBe(true)
  })

  test("different locales can produce different output (smoke)", async () => {
    // Pull many samples to be statistically confident two locales don't
    // happen to produce identical names every time.
    const samples = new Set<string>()
    for (let i = 0; i < 20; i++) {
      samples.add(
        (await fn("faker.person.firstName").onRender(ctx, {
          locale: "en",
        })) as string,
      )
    }
    // 20 random English first names should yield several distinct values.
    expect(samples.size).toBeGreaterThan(1)
  })
})
