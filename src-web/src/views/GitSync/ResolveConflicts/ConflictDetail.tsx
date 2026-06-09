import type { ConflictEntity } from "@/lib/gitEntityDiff"
import { type ChoiceMap, choiceKey } from "./index"
import { SideChooser } from "./SideChooser"

const BULK_BTN =
  "ml-auto inline-flex items-center rounded-[5px] border border-border bg-transparent px-2 py-[3px] font-sans text-[0.72rem] font-medium normal-case tracking-normal text-muted cursor-pointer transition-colors hover:bg-subtle hover:text-fg"

const COL_H =
  "flex items-center gap-[7px] text-[0.786rem] font-bold tracking-[0.06em] uppercase text-muted whitespace-nowrap"

interface Props {
  entity: ConflictEntity | null
  choices: ChoiceMap
  onPick: (
    path: string,
    fieldId: string,
    choice: "yours" | "theirs" | "both",
  ) => void
  onKeepAll: (which: "yours" | "theirs") => void
}

export function ConflictDetail({ entity, choices, onPick, onKeepAll }: Props) {
  // Entities with no field-level clash are filtered out upstream (auto-merged on
  // save), so a rendered detail always has conflicts to choose.
  if (!entity) return null

  return (
    <div className="flex-1 min-h-0 overflow-auto px-[18px] pt-2 pb-10">
      <div
        className="sticky top-0 z-[1] grid gap-9 pt-1.5 pb-1 bg-bg"
        style={{ gridTemplateColumns: "var(--cf-cols, 1fr 1fr)" }}
      >
        <span className={COL_H}>
          Yours
          <button
            type="button"
            className={BULK_BTN}
            onClick={() => onKeepAll("yours")}
          >
            Keep all yours
          </button>
        </span>
        <span className={COL_H}>
          Remote
          <button
            type="button"
            className={BULK_BTN}
            onClick={() => onKeepAll("theirs")}
          >
            Use all remote
          </button>
        </span>
      </div>
      {entity.conflicts.map((f) => (
        <SideChooser
          key={f.id}
          field={f}
          chosen={choices[choiceKey(entity.path, f.id)]}
          onPick={(c) => onPick(entity.path, f.id, c)}
        />
      ))}
    </div>
  )
}
