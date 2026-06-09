import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Glyph } from "@/components/Glyph"
import { cn } from "@/lib/utils"
import { useRequestStore } from "@/store/requests"
import type { ApiFolder } from "../../../packages/types/bindings"

function buildFolderPath(
  folders: ApiFolder[],
  folderId: string | null,
): string {
  if (!folderId) return ""
  const parts: string[] = []
  let current: ApiFolder | undefined = folders.find((f) => f.id === folderId)
  while (current) {
    parts.unshift(current.name)
    current = folders.find((f) => f.id === current?.folderId)
  }
  if (parts.length <= 3) return parts.join(" / ")
  return `${parts[0]} / … / ${parts.slice(-2).join(" / ")}`
}

interface Props {
  value: string
  onChange: (id: string) => void
}

export function RequestPicker({ value, onChange }: Props) {
  const requests = useRequestStore((s) => s.requests)
  const folders = useRequestStore((s) => s.folders)

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [inputFocused, setInputFocused] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = requests.find((r) => r.id === value)

  const sorted = [...requests].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )
  const filtered = search.trim()
    ? sorted.filter((r) => {
        const q = search.toLowerCase()
        return (
          r.name.toLowerCase().includes(q) ||
          buildFolderPath(folders, r.folderId ?? null)
            .toLowerCase()
            .includes(q)
        )
      })
    : sorted

  function openPicker() {
    if (!containerRef.current) return
    setRect(containerRef.current.getBoundingClientRect())
    setOpen(true)
    setSearch("")
    setTimeout(() => dropdownRef.current?.focus(), 0)
  }

  function closePicker() {
    setOpen(false)
    setSearch("")
    setInputFocused(false)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: closePicker is a stable local function that only calls stable setState setters
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        !containerRef.current?.contains(t) &&
        !dropdownRef.current?.contains(t)
      )
        closePicker()
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "w-full flex items-center justify-between gap-1.5 font-mono text-[0.786rem] bg-bg border rounded-[4px] px-2 py-1.5 text-left outline-none transition-colors cursor-pointer",
          open ? "border-accent/60" : "border-border",
          selected ? "text-fg" : "text-muted/40",
        )}
      >
        <span className="truncate">
          {selected ? selected.name : "— select a request —"}
        </span>
        <span className="rotate-90 inline-flex shrink-0">
          <Glyph kind="chevron" size={11} color="var(--base04)" />
        </span>
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: rect.bottom + 4,
              left: rect.left,
              width: rect.width,
            }}
            className="z-[400] bg-surface border border-border rounded-[5px] shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden outline-none"
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                closePicker()
                return
              }
              if (
                !e.ctrlKey &&
                !e.metaKey &&
                !e.altKey &&
                e.key.length === 1 &&
                search === ""
              ) {
                setSearch(e.key)
                setTimeout(() => inputRef.current?.focus(), 0)
              }
            }}
          >
            {(search !== "" || inputFocused) && (
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearch("")
                    e.stopPropagation()
                  }
                }}
                placeholder="Search requests…"
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-[0.786rem] bg-transparent px-3 py-2 text-fg outline-none placeholder:text-muted/40 border-b border-border shrink-0"
              />
            )}
            <ul className="overflow-y-auto max-h-56">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 font-sans text-[0.786rem] text-muted/60">
                  No requests found
                </li>
              ) : (
                filtered.map((req) => {
                  const folderPath = buildFolderPath(
                    folders,
                    req.folderId ?? null,
                  )
                  const isSelected = req.id === value
                  return (
                    <li key={req.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(req.id)
                          closePicker()
                        }}
                        className={cn(
                          "w-full flex flex-row items-center justify-between gap-2 px-3 py-2 text-left cursor-pointer border-none transition-colors",
                          isSelected
                            ? "bg-subtle"
                            : "bg-transparent hover:bg-subtle",
                        )}
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-mono text-[0.786rem] text-fg leading-tight truncate">
                            {req.name}
                          </span>
                          {folderPath && (
                            <span className="font-sans text-[0.714rem] text-muted/60 leading-tight truncate">
                              {folderPath}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Glyph kind="check" size={11} color="var(--base0D)" />
                        )}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  )
}
