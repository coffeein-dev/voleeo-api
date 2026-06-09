import { Glyph } from "@/components/Glyph"
import type { RedirectInfo } from "../../../../../packages/types/bindings"

export function RedirectWarningBadge({ info }: { info: RedirectInfo }) {
  const { hopCount, bodyDropped, droppedHeaders } = info
  const headersDropped = droppedHeaders.length > 0
  const hopLabel = `${hopCount} hop${hopCount === 1 ? "" : "s"}`

  return (
    <div className="group relative shrink-0 flex items-center cursor-default">
      <Glyph kind="warning" size={14} color="var(--base0A)" />
      <div className="hidden group-hover:flex flex-col gap-1 absolute left-0 top-full mt-1 z-30 w-[260px] bg-surface border border-border rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] p-3">
        <span className="font-sans text-[0.857rem] font-semibold text-warn">
          Redirect dropped request data
        </span>
        {bodyDropped && (
          <span className="font-sans text-[0.857rem] text-fg">
            Body discarded · {hopLabel}
          </span>
        )}
        {headersDropped && (
          <span className="font-sans text-[0.857rem] text-fg break-words">
            Headers discarded · {droppedHeaders.join(", ")}
          </span>
        )}
        <span className="font-sans text-[0.786rem] text-muted">
          Hop chain in the Timeline tab.
        </span>
      </div>
    </div>
  )
}
