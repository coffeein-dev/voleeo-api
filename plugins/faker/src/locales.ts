import { type Faker, allFakers, allLocales } from "@faker-js/faker"

export const DEFAULT_LOCALE = "en"

const EXCLUDED = new Set<string>(["base"])

function localeTitle(code: string): string {
  const meta = allLocales[code as keyof typeof allLocales]?.metadata
  return meta?.title ?? code
}

export const LOCALE_OPTIONS = Object.keys(allFakers)
  .filter((code) => !EXCLUDED.has(code))
  .map((code) => ({ label: localeTitle(code), value: code }))
  .sort((a, b) => a.label.localeCompare(b.label))

export function getFaker(locale: string | undefined): Faker {
  const code = locale && !EXCLUDED.has(locale) ? locale : DEFAULT_LOCALE
  return allFakers[code as keyof typeof allFakers] ?? allFakers[DEFAULT_LOCALE]
}
