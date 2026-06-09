import { useMemo, useState } from "react"
import { Glyph } from "@/components/Glyph"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Props {
  /** ISO-8601 string, or `null` when no date is set. */
  value: string | null | undefined
  onChange: (iso: string | null) => void
  /** Called after a user-driven commit (date pick or time blur). */
  onCommit?: () => void
  className?: string
  placeholder?: string
}

/**
 * Date + time picker. Trigger renders inline (button-shaped, same styling as
 * the surrounding TextField); clicking opens a popover with a `Calendar` and
 * a `HH:MM` time input row. Empty value renders as the placeholder.
 */
export function DateTimePicker({
  value,
  onChange,
  onCommit,
  className,
  placeholder = "Select date and time",
}: Props) {
  const [open, setOpen] = useState(false)
  // Parse once per render and surface as `Date | null` so the consumer code
  // can null-check the date without juggling a `Date | false | undefined`
  // ternary. Memoised on `value` because parent re-renders can be frequent
  // (this is rendered inside a form that re-renders on every keystroke).
  const date = useMemo<Date | null>(() => {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }, [value])

  function pickDate(next: Date | undefined) {
    if (!next) {
      onChange(null)
      onCommit?.()
      setOpen(false)
      return
    }
    // Preserve the current time when the user picks a new day.
    const merged = new Date(next)
    if (date) {
      merged.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), 0)
    }
    onChange(merged.toISOString())
    onCommit?.()
    setOpen(false)
  }

  function pickTime(hhmm: string) {
    if (!hhmm) return
    const [hh, mm] = hhmm.split(":").map((n) => Number.parseInt(n, 10))
    const base = date ? new Date(date) : new Date()
    base.setHours(hh, mm, 0, 0)
    onChange(base.toISOString())
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "w-full flex items-center justify-between gap-2 bg-bg border border-border rounded-lg text-fg px-2.5 py-2 text-[0.893rem] outline-none focus:border-accent focus:ring-3 focus:ring-accent/20 transition-colors leading-normal cursor-pointer",
          !date && "text-muted/70",
          className,
        )}
      >
        <span className="flex items-center gap-1.5 min-w-0 truncate">
          <Glyph kind="calendar" size={12} color="currentColor" />
          <span className="truncate">
            {date ? formatDisplay(date) : placeholder}
          </span>
        </span>
        <Glyph kind="chevron-down" size={10} color="currentColor" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2 flex flex-col gap-2">
        <Calendar
          mode="single"
          selected={date ?? undefined}
          onSelect={pickDate}
          captionLayout="dropdown"
        />
        <div className="flex items-center gap-2 px-1 pt-1 border-t border-border">
          <Glyph kind="clock" size={12} color="var(--base04)" />
          <span className="text-[0.75rem] font-semibold uppercase tracking-[1.2px] text-muted/70">
            Time
          </span>
          <input
            type="time"
            value={date ? toHHMM(date) : "00:00"}
            onChange={(e) => pickTime(e.target.value)}
            onBlur={() => onCommit?.()}
            className="ml-auto bg-bg border border-border rounded-md px-2 py-1 text-[0.857rem] text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors"
            style={{ colorScheme: "dark" }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function toHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDisplay(d: Date): string {
  const date = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  return `${date} ${toHHMM(d)}`
}
