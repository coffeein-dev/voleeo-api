import type {
  AuthConfig,
  RequestBody,
  RequestParameter,
} from "../../../packages/types/bindings"
import { shellTokenize } from "./shellTokenize"

export interface ParsedRequest {
  method: string
  /** URL with query string stripped — query params live in `parameters`. */
  url: string
  parameters: RequestParameter[]
  headers: RequestParameter[]
  body: RequestBody | null
  auth: AuthConfig
}

/** Flags that take a value but whose value we don't care about; we still need
 *  to consume the next token so we don't misinterpret it as the URL. */
const SKIP_VALUE_FLAGS = new Set([
  "--cacert",
  "--cert",
  "--cert-type",
  "--connect-timeout",
  "--cookie",
  "--cookie-jar",
  "--key",
  "--key-type",
  "--max-time",
  "--proxy",
  "--proxy-user",
  "--referer",
  "--resolve",
  "--user-agent",
  "-A",
  "-b",
  "-c",
  "-e",
  "-m",
  "-x",
])

/** Boolean flags we just discard. */
const SKIP_BOOL_FLAGS = new Set([
  "-#",
  "-I",
  "-L",
  "-O",
  "-S",
  "-f",
  "-i",
  "-k",
  "-s",
  "-v",
  "--compressed",
  "--fail",
  "--head",
  "--include",
  "--insecure",
  "--location",
  "--no-progress-meter",
  "--progress-bar",
  "--silent",
  "--show-error",
  "--verbose",
])

function genId(name: string): string {
  return `imp_${name.replace(/[^a-zA-Z0-9]/g, "_")}_${Math.random().toString(36).slice(2, 8)}`
}

function splitHeader(raw: string): { name: string; value: string } | null {
  const idx = raw.indexOf(":")
  if (idx < 0) return null
  const name = raw.slice(0, idx).trim()
  const value = raw.slice(idx + 1).trimStart()
  if (!name) return null
  return { name, value }
}

function splitUrlAndQuery(url: string): {
  base: string
  params: RequestParameter[]
} {
  const qIdx = url.indexOf("?")
  if (qIdx < 0) return { base: url, params: [] }
  const base = url.slice(0, qIdx)
  const qs = url.slice(qIdx + 1).split("#")[0]
  const params: RequestParameter[] = []
  for (const part of qs.split("&")) {
    if (!part) continue
    const eq = part.indexOf("=")
    const name = eq < 0 ? safeDecode(part) : safeDecode(part.slice(0, eq))
    const value = eq < 0 ? "" : safeDecode(part.slice(eq + 1))
    if (!name) continue
    params.push({ id: genId(name), name, value, enabled: true })
  }
  return { base, params }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "))
  } catch {
    return s
  }
}

function detectBodyKind(
  body: string,
  headers: RequestParameter[],
): RequestBody["kind"] {
  const ct = headers
    .find((h) => h.name.toLowerCase() === "content-type")
    ?.value.toLowerCase()
  if (ct?.includes("json")) return "json"
  if (ct?.includes("xml")) return "xml"
  if (ct?.includes("text")) return "text"
  // Fall back to sniffing the literal.
  const trimmed = body.trimStart()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(body)
      return "json"
    } catch {
      // not valid JSON, continue
    }
  }
  if (trimmed.startsWith("<")) return "xml"
  return "text"
}

function deriveAuth(
  headers: RequestParameter[],
  basicCreds: string | null,
): { auth: AuthConfig; consumedHeaderIndex: number | null } {
  if (basicCreds) {
    const idx = basicCreds.indexOf(":")
    const username = idx < 0 ? basicCreds : basicCreds.slice(0, idx)
    const password = idx < 0 ? "" : basicCreds.slice(idx + 1)
    return {
      auth: { kind: "basic", username, password },
      consumedHeaderIndex: null,
    }
  }
  const authIdx = headers.findIndex(
    (h) => h.name.toLowerCase() === "authorization",
  )
  if (authIdx < 0) return { auth: { kind: "none" }, consumedHeaderIndex: null }
  const raw = headers[authIdx].value
  const m = raw.match(/^Bearer\s+(.+)$/i)
  if (m) {
    return {
      auth: { kind: "bearer", token: m[1] },
      consumedHeaderIndex: authIdx,
    }
  }
  const basic = raw.match(/^Basic\s+(.+)$/i)
  if (basic) {
    try {
      // atob is available in browser + modern Node/bun
      const decoded = atob(basic[1])
      const idx = decoded.indexOf(":")
      const username = idx < 0 ? decoded : decoded.slice(0, idx)
      const password = idx < 0 ? "" : decoded.slice(idx + 1)
      return {
        auth: { kind: "basic", username, password },
        consumedHeaderIndex: authIdx,
      }
    } catch {
      // fall through
    }
  }
  return { auth: { kind: "none" }, consumedHeaderIndex: null }
}

/** Parse a `curl …` command line into a Voleeo request shape.
 *  Returns `null` if the input doesn't look like a curl command. */
export function parseCurlCommand(input: string): ParsedRequest | null {
  const tokens = shellTokenize(input)
  if (!tokens || tokens.length === 0) return null
  if (tokens[0] !== "curl") return null

  let method: string | null = null
  let url: string | null = null
  const headers: RequestParameter[] = []
  let bodyText: string | null = null
  let basicCreds: string | null = null

  let i = 1
  while (i < tokens.length) {
    const t = tokens[i]
    if (t === "-X" || t === "--request") {
      method = tokens[++i]?.toUpperCase() ?? null
      i++
      continue
    }
    if (t === "-H" || t === "--header") {
      const raw = tokens[++i]
      if (raw) {
        const h = splitHeader(raw)
        if (h)
          headers.push({
            id: genId(h.name),
            name: h.name,
            value: h.value,
            enabled: true,
          })
      }
      i++
      continue
    }
    if (
      t === "-d" ||
      t === "--data" ||
      t === "--data-raw" ||
      t === "--data-binary" ||
      t === "--data-ascii"
    ) {
      const v = tokens[++i] ?? ""
      bodyText = (bodyText ?? "") + (bodyText ? "&" : "") + v
      i++
      continue
    }
    if (t === "--data-urlencode") {
      const v = tokens[++i] ?? ""
      // Form: name=value or =value or value. Encode the value part only.
      const eqIdx = v.indexOf("=")
      const encoded =
        eqIdx < 0
          ? encodeURIComponent(v)
          : `${v.slice(0, eqIdx)}=${encodeURIComponent(v.slice(eqIdx + 1))}`
      bodyText = (bodyText ?? "") + (bodyText ? "&" : "") + encoded
      i++
      continue
    }
    if (t === "-u" || t === "--user") {
      basicCreds = tokens[++i] ?? null
      i++
      continue
    }
    if (t === "--url") {
      url = tokens[++i] ?? null
      i++
      continue
    }
    if (SKIP_VALUE_FLAGS.has(t)) {
      i += 2
      continue
    }
    if (SKIP_BOOL_FLAGS.has(t)) {
      i++
      continue
    }
    if (t.startsWith("-")) {
      // Unknown flag — skip. If it looks like --flag=value or -fvalue we
      // consume only the one token; if it's a separated value flag we don't
      // know about, we may eat the next as URL. Acceptable trade-off.
      i++
      continue
    }
    // Positional → URL (first wins).
    if (url === null) url = t
    i++
  }

  if (!url) return null

  const { base, params } = splitUrlAndQuery(url)
  const { auth, consumedHeaderIndex } = deriveAuth(headers, basicCreds)
  const finalHeaders =
    consumedHeaderIndex !== null
      ? headers.filter((_, idx) => idx !== consumedHeaderIndex)
      : headers

  const body: RequestBody | null = bodyText
    ? { kind: detectBodyKind(bodyText, finalHeaders), text: bodyText }
    : null

  // Method default: GET unless body is present (in which case POST).
  const finalMethod = method ?? (body ? "POST" : "GET")

  return {
    method: finalMethod,
    url: base,
    parameters: params,
    headers: finalHeaders,
    body,
    auth,
  }
}
