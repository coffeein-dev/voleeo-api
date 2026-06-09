import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Arg } from "./utils"

const INPUT_CLASS =
  "font-mono text-[0.786rem] bg-bg border border-border rounded-[4px] px-2 py-1.5 text-fg outline-none focus:border-accent/60 select-text placeholder:text-muted/40 w-full"

interface Props {
  arg: Arg
  value: string
  focused: boolean
  onChange: (value: string) => void
  onFocusChange: (focused: boolean) => void
}

/** Renders one function argument by `arg.type`. */
export function ArgInput({
  arg,
  value,
  focused,
  onChange,
  onFocusChange,
}: Props) {
  const placeholder = arg.placeholder ?? arg.defaultValue ?? ""

  if (arg.type === "secret") {
    const hasValue = value !== ""
    return (
      <input
        // Masked: a fixed 9-char string so the browser renders exactly 9
        // dots — never reveals the real value's length.
        type={hasValue && !focused ? "password" : "text"}
        value={hasValue && !focused ? "█████████" : value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        className={INPUT_CLASS}
      />
    )
  }

  if (arg.type === "select") {
    return (
      <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
        <SelectTrigger className="w-full font-mono text-[0.786rem] rounded-[4px] border-border bg-bg text-fg h-auto py-1.5 px-2 focus-visible:ring-0 focus-visible:border-accent/60">
          <SelectValue>
            {(v: unknown) =>
              arg.options?.find((o) => o.value === v)?.label ??
              (typeof v === "string" ? v : "")
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className="font-mono text-[0.786rem]"
          alignItemWithTrigger={false}
        >
          {(arg.options ?? []).map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (arg.type === "buttons") {
    return (
      <div className="flex items-center gap-1">
        {(arg.options ?? []).map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex-1 font-sans text-[0.786rem] px-2 py-1.5 rounded-[4px] border outline-none transition-colors cursor-pointer",
                active
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border bg-bg text-fg hover:bg-subtle",
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (arg.type === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        min={arg.min}
        placeholder={placeholder}
        className={INPUT_CLASS}
      />
    )
  }

  if (arg.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={value === "true"}
          onCheckedChange={(c) => onChange(c === true ? "true" : "false")}
        />
        <span className="font-sans text-[0.857rem] text-fg">
          {arg.label ?? arg.name}
        </span>
      </label>
    )
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder}
      className={INPUT_CLASS}
    />
  )
}
