import { Glyph } from "@/components/Glyph"
import type { Choice, ConflictField } from "@/lib/gitEntityDiff"
import { cn } from "@/lib/utils"
import { TemplateText } from "../TemplateText"

function FieldPath({ group, label }: { group: string; label?: string }) {
  return (
    <span className="flex items-center gap-1 font-sans text-[0.72rem] font-semibold text-fg">
      {group}
      {label && label !== group ? (
        <>
          <Glyph kind="chevron" size={10} color="var(--accent)" />
          <span className="font-mono font-medium text-muted">{label}</span>
        </>
      ) : null}
    </span>
  )
}

const CHOICE_BASE =
  "flex flex-col gap-[9px] text-left cursor-pointer min-w-0 px-3.5 py-3 rounded-[10px] border bg-bg transition-all"
const MARK_BASE =
  "shrink-0 w-[17px] h-[17px] rounded-full border-[1.5px] inline-flex items-center justify-center transition-all"
const VAL =
  "flex items-start gap-1.5 font-[var(--mono)] text-[length:var(--vfs)] leading-[1.5] text-fg whitespace-pre-wrap break-words"

function SideCard({
  group,
  label,
  value,
  chosen,
  dim,
  onPick,
}: {
  group: string
  label?: string
  value: string
  chosen: boolean
  dim: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        CHOICE_BASE,
        chosen
          ? "border-accent bg-[color-mix(in_oklch,var(--accent)_8%,var(--bg))] shadow-[inset_0_0_0_1px_var(--accent)]"
          : "border-border hover:border-[var(--border-strong)] hover:bg-surface",
        dim && "opacity-45 hover:opacity-70",
      )}
      onClick={onPick}
    >
      {/* Each card carries the field path so it reads standalone; the column
          headers above say which side it is. */}
      <span className="flex items-center justify-between gap-2">
        <FieldPath group={group} label={label} />
        <span
          className={cn(
            MARK_BASE,
            chosen ? "border-accent bg-accent" : "border-border",
          )}
        >
          {chosen && <Glyph kind="check" size={10} color="var(--base00)" />}
        </span>
      </span>
      <TemplateText className={VAL} value={value} />
    </button>
  )
}

interface Props {
  field: ConflictField
  chosen?: Choice
  onPick: (choice: Choice) => void
}

export function SideChooser({ field, chosen, onPick }: Props) {
  const showBoth = chosen === "both"
  const stateText = chosen
    ? chosen === "both"
      ? "Kept both"
      : chosen === "yours"
        ? "Kept yours"
        : "Kept remote"
    : "Pick a side"

  return (
    <div className="py-[18px] border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <span
          className={cn(
            "text-[0.821rem]",
            chosen ? "font-semibold text-success" : "font-medium text-muted",
          )}
        >
          {stateText}
        </span>
      </div>
      <div
        className="grid gap-9"
        style={{ gridTemplateColumns: "var(--cf-cols, 1fr 1fr)" }}
      >
        <SideCard
          group={field.group}
          label={field.label}
          value={field.yours}
          chosen={chosen === "yours" || showBoth}
          dim={!!chosen && chosen !== "yours" && !showBoth}
          onPick={() => onPick("yours")}
        />
        <SideCard
          group={field.group}
          label={field.label}
          value={field.theirs}
          chosen={chosen === "theirs" || showBoth}
          dim={!!chosen && chosen !== "theirs" && !showBoth}
          onPick={() => onPick("theirs")}
        />
      </div>
      {field.canBoth && (
        <button
          type="button"
          className={cn(
            "self-start mt-2.5 px-3 py-[5px] cursor-pointer rounded-full border bg-transparent font-sans text-[0.857rem] font-semibold transition-all",
            showBoth
              ? "text-accent border-[color-mix(in_oklch,var(--accent)_45%,transparent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)]"
              : "border-border text-muted hover:text-fg hover:border-[var(--border-strong)] hover:bg-surface",
          )}
          onClick={() => onPick(showBoth ? "yours" : "both")}
        >
          Keep both
        </button>
      )}
    </div>
  )
}
