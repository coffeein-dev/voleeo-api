import type { HttpRequest, RequestParameter } from "@/store/requests"

export interface QueryRow {
  key: string
  value: string
  enabled: boolean
  /** Render key — never persisted. */
  _id: number
  /** Maps to RequestParameter.id in storage. */
  _paramId: string
}

export type ParamRow = QueryRow

let _idCounter = 0
export function nextId(): number {
  return ++_idCounter
}

function randomParamId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  return Array.from(
    { length: 8 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("")
}

export function emptyRow(): QueryRow {
  return {
    key: "",
    value: "",
    enabled: true,
    _id: nextId(),
    _paramId: randomParamId(),
  }
}

export function paramsToRows(params: RequestParameter[]): QueryRow[] {
  return params.map((p) => ({
    key: p.name,
    value: p.value,
    enabled: p.enabled,
    _id: nextId(),
    _paramId: p.id,
  }))
}

/** For persistence — the trailing empty row (key/value both blank) is dropped. */
export function rowsToParams(rows: QueryRow[]): RequestParameter[] {
  return rows
    .filter((r) => r.key !== "" || r.value !== "")
    .map((r) => ({
      id: r._paramId,
      name: r.key,
      value: r.value,
      enabled: r.enabled,
    }))
}

/** Parse a query string (no leading `?`) into key/value pairs. */
export function parseQueryString(
  qs: string,
): Array<{ key: string; value: string }> {
  return qs
    .split("&")
    .filter(Boolean)
    .map((part) => {
      const eqIdx = part.indexOf("=")
      const key =
        eqIdx === -1
          ? decodeURIComponent(part)
          : decodeURIComponent(part.slice(0, eqIdx))
      const value =
        eqIdx === -1 ? "" : decodeURIComponent(part.slice(eqIdx + 1))
      return { key, value }
    })
    .filter((p) => p.key.trim() !== "")
}

export function parseQueryRows(url: string): QueryRow[] {
  const qIdx = url.indexOf("?")
  if (qIdx === -1) return []
  const qs = url.slice(qIdx + 1).split("#")[0]
  return parseQueryString(qs).map((p) => ({
    ...p,
    enabled: true,
    _id: nextId(),
    _paramId: randomParamId(),
  }))
}

export function extractPathParams(url: string): string[] {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    path = url.split("?")[0].split("#")[0]
  }
  return [...path.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1])
}

/** Encode a query-param value but leave `{{ … }}` templates intact so the
 *  resolver can still find them after the URL is stored. */
export function encodeQueryValue(val: string): string {
  return val
    .split(/({{[^}]*}})/g)
    .map((part, i) => (i % 2 === 0 ? encodeURIComponent(part) : part))
    .join("")
}

export function buildUrl(url: string, rows: QueryRow[]): string {
  const base = url.split("?")[0].split("#")[0]
  const hash = url.includes("#") ? `#${url.split("#")[1]}` : ""
  const filled = rows.filter((r) => r.key.trim() && r.enabled)
  if (filled.length === 0) return base + hash
  const qs = filled
    .map((r) =>
      r.value
        ? `${encodeURIComponent(r.key)}=${encodeQueryValue(r.value)}`
        : encodeURIComponent(r.key),
    )
    .join("&")
  return `${base}?${qs}${hash}`
}

export function buildPathParams(
  names: string[],
  values: Record<string, string>,
  enabled: Record<string, boolean>,
): RequestParameter[] {
  return names.map((name) => ({
    id: `pp_${name}`,
    name,
    value: values[name] ?? "",
    enabled: enabled[name] !== false,
  }))
}

/** Parameters whose name is not a `:path` param in the URL. */
export function queryParamsOnly(
  parameters: RequestParameter[],
  url: string,
): RequestParameter[] {
  const pathNames = new Set(extractPathParams(url))
  return parameters.filter((p) => !pathNames.has(p.name))
}

export function removePathParamFromUrl(url: string, name: string): string {
  return url
    .replace(new RegExp(`/:${name}(?=/|$|[?#])`), "")
    .replace(new RegExp(`(^|/)(:${name})(?=/|$|[?#])`), "$1")
    .replace(/\/\//g, "/")
}

// Chars legal unencoded in an RFC 3986 query: unreserved + sub-delims + `:@/?`.
// `&` and `=` are allowed too — they're structural delimiters, only encoded
// when they appear as literal data (the app layer's call, not ours here).
const RFC3986_QUERY_ALLOWED = /^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]*$/
const TEMPLATE_RE = /\{\{[^}]*\}\}/
export function needsEscaping(val: string): boolean {
  // Template expressions are resolved at send time — don't warn while editing.
  if (TEMPLATE_RE.test(val)) return false
  return val.length > 0 && !RFC3986_QUERY_ALLOWED.test(val)
}

// Param name: a letter/underscore, then letters/digits/underscores.
const PARAM_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/
export function isValidParamName(name: string): boolean {
  return PARAM_NAME_RE.test(name)
}

/** Path-param values for a stored request (no live editor draft). Mirrors
 *  `useRequestDraft` so off-editor sends/previews resolve `:param`s the same. */
export function storedPathParams(request: HttpRequest): {
  values: Record<string, string>
  enabled: Record<string, boolean>
} {
  const urlPathNames = new Set(extractPathParams(request.url))
  const values: Record<string, string> = {}
  const enabled: Record<string, boolean> = {}
  for (const p of request.parameters ?? []) {
    if (urlPathNames.has(p.name)) {
      values[p.name] = p.value
      enabled[p.name] = p.enabled
    }
  }
  return { values, enabled }
}
