import type { RefObject } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { RequestParameter } from "@/store/requests"
import { emptyRow, type ParamRow, paramsToRows } from "../paramUtils"

export interface UseHeaderRowsResult {
  rows: ParamRow[]
  setRows: React.Dispatch<React.SetStateAction<ParamRow[]>>
  headerValueInputRefs: RefObject<Map<number, HTMLDivElement>>
  headerKeyInputRefs: RefObject<Map<number, HTMLDivElement>>
  updateRow: (id: number, field: "key" | "value", val: string) => void
  toggleRow: (id: number) => void
  selectAll: (enable: boolean) => void
  removeRow: (id: number) => void
  suppressSync: (json: string) => void
  /** Ref to the commit function. Parent updates `.current` each render. */
  commitRowsRef: RefObject<(next: ParamRow[]) => Promise<void>>
}

interface UseHeaderRowsOptions {
  sourceId: string
  headers: RequestParameter[]
}

export function useHeaderRows({
  sourceId,
  headers,
}: UseHeaderRowsOptions): UseHeaderRowsResult {
  const commitRowsRef = useRef<(next: ParamRow[]) => Promise<void>>(
    async () => {},
  )

  const headerValueInputRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const headerKeyInputRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const prevSourceIdRef = useRef(sourceId)

  const [rows, setRows] = useState<ParamRow[]>(() => [
    ...paramsToRows(headers),
    emptyRow(),
  ])
  const prevHeadersJsonRef = useRef<string>(JSON.stringify(headers))

  const suppressSync = useCallback((json: string) => {
    prevHeadersJsonRef.current = json
  }, [])

  // Reset rows when the source entity changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only fires on id change
  useEffect(() => {
    if (sourceId === prevSourceIdRef.current) return
    prevSourceIdRef.current = sourceId
    prevHeadersJsonRef.current = JSON.stringify(headers)
    setRows([...paramsToRows(headers), emptyRow()])
  }, [sourceId])

  // Sync when headers change externally (e.g. another tab saves the source).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — guards via JSON equality
  useEffect(() => {
    if (sourceId !== prevSourceIdRef.current) return
    const key = JSON.stringify(headers)
    if (key === prevHeadersJsonRef.current) return
    prevHeadersJsonRef.current = key
    setRows([...paramsToRows(headers), emptyRow()])
  }, [headers])

  function updateRow(id: number, field: "key" | "value", val: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r._id === id)
      if (idx === -1) return prev
      const next = prev.map((r) => (r._id === id ? { ...r, [field]: val } : r))
      if (field === "key" && val !== "" && idx === prev.length - 1)
        next.push(emptyRow())
      void commitRowsRef.current(next)
      return next
    })
  }

  function toggleRow(id: number) {
    setRows((prev) => {
      const next = prev.map((r) =>
        r._id === id ? { ...r, enabled: !r.enabled } : r,
      )
      void commitRowsRef.current(next)
      return next
    })
  }

  // Enable/disable every named row at once (the empty trailing row is skipped).
  function selectAll(enable: boolean) {
    setRows((prev) => {
      const next = prev.map((r) =>
        r.key.trim() !== "" ? { ...r, enabled: enable } : r,
      )
      void commitRowsRef.current(next)
      return next
    })
  }

  function removeRow(id: number) {
    setRows((prev) => {
      const next = prev.filter((r) => r._id !== id)
      const result = next.length > 0 ? next : [emptyRow()]
      void commitRowsRef.current(result)
      return result
    })
  }

  return {
    rows,
    setRows,
    headerValueInputRefs,
    headerKeyInputRefs,
    updateRow,
    toggleRow,
    selectAll,
    removeRow,
    suppressSync,
    commitRowsRef,
  }
}
