import { Fragment } from "react"
import { formatKeyCombo } from "@/config/shortcuts"
import type { KeyCombo } from "@/hooks/useKeydown"

interface Row {
  label: string
  combo: KeyCombo
}

interface Props {
  rows: Row[]
}

export function EmptyPaneShortcuts({ rows }: Props) {
  return (
    <div className="h-full grid place-items-center select-none">
      <div className="grid grid-cols-[auto_auto] gap-x-6 gap-y-2 font-sans text-[0.857rem] text-muted">
        {rows.map((r) => (
          <Fragment key={r.label}>
            <span>{r.label}</span>
            <kbd className="font-mono text-[0.857rem] tracking-[0.2em] text-fg text-right">
              {formatKeyCombo(r.combo)}
            </kbd>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
