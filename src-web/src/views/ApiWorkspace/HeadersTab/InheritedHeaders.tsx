import { useState } from "react"
import { Glyph } from "@/components/Glyph"
import { cn } from "@/lib/utils"

export interface InheritedHeader {
  name: string
  value: string
  origin: "folder" | "workspace"
  folderId?: string
  source: string
  overridden: boolean
}

export function InheritedHeaders({
  headers,
  onNavigate,
}: {
  headers: InheritedHeader[]
  onNavigate?: (header: InheritedHeader) => void
}) {
  const [open, setOpen] = useState(false)
  if (headers.length === 0) return null

  return (
    <div className="mb-3 border border-border rounded-[5px] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-2 bg-surface hover:bg-subtle cursor-pointer border-0 outline-none text-left transition-colors"
      >
        <span
          className="inline-flex shrink-0 transition-transform duration-100"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          <Glyph kind="chevron" size={12} color="var(--base04)" />
        </span>
        <span className="font-sans text-[0.714rem] uppercase tracking-[1.2px] text-muted/70 font-semibold">
          Inherited
        </span>
        <span className="font-mono text-[0.714rem] text-muted/60">
          {headers.length}
        </span>
        <span className="ml-auto font-sans text-[0.714rem] text-muted/50">
          read-only
        </span>
      </button>

      {open && (
        <div className="border-t border-border">
          {headers.map((h, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: read-only snapshot, names can repeat across scopes
              key={`${h.name}:${i}`}
              className="grid grid-cols-[1fr_1fr_auto] gap-2 items-baseline px-2.5 py-[5px] border-b border-border/40 last:border-b-0"
            >
              {onNavigate && !h.overridden ? (
                <button
                  type="button"
                  onClick={() => onNavigate(h)}
                  title={`Open in ${h.source}`}
                  className="font-mono text-[0.786rem] text-fg truncate text-left cursor-pointer bg-transparent border-0 p-0 outline-none hover:text-accent transition-colors"
                >
                  {h.name}
                </button>
              ) : (
                <span
                  className={cn(
                    "font-mono text-[0.786rem] truncate",
                    h.overridden ? "text-muted/40 line-through" : "text-fg",
                  )}
                  title={
                    h.overridden ? "Overridden by a nearer scope" : undefined
                  }
                >
                  {h.name}
                </span>
              )}
              <span
                className={cn(
                  "font-mono text-[0.786rem] truncate",
                  h.overridden ? "text-muted/40 line-through" : "text-muted",
                )}
              >
                {h.value}
              </span>
              <span className="font-sans text-[0.643rem] text-muted/60 shrink-0">
                {h.source}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
