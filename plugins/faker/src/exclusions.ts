export const EXCLUDED_MODULES = new Set<string>([
  "helpers",
  "rawDefinitions",
  "definitions",
])

// Methods that need required arguments without sensible defaults.
// The try/catch safety net in index.ts handles anything not listed here,
// so this is just a hint to skip registering useless entries up-front.
export const EXCLUDED_METHODS = new Map<string, Set<string>>([
  ["date", new Set(["between", "betweens"])],
  ["string", new Set(["fromCharacters"])],
])

export function isExcluded(module: string, method: string): boolean {
  if (EXCLUDED_MODULES.has(module)) return true
  return EXCLUDED_METHODS.get(module)?.has(method) ?? false
}
