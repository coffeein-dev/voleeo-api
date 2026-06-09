import { faker } from "@faker-js/faker"
import type {
  TemplateFunctionContribution,
  VoleeoPlugin,
} from "@voleeo/plugin-api"
import { isExcluded } from "./exclusions"
import { localeArg } from "./helpers"
import { getFaker } from "./locales"
import { OVERRIDES } from "./overrides"

function toStr(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (v instanceof Date) return v.toISOString()
  const t = typeof v
  if (t === "string") return v as string
  if (t === "number" || t === "boolean" || t === "bigint") return String(v)
  return JSON.stringify(v)
}

const warned = new Set<string>()

function autoEntry(
  module: string,
  method: string,
): TemplateFunctionContribution {
  const name = `faker.${module}.${method}`
  return {
    name,
    label: method,
    args: [localeArg],
    onRender: (_, a) => {
      try {
        const mod = getFaker(a.locale)[module as keyof typeof faker] as Record<
          string,
          unknown
        >
        const fn = mod?.[method]
        if (typeof fn !== "function") return ""
        return toStr((fn as (...args: unknown[]) => unknown).call(mod))
      } catch (err) {
        if (!warned.has(name)) {
          warned.add(name)
          console.warn(`[faker plugin] ${name} threw:`, err)
        }
        return ""
      }
    },
  }
}

function methodNames(obj: object): string[] {
  const seen = new Set<string>()
  let proto: object | null = obj
  while (proto && proto !== Object.prototype) {
    for (const k of Object.getOwnPropertyNames(proto)) {
      if (k === "constructor" || k === "faker" || k.startsWith("_")) continue
      const v = (obj as Record<string, unknown>)[k]
      if (typeof v === "function") seen.add(k)
    }
    proto = Object.getPrototypeOf(proto)
  }
  return [...seen].sort()
}

function moduleNames(): string[] {
  const out: string[] = []
  for (const k of Object.keys(faker)) {
    if (k.startsWith("_")) continue
    const v = (faker as unknown as Record<string, unknown>)[k]
    if (v && typeof v === "object") out.push(k)
  }
  return out.sort()
}

function buildTemplateFunctions(): TemplateFunctionContribution[] {
  const entries: TemplateFunctionContribution[] = []
  for (const module of moduleNames()) {
    if (isExcluded(module, "")) continue
    const modObj = (faker as unknown as Record<string, object>)[module]
    for (const method of methodNames(modObj)) {
      if (isExcluded(module, method)) continue
      const name = `faker.${module}.${method}`
      entries.push(OVERRIDES.get(name) ?? autoEntry(module, method))
    }
  }
  return entries
}

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/faker",
    name: "Faker",
    version: "1.0.0",
    author: "Voleeo",
  },
  templateFunctions: buildTemplateFunctions(),
}
