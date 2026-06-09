export interface LineToken {
  text: string
  color?: string
}

// One pass over a single line — keys vs string values are told apart by a
// trailing `:`. Only the visible lines are tokenized, so this stays cheap.
const TOKEN =
  /("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g

/** Color a line of pretty-printed JSON using base16 theme vars. */
export function jsonLineTokens(line: string): LineToken[] {
  const out: LineToken[] = []
  let last = 0
  TOKEN.lastIndex = 0
  let m = TOKEN.exec(line)
  while (m) {
    const tok = m[0]
    if (m.index > last) out.push({ text: line.slice(last, m.index) })
    if (m[1]) {
      const isKey = line
        .slice(m.index + tok.length)
        .trimStart()
        .startsWith(":")
      out.push({ text: tok, color: isKey ? "var(--base0D)" : "var(--base0B)" })
    } else if (m[2]) {
      out.push({ text: tok, color: "var(--base0A)" })
    } else if (m[3]) {
      out.push({ text: tok, color: "var(--base0E)" })
    } else {
      out.push({ text: tok, color: "var(--base04)" })
    }
    last = m.index + tok.length
    m = TOKEN.exec(line)
  }
  if (last < line.length) out.push({ text: line.slice(last) })
  return out
}
