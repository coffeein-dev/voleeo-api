import { Glyph } from "@/components/Glyph"
import type { EntityType } from "@/lib/gitEntityDiff"

export function EntityIcon({
  type,
  size = 15,
  color = "var(--fg-muted)",
}: {
  type: EntityType
  size?: number
  color?: string
}) {
  switch (type) {
    case "request":
      return <Glyph kind="send-right" size={size} color={color} />
    case "websocket":
      return <Glyph kind="plugs" size={size} color={color} />
    case "folder":
      return <Glyph kind="folder" size={size} color={color} />
    case "environment":
      return <Glyph kind="globe" size={size} color={color} />
    case "cookie":
      return <Glyph kind="cookie" size={size} color={color} />
    case "workspace":
      return <Glyph kind="api" size={size} color={color} />
    default:
      return null
  }
}
