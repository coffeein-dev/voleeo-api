import { Glyph } from "@/components/Glyph"
import { cn } from "@/lib/utils"

interface Props {
  result: { value: string; error?: boolean } | null
  previewing: boolean
  disabled: boolean
  onRerun: () => void
}

export function FunctionPreviewPane({
  result,
  previewing,
  disabled,
  onRerun,
}: Props) {
  const previewText = previewing
    ? "Loading…"
    : result && !result.error
      ? result.value
      : "—"
  return (
    <div className="px-4 py-3 border-b border-border flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex-1 font-mono text-[0.786rem] bg-bg border border-border rounded-[4px] px-2 py-1.5 min-w-0 truncate select-text",
            result && !result.error ? "text-success" : "text-muted/50",
          )}
          title={result && !result.error ? result.value : undefined}
        >
          {previewText}
        </div>
        <button
          type="button"
          onClick={onRerun}
          disabled={previewing || disabled}
          title="Re-run preview"
          className="p-1.5 rounded-[4px] text-fg border border-border bg-transparent hover:bg-subtle disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed outline-none transition-colors shrink-0"
        >
          <Glyph
            kind="refresh"
            size={13}
            color={previewing ? "var(--base04)" : "var(--base05)"}
          />
        </button>
      </div>
      {result?.error && (
        <span className="font-sans text-[0.786rem] text-error leading-snug">
          {result.value}
        </span>
      )}
    </div>
  )
}
