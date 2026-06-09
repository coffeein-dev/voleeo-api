import { useState } from "react"
import { Glyph } from "@/components/Glyph"
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog"
import { Checkbox } from "@/components/ui/checkbox"
import { type EntityChange, TYPE_GROUPS } from "@/lib/gitEntityDiff"
import { cn } from "@/lib/utils"
import { discardEntity } from "@/store/gitReview"
import { RV } from "../reviewClasses"

const STATUS_COLOR = {
  modified: "var(--accent)",
  added: "var(--c-add)",
  removed: "var(--c-del)",
} as const

interface Props {
  review: EntityChange[]
  selectedPath: string | null
  onSelect: (path: string) => void
  readOnly?: boolean
  isChecked?: (path: string) => boolean
  onToggleCheck?: (path: string) => void
}

export function ChangesSidebar({
  review,
  selectedPath,
  onSelect,
  readOnly,
  isChecked,
  onToggleCheck,
}: Props) {
  const [confirm, setConfirm] = useState<EntityChange | null>(null)

  const hasCheck = !!(isChecked && onToggleCheck)
  return (
    <div className={RV.list}>
      {review.length === 0 && (
        <div className={RV.empty}>No changes to commit yet.</div>
      )}
      {TYPE_GROUPS.map((tg) => {
        const rows = review.filter((e) => e.type === tg.type)
        if (!rows.length) return null
        return (
          <div key={tg.type} className={RV.group}>
            <div className={RV.groupH}>{tg.label}</div>
            {rows.map((ch) => (
              <div
                key={ch.path}
                className={cn(
                  RV.rowWrap,
                  ch.path === selectedPath && "bg-subtle",
                )}
              >
                {isChecked && onToggleCheck && (
                  <Checkbox
                    className={RV.rowCheck}
                    checked={isChecked(ch.path)}
                    onCheckedChange={() => onToggleCheck(ch.path)}
                  />
                )}
                <button
                  type="button"
                  className={cn(
                    RV.row,
                    hasCheck ? "pl-[9px] pr-[18px]" : "px-[18px]",
                  )}
                  onClick={() => onSelect(ch.path)}
                >
                  <span className={RV.rowMain}>
                    <span className={RV.rowTop}>
                      <span
                        className={RV.name}
                        style={{ color: STATUS_COLOR[ch.status] }}
                      >
                        {ch.name}
                      </span>
                    </span>
                  </span>
                </button>
                {!readOnly && (
                  <button
                    type="button"
                    className={RV.rowDiscard}
                    title="Rollback changes"
                    onClick={() => setConfirm(ch)}
                  >
                    <Glyph
                      kind="arrow-counter-clockwise"
                      size={13}
                      color="currentColor"
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      })}

      {confirm && (
        <ConfirmationDialog
          title="Rollback changes?"
          icon="warning"
          description={`This reverts "${confirm.name}" to the last committed version. It can't be undone.`}
          confirmLabel="Rollback"
          confirmVariant="destructive"
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            const path = confirm.path
            setConfirm(null)
            discardEntity(path)
          }}
        />
      )}
    </div>
  )
}
