import { type ParsedRequest, parseCurlCommand } from "./curlParser"
import { parseHttpieCommand } from "./httpieParser"

export type ImportSource = "curl" | "httpie"

export interface CommandImportResult {
  source: ImportSource
  parsed: ParsedRequest
}

/** If `text` looks like a `curl …` or `http …`/`https …` command line, parse
 *  it into a Voleeo request shape; otherwise return null. */
export function tryParseCommand(text: string): CommandImportResult | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  if (/^curl(\s|$)/.test(trimmed)) {
    const parsed = parseCurlCommand(trimmed)
    if (parsed) return { source: "curl", parsed }
  }

  if (/^https?(\s|$)/.test(trimmed)) {
    const parsed = parseHttpieCommand(trimmed)
    if (parsed) return { source: "httpie", parsed }
  }

  return null
}
