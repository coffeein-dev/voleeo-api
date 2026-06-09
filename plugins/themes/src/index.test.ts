// @ts-ignore
import { describe, expect, test } from "bun:test"
import { plugin } from "./index"

const BASE16_SLOTS = [
  "base00",
  "base01",
  "base02",
  "base03",
  "base04",
  "base05",
  "base06",
  "base07",
  "base08",
  "base09",
  "base0A",
  "base0B",
  "base0C",
  "base0D",
  "base0E",
  "base0F",
] as const

const HEX_RE = /^#[0-9a-f]{6}$/i

describe("plugin meta", () => {
  test("has correct id", () => {
    expect(plugin.meta.id).toBe("@voleeo/themes-voleeo")
  })

  test("ships at least one theme", () => {
    expect(plugin.themes && plugin.themes.length).toBeGreaterThan(0)
  })

  test("contributes no template functions or request actions", () => {
    expect(plugin.templateFunctions).toBeUndefined()
    expect(plugin.requestActions).toBeUndefined()
  })
})

describe("theme invariants", () => {
  test("all themes have unique ids", () => {
    const ids = (plugin.themes ?? []).map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test("all themes have required metadata", () => {
    for (const theme of plugin.themes ?? []) {
      expect(theme.id).toMatch(/^[a-z0-9-]+$/)
      expect(theme.name.length).toBeGreaterThan(0)
      expect(theme.kind === "dark" || theme.kind === "light").toBe(true)
      expect(theme.version).toMatch(/^\d+\.\d+\.\d+$/)
    }
  })

  test("every theme has all 16 base16 palette slots", () => {
    for (const theme of plugin.themes ?? []) {
      for (const slot of BASE16_SLOTS) {
        expect(theme.palette[slot]).toBeDefined()
      }
    }
  })

  test("all palette values are 6-digit hex colors", () => {
    for (const theme of plugin.themes ?? []) {
      for (const slot of BASE16_SLOTS) {
        const value = theme.palette[slot]
        expect(value).toMatch(HEX_RE)
      }
    }
  })

  test("ships both dark and light themes", () => {
    const kinds = new Set((plugin.themes ?? []).map((t) => t.kind))
    expect(kinds.has("dark")).toBe(true)
    expect(kinds.has("light")).toBe(true)
  })

  test("default 'dark' and 'light' themes are present", () => {
    const ids = new Set((plugin.themes ?? []).map((t) => t.id))
    expect(ids.has("dark")).toBe(true)
    expect(ids.has("light")).toBe(true)
  })
})
