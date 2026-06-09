import {
  findNext,
  findPrevious,
  SearchCursor,
  SearchQuery,
  setSearchQuery,
} from "@codemirror/search"
import type { EditorView } from "@uiw/react-codemirror"
import { type RefObject, useCallback, useState } from "react"

const MATCH_CAP = 5000

/** Match start offsets (case-insensitive), capped. */
function matchStarts(view: EditorView, query: string): number[] {
  const cursor = new SearchCursor(
    view.state.doc,
    query,
    0,
    view.state.doc.length,
    (s) => s.toLowerCase(),
  )
  const out: number[] = []
  cursor.next()
  while (!cursor.done && out.length < MATCH_CAP) {
    out.push(cursor.value.from)
    cursor.next()
  }
  return out
}

/** Drives CodeMirror's own search engine from a custom find bar: highlights all
 *  matches, navigates, and reports `current/total`. */
export function useCmFind(viewRef: RefObject<EditorView | null>) {
  const [query, setQueryState] = useState("")
  const [info, setInfo] = useState({ current: 0, total: 0 })

  const apply = useCallback(
    (q: string, nav?: "next" | "prev") => {
      const view = viewRef.current
      if (!view) return
      if (!q) {
        view.dispatch({
          effects: setSearchQuery.of(new SearchQuery({ search: "" })),
        })
        setInfo({ current: 0, total: 0 })
        return
      }
      view.dispatch({
        effects: setSearchQuery.of(new SearchQuery({ search: q })),
      })
      const starts = matchStarts(view, q)
      if (nav === "prev") findPrevious(view)
      else findNext(view)
      const sel = view.state.selection.main.from
      const idx = starts.indexOf(sel)
      setInfo({
        current: idx >= 0 ? idx + 1 : starts.length ? 1 : 0,
        total: starts.length,
      })
    },
    [viewRef],
  )

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q)
      apply(q)
    },
    [apply],
  )
  const next = useCallback(() => apply(query, "next"), [apply, query])
  const prev = useCallback(() => apply(query, "prev"), [apply, query])
  const clear = useCallback(() => {
    setQueryState("")
    apply("")
  }, [apply])

  const status = query.trim()
    ? info.total === 0
      ? "no matches"
      : `${info.current}/${info.total}`
    : null

  return { query, setQuery, next, prev, clear, status }
}
