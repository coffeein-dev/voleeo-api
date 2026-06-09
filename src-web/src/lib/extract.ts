import { JSONPath } from "jsonpath-plus"

/**
 * Extract a value from a body string.
 *
 * selector rules:
 *   - empty / whitespace → return raw body text
 *   - starts with "$"    → JSONPath
 *   - starts with "/" or "//" → XPath (browser DOMParser)
 */
export function extractBody(body: string, selector: string): string {
  const s = selector.trim()
  if (!s) return body
  if (s.startsWith("$")) return extractJsonPath(body, s)
  if (s.startsWith("/")) return extractXPath(body, s)
  throw new Error(
    `Unknown selector format: ${JSON.stringify(s)}. Use $… for JSONPath or /… for XPath.`,
  )
}

function extractJsonPath(body: string, path: string): string {
  let json: object
  try {
    json = JSON.parse(body) as object
  } catch {
    throw new Error("Body is not valid JSON")
  }
  const matches = JSONPath({ path, json, wrap: true }) as unknown as unknown[]
  if (matches.length === 0) return ""
  const out = matches.length === 1 ? matches[0] : matches
  return typeof out === "string" ? out : JSON.stringify(out)
}

function extractXPath(body: string, path: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(body, "application/xml")
  if (doc.querySelector("parsererror")) {
    throw new Error("Body is not valid XML")
  }
  const result = document.evaluate(path, doc, null, XPathResult.ANY_TYPE, null)
  if (result.resultType === XPathResult.STRING_TYPE) return result.stringValue
  if (result.resultType === XPathResult.NUMBER_TYPE)
    return String(result.numberValue)
  if (result.resultType === XPathResult.BOOLEAN_TYPE)
    return String(result.booleanValue)

  const serializer = new XMLSerializer()
  const parts: string[] = []
  let node = result.iterateNext()
  while (node) {
    parts.push(serializer.serializeToString(node))
    node = result.iterateNext()
  }
  return parts.join("\n")
}

/** Look up a `{ name, value }` entry by name. Case-insensitive by default. */
export function extractHeader(
  items: { name: string; value: string }[],
  name: string,
  opts: { caseInsensitive?: boolean } = {},
): string {
  const ci = opts.caseInsensitive ?? true
  const target = ci ? name.toLowerCase() : name
  const match = items.find(
    (h) => (ci ? h.name.toLowerCase() : h.name) === target,
  )
  if (!match) throw new Error(`"${name}" not found`)
  return match.value
}
