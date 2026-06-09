import type { TemplateFunctionArg } from "@voleeo/plugin-api"
import { DEFAULT_LOCALE, LOCALE_OPTIONS } from "./locales"

export const localeArg: TemplateFunctionArg = {
  name: "locale",
  label: "Locale",
  type: "select",
  options: LOCALE_OPTIONS,
  defaultValue: DEFAULT_LOCALE,
}

export const phoneStyleArg: TemplateFunctionArg = {
  name: "style",
  label: "Style",
  type: "select",
  options: [
    { label: "Default", value: "" },
    { label: "Human-readable", value: "human" },
    { label: "National", value: "national" },
    { label: "International", value: "international" },
  ],
}

export const sexArg: TemplateFunctionArg = {
  name: "sex",
  label: "Sex",
  type: "select",
  options: [
    { label: "Any", value: "" },
    { label: "Female", value: "female" },
    { label: "Male", value: "male" },
  ],
}

export function toInt(v: string | undefined, fallback: number): number {
  if (!v) return fallback
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

export function toFloat(v: string | undefined, fallback: number): number {
  if (!v) return fallback
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

export function pickSex(
  args: Record<string, string>,
): "female" | "male" | undefined {
  return args.sex === "female" || args.sex === "male" ? args.sex : undefined
}

export function lengthArg(defaultValue: string): TemplateFunctionArg {
  return { name: "length", label: "Length", type: "text", defaultValue }
}
