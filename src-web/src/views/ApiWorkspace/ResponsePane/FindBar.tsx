import type { Ref } from "react"
import { Glyph } from "@/components/Glyph"
import { cn } from "@/lib/utils"

interface Props {
  query: string
  onChange: (q: string) => void
  onNext: () => void
  onPrev: () => void
  onClose: () => void
  status?: string | null
  inputRef?: Ref<HTMLInputElement>
}

export function FindBar({
  query,
  onChange,
  onNext,
  onPrev,
  onClose,
  status,
  inputRef,
}: Props) {
  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface">
      <Glyph kind="search" size={12} color="var(--base04)" />
      <input
        ref={inputRef}
        autoFocus
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.shiftKey ? onPrev : onNext)()
          else if (e.key === "Escape") onClose()
        }}
        placeholder="Find in response"
        autoComplete="off"
        spellCheck={false}
        className="flex-1 bg-transparent border-none outline-none font-mono text-[0.786rem] text-fg placeholder:text-muted"
      />
      {status && (
        <span className="font-mono text-[0.714rem] text-muted shrink-0">
          {status}
        </span>
      )}
      <button
        type="button"
        aria-label="Previous match"
        onClick={onPrev}
        className="text-muted hover:text-fg bg-transparent border-0 cursor-pointer -rotate-90"
      >
        <Glyph kind="chevron" size={12} color="currentColor" />
      </button>
      <button
        type="button"
        aria-label="Next match"
        onClick={onNext}
        className="text-muted hover:text-fg bg-transparent border-0 cursor-pointer rotate-90"
      >
        <Glyph kind="chevron" size={12} color="currentColor" />
      </button>
      <button
        type="button"
        aria-label="Close find"
        onClick={onClose}
        className={cn(
          "flex items-center justify-center w-4 h-4 rounded-[2px] border-0",
          "bg-transparent cursor-pointer opacity-60 hover:opacity-100 transition-opacity",
        )}
      >
        <Glyph kind="x" size={10} color="var(--base04)" />
      </button>
    </div>
  )
}
