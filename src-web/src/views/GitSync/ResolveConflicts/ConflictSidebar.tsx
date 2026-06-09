import { Glyph } from "@/components/Glyph"
import { type ConflictEntity, TYPE_GROUPS } from "@/lib/gitEntityDiff"
import { cn } from "@/lib/utils"
import { type ChoiceMap, choiceKey } from "./index"

interface Props {
  conflicts: ConflictEntity[]
  choices: ChoiceMap
  selectedPath: string | null
  onSelect: (path: string) => void
}

export function ConflictSidebar({
  conflicts,
  choices,
  selectedPath,
  onSelect,
}: Props) {
  const remainingOf = (e: ConflictEntity) =>
    e.conflicts.filter((f) => !choices[choiceKey(e.path, f.id)]).length

  // Single-line rows grouped by type, mirroring the Changes sidebar. The leading
  // mark shows per-entity state (overall "N left" lives in the footer button).
  return (
    <div className="flex-1 min-h-0 overflow-auto pt-2">
      {TYPE_GROUPS.map((tg) => {
        const rows = conflicts.filter((e) => e.type === tg.type)
        if (!rows.length) return null
        return (
          <div key={tg.type} className="mb-2">
            <div className="px-[18px] pt-2 pb-1 text-[0.75rem] font-semibold tracking-[0.05em] uppercase text-muted">
              {tg.label}
            </div>
            {rows.map((e) => {
              const done = remainingOf(e) === 0
              return (
                <button
                  type="button"
                  key={e.path}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-[18px] py-[7px] border-0 cursor-pointer bg-transparent text-left transition-colors hover:bg-surface",
                    e.path === selectedPath && "bg-subtle",
                  )}
                  onClick={() => onSelect(e.path)}
                >
                  <span className="font-sans text-[0.929rem] font-medium text-fg truncate">
                    {e.name}
                  </span>
                  {done && (
                    <span className="ml-auto inline-flex text-success">
                      <Glyph kind="check" size={12} color="currentColor" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
