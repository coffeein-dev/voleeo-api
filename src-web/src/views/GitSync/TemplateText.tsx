import type { CSSProperties } from "react"
import { toHtml } from "@/lib/template"

// `{{ env }}` and `{{ fn(...) }}` tokens render as the app's chip blocks, but
// here they're purely display — no autocomplete, no click handlers. We don't
// validate against the active environment (this is a historical diff), so every
// var reads as "found" and every function as "ok" to avoid spurious warnings.
const FOUND = () => "found" as const
const OK = () => "ok" as const

export function TemplateText({
  value,
  className,
  style,
}: {
  value: string
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={className}
      style={style}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: toHtml escapes all user text; only our own chip markup is injected.
      dangerouslySetInnerHTML={{ __html: toHtml(value, FOUND, OK) }}
    />
  )
}
