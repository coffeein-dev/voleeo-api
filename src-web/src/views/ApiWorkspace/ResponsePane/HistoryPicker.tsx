import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Glyph } from "@/components/Glyph"
import { cn } from "@/lib/utils"
import type { StoredHttpResponseSummary } from "../../../../../packages/types/bindings"
import { commands } from "../../../../../packages/types/bindings"
import { formatDuration } from "./format"

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

interface Props {
  workspaceId: string
  requestId: string
  selectedId: string | null
  refreshKey: number
  onSelect: (responseId: string, isLatest: boolean) => void
  onClear: () => void
}

export function HistoryPicker({
  workspaceId,
  requestId,
  selectedId,
  refreshKey,
  onSelect,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<StoredHttpResponseSummary[]>([])
  const [confirmClear, setConfirmClear] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    right: number
  } | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const res = await commands.responseList(workspaceId, requestId)
    if (res.status === "ok") setItems(res.data)
  }, [workspaceId, requestId])

  // Reset immediately on request change to prevent showing stale list.
  // biome-ignore lint/correctness/useExhaustiveDependencies: requestId is the reset trigger
  useEffect(() => {
    setItems([])
    setOpen(false)
    setConfirmClear(false)
  }, [requestId])

  // Fetch whenever the request changes — drives button visibility count.
  useEffect(() => {
    load()
  }, [load])

  // Re-fetch when a new response is stored for this request.
  useEffect(() => {
    if (refreshKey > 0) load()
  }, [refreshKey, load])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        buttonRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
      setConfirmClear(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const handleToggle = useCallback(() => {
    if (!open && buttonRef.current) {
      // Capture position before opening so portal can place itself correctly.
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen((v) => !v)
    setConfirmClear(false)
  }, [open])

  const handleClear = useCallback(async () => {
    await commands.responseClear(workspaceId, requestId)
    setItems([])
    setConfirmClear(false)
    setOpen(false)
    onClear()
  }, [workspaceId, requestId, onClear])

  // Hide button entirely when there is no history.
  if (items.length === 0) return null

  // Fall back to the latest item when there's no explicit selection so the
  // live response (which is always items[0]) appears pre-selected.
  const effectiveSelectedId = selectedId ?? items[0]?.id

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title="Response history"
        className={cn(
          "flex items-center gap-1 px-1.5 py-1 rounded-[3px] cursor-pointer border-none transition-colors",
          open
            ? "text-accent bg-accent/10"
            : "text-muted hover:text-fg bg-transparent",
        )}
      >
        <Glyph kind="history" size={13} color="currentColor" />
      </button>

      {open &&
        dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPos.top,
              right: dropdownPos.right,
            }}
            className="z-[9999] w-64 bg-bg border border-border rounded-[5px] shadow-lg flex flex-col max-h-[28rem]"
          >
            <ul className="flex-1 overflow-y-auto py-1 min-h-0">
              {items.map((item, idx) => {
                const isSelected = item.id === effectiveSelectedId
                const isLatest = idx === 0
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(item.id, isLatest)
                        setOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer border-none transition-colors",
                        isSelected
                          ? "bg-accent/10 text-accent"
                          : "bg-transparent hover:bg-surface",
                      )}
                    >
                      <span
                        className={cn(
                          "font-mono text-[0.714rem] font-bold shrink-0",
                          isSelected
                            ? "text-accent"
                            : item.status < 300
                              ? "text-success"
                              : item.status < 500
                                ? "text-amber-500"
                                : "text-destructive",
                        )}
                      >
                        {item.status}
                      </span>
                      <Glyph
                        kind="arrow"
                        size={9}
                        color={isSelected ? "var(--base0D)" : "var(--base04)"}
                      />
                      <span
                        className={cn(
                          "font-mono text-[0.75rem] shrink-0",
                          isSelected ? "text-accent" : "text-muted",
                        )}
                      >
                        {formatDuration(item.totalMs ?? 0)}
                      </span>
                      <span
                        className={cn(
                          "text-[0.75rem] shrink-0 ml-auto",
                          isSelected ? "text-accent/70" : "text-muted/60",
                        )}
                      >
                        {formatRelative(item.recordedAt)}
                      </span>
                      {isSelected && (
                        <Glyph kind="check" size={10} color="currentColor" />
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="border-t border-border py-1 shrink-0">
              {confirmClear ? (
                <div className="px-3 py-2">
                  <p className="text-[0.75rem] text-fg mb-2 leading-snug">
                    Clear all response history?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleClear}
                      className="flex-1 px-2 py-1 rounded-[3px] bg-destructive/15 text-destructive text-[0.75rem] font-medium cursor-pointer border-none hover:bg-destructive/25 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 px-2 py-1 rounded-[3px] bg-surface text-muted text-[0.75rem] cursor-pointer border-none hover:text-fg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer border-none bg-transparent text-destructive/70 hover:text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <Glyph kind="trash" size={11} color="currentColor" />
                  <span className="text-[0.75rem]">Clear History</span>
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
