import { useVirtualizer } from "@tanstack/react-virtual"
import { Fragment, useEffect, useRef, useState } from "react"
import { Glyph } from "@/components/Glyph"
import { cn } from "@/lib/utils"
import { useInterfaceStore } from "@/store/interface"
import type { HttpResponse } from "../../../../../packages/types/bindings"
import { FindBar } from "./FindBar"
import { jsonLineTokens } from "./jsonLineTokens"
import { useWindowedBody } from "./useWindowedBody"

// CodeMirror's effective line-height ≈ 1.5× its font size; match it so the
// virtual rows and the editor look consistent at any font setting.
const LINE_RATIO = 1.5

function isJsonResponse(response: HttpResponse): boolean {
  const ct = response.headers.find(
    (h) => h.name.toLowerCase() === "content-type",
  )?.value
  return !!ct && /json/i.test(ct)
}

/** Inline content of a line: JSON gets token coloring, anything else is plain. */
function renderLine(text: string, json: boolean) {
  if (!json) return text
  return jsonLineTokens(text).map((t, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional within a stable line
    <span key={i} style={t.color ? { color: t.color } : undefined}>
      {t.text}
    </span>
  ))
}

/** Virtualized viewer for large (windowed) response bodies: renders only the
 *  visible lines, fetches them on demand, and searches backend-side. */
export function VirtualBody({ response }: { response: HttpResponse }) {
  const {
    total,
    getLine,
    ensureRange,
    search,
    runSearch,
    stepMatch,
    filter,
    applyFilter,
  } = useWindowedBody(response)
  const parentRef = useRef<HTMLDivElement>(null)
  const [findOpen, setFindOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")
  const json = isJsonResponse(response)

  // Track the editor font setting so the viewer scales like the CodeMirror one.
  const fontSize = useInterfaceStore((s) => s.editorFontSize)
  const lineH = Math.round(fontSize * LINE_RATIO)

  const virt = useVirtualizer({
    count: total,
    getScrollElement: () => parentRef.current,
    estimateSize: () => lineH,
    overscan: 30,
  })
  const items = virt.getVirtualItems()

  // Keep the visible range's blocks loaded.
  const first = items[0]?.index ?? 0
  const last = items[items.length - 1]?.index ?? 0
  useEffect(() => {
    if (total > 0) ensureRange(first, last)
  }, [first, last, total, ensureRange])

  // Debounced backend search.
  useEffect(() => {
    const t = setTimeout(
      () => runSearch(query, { caseSensitive: false, wholeWord: false }),
      200,
    )
    return () => clearTimeout(t)
  }, [query, runSearch])

  // Debounced backend JSONPath filter.
  useEffect(() => {
    const t = setTimeout(() => applyFilter(filterQuery), 250)
    return () => clearTimeout(t)
  }, [filterQuery, applyFilter])

  function closeFilter() {
    setFilterQuery("")
    applyFilter("")
    setFilterOpen(false)
  }

  const activeMatch = search.active >= 0 ? search.matches[search.active] : null
  useEffect(() => {
    if (activeMatch) virt.scrollToIndex(activeMatch.line, { align: "center" })
  }, [activeMatch, virt])

  // Re-measure rows when the font setting (and thus row height) changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure on lineH change
  useEffect(() => virt.measure(), [lineH])

  const gutter = `${String(total).length + 1}ch`

  const filterStatus = filter?.error
    ? filter.error
    : filter
      ? filter.matchCount === 0
        ? "no matches"
        : `${filter.matchCount} match${filter.matchCount === 1 ? "" : "es"}`
      : null

  return (
    <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
      {filterOpen && (
        <div
          className={cn(
            "shrink-0 flex items-center gap-2 px-3 py-1.5 border-b bg-surface",
            filter?.error ? "border-error/60" : "border-border",
          )}
        >
          <Glyph
            kind="filter"
            size={12}
            color={filter?.error ? "var(--base08)" : "var(--base04)"}
          />
          <input
            autoFocus
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && closeFilter()}
            placeholder="$.field  ·  $.items[*].name  ·  $..author"
            spellCheck={false}
            className="flex-1 bg-transparent border-none outline-none font-mono text-[0.786rem] text-fg placeholder:text-muted"
          />
          {filterQuery.trim() && filterStatus && (
            <span
              className={cn(
                "font-mono text-[0.714rem] shrink-0",
                filter?.error ? "text-error" : "text-muted",
              )}
            >
              {filterStatus}
            </span>
          )}
          <button
            type="button"
            onClick={closeFilter}
            className="text-muted hover:text-fg bg-transparent border-0 cursor-pointer"
          >
            <Glyph kind="x" size={11} color="currentColor" />
          </button>
        </div>
      )}

      {findOpen ? (
        <FindBar
          query={query}
          onChange={setQuery}
          onNext={() => stepMatch(1)}
          onPrev={() => stepMatch(-1)}
          onClose={() => setFindOpen(false)}
          status={
            query.trim()
              ? search.total === 0
                ? "no matches"
                : `${search.active + 1}/${search.total}${search.truncated ? "+" : ""}`
              : null
          }
        />
      ) : (
        !filterOpen && (
          <div className="absolute top-1.5 right-4 z-10 flex items-center gap-1">
            {json && (
              <button
                type="button"
                title="Filter by JSONPath"
                onClick={() => setFilterOpen(true)}
                className="p-1 rounded-[3px] border border-border text-muted hover:text-fg hover:border-fg/30 bg-transparent cursor-pointer transition-colors"
              >
                <Glyph kind="filter" size={13} color="currentColor" />
              </button>
            )}
            <button
              type="button"
              title="Find in response"
              onClick={() => setFindOpen(true)}
              className="p-1 rounded-[3px] border border-border text-muted hover:text-fg hover:border-fg/30 bg-transparent cursor-pointer transition-colors"
            >
              <Glyph kind="search" size={13} color="currentColor" />
            </button>
          </div>
        )
      )}

      <div
        ref={parentRef}
        className="flex-1 overflow-auto selection:bg-accent/30"
        style={{
          fontFamily: "var(--editor-font-family)",
          fontSize: `${fontSize}px`,
          lineHeight: `${lineH}px`,
        }}
      >
        <div style={{ height: virt.getTotalSize(), position: "relative" }}>
          <div
            className="flex"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${items[0]?.start ?? 0}px)`,
            }}
          >
            {/* Line-number gutter — unselectable so copies exclude it. */}
            <div
              className="select-none text-right text-muted pr-3 shrink-0"
              style={{ width: gutter }}
            >
              {items.map((vi) => (
                <div key={vi.key} style={{ height: lineH }}>
                  {vi.index + 1}
                </div>
              ))}
            </div>
            {/* The lines render as ONE contiguous block (separated by newlines)
                so native selection spans them with no inter-line gaps. */}
            <div className="selectable-text whitespace-pre flex-1 min-w-0">
              {items.map((vi, idx) => (
                <Fragment key={vi.key}>
                  <span
                    className={cn(
                      activeMatch?.line === vi.index && "bg-accent/15",
                    )}
                  >
                    {renderLine(getLine(vi.index) ?? "", json)}
                  </span>
                  {idx < items.length - 1 ? "\n" : ""}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
