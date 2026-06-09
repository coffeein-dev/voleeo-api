import type { RefObject } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import type { RequestParameter } from "@/store/requests"
import {
  emptyRow,
  paramsToRows,
  type QueryRow,
  queryParamsOnly,
} from "../paramUtils"

export interface UseQueryRowsResult {
  rows: QueryRow[]
  setRows: React.Dispatch<React.SetStateAction<QueryRow[]>>
  queryValueInputRefs: RefObject<Map<number, HTMLDivElement>>
  queryKeyInputRefs: RefObject<Map<number, HTMLDivElement>>
  updateRow: (id: number, field: "key" | "value", val: string) => void
  toggleRow: (id: number) => void
  removeRow: (id: number) => void
  suppressSync: (json: string) => void
  /** Ref to the commit function. Parent updates `.current` each render. */
  commitRowsRef: RefObject<(next: QueryRow[]) => Promise<void>>
}

interface UseQueryRowsOptions {
  sourceId: string
  url: string
  parameters: RequestParameter[]
  pendingQueryParams: Array<{ key: string; value: string }> | null | undefined
  onPendingQueryParamsConsumed: (() => void) | undefined
  urlParamSet: Set<string>
  manualPathParamNames: string[]
  onManualPathParamNamesChange: (names: string[]) => void
  onPathParamValuesChange: (values: Record<string, string>) => void
  pathParamValues: Record<string, string>
  setPendingKeyFocusName: (name: string | null) => void
}

export function useQueryRows({
  sourceId,
  url,
  parameters,
  pendingQueryParams,
  onPendingQueryParamsConsumed,
  urlParamSet,
  manualPathParamNames,
  onManualPathParamNamesChange,
  onPathParamValuesChange,
  pathParamValues,
  setPendingKeyFocusName,
}: UseQueryRowsOptions): UseQueryRowsResult {
  // Commit ref — created here, `.current` updated by the parent each render.
  const commitRowsRef = useRef<(next: QueryRow[]) => Promise<void>>(
    async () => {},
  )

  const queryValueInputRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const queryKeyInputRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const prevRequestIdRef = useRef(sourceId)

  const [rows, setRows] = useState<QueryRow[]>(() => [
    ...paramsToRows(queryParamsOnly(parameters, url)),
    emptyRow(),
  ])
  const prevQueryParamsJsonRef = useRef<string>(
    JSON.stringify(queryParamsOnly(parameters, url)),
  )
  const suppressSync = useCallback((json: string) => {
    prevQueryParamsJsonRef.current = json
  }, [])

  const [pendingFocusQueryId, setPendingFocusQueryId] = useState<number | null>(
    null,
  )
  const [pendingFocusQueryKeyId, setPendingFocusQueryKeyId] = useState<
    number | null
  >(null)

  // Reset rows when the active entity changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — only fires on id change; reads parameters/url via closure to avoid double-reset
  useEffect(() => {
    if (sourceId === prevRequestIdRef.current) return
    prevRequestIdRef.current = sourceId
    const qParams = queryParamsOnly(parameters, url)
    prevQueryParamsJsonRef.current = JSON.stringify(qParams)
    setRows([...paramsToRows(qParams), emptyRow()])
    setPendingFocusQueryId(null)
  }, [sourceId])

  // Sync when parameters change externally (e.g. imported from URL bar).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — fires on parameters change; reads id/url via closure to guard against id-switch races
  useEffect(() => {
    if (sourceId !== prevRequestIdRef.current) return
    const qParams = queryParamsOnly(parameters, url)
    const key = JSON.stringify(qParams)
    if (key === prevQueryParamsJsonRef.current) return
    prevQueryParamsJsonRef.current = key
    setRows([...paramsToRows(qParams), emptyRow()])
  }, [parameters])

  // Merge query params extracted from the URL bar (paste / `?` typed).
  // biome-ignore lint/correctness/useExhaustiveDependencies: onPendingQueryParamsConsumed is a callback prop that changes identity on every render; commitRowsRef.current is a ref
  useEffect(() => {
    if (!pendingQueryParams) return
    onPendingQueryParamsConsumed?.()
    if (pendingQueryParams.length === 0) {
      setRows((prev) => {
        const trailing = prev[prev.length - 1]
        if (trailing && trailing.key === "" && trailing.value === "") {
          setPendingFocusQueryKeyId(trailing._id)
        }
        return prev
      })
      return
    }
    const newRowsList = pendingQueryParams.map((p) => ({
      ...emptyRow(),
      key: p.key,
      value: p.value,
    }))
    const firstNewId = newRowsList[0]?._id ?? null
    setRows((prev) => {
      const existing = prev.filter((r) => r.key !== "" || r.value !== "")
      const merged = [...existing, ...newRowsList, emptyRow()]
      void commitRowsRef.current(merged)
      return merged
    })
    if (firstNewId !== null) setPendingFocusQueryId(firstNewId)
  }, [pendingQueryParams])

  // Focus the value input of the first newly-added query param row.
  useEffect(() => {
    if (pendingFocusQueryId === null) return
    const el = queryValueInputRefs.current.get(pendingFocusQueryId)
    if (el) {
      el.focus()
      setPendingFocusQueryId(null)
    }
  }, [pendingFocusQueryId])

  // Focus the key input of the trailing row when `?` is typed with no query string.
  useEffect(() => {
    if (pendingFocusQueryKeyId === null) return
    const el = queryKeyInputRefs.current.get(pendingFocusQueryKeyId)
    if (el) {
      el.focus()
      setPendingFocusQueryKeyId(null)
    }
  }, [pendingFocusQueryKeyId])

  function updateRow(id: number, field: "key" | "value", val: string) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r._id === id)
      if (idx === -1) return prev

      // `:paramName` in key field → promote row to a path param
      if (field === "key" && val.startsWith(":") && val.length >= 2) {
        const name = val.slice(1)
        if (manualPathParamNames.includes(name) || urlParamSet.has(name)) {
          return prev.map((r) => (r._id === id ? { ...r, key: val } : r))
        }
        const rowValue = prev[idx].value
        const next = prev.filter((r) => r._id !== id)
        const result = next.length > 0 ? next : [emptyRow()]
        onManualPathParamNamesChange([...manualPathParamNames, name])
        if (rowValue)
          onPathParamValuesChange({ ...pathParamValues, [name]: rowValue })
        setPendingKeyFocusName(name)
        void commitRowsRef.current(result)
        return result
      }

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
    queryValueInputRefs,
    queryKeyInputRefs,
    updateRow,
    toggleRow,
    removeRow,
    suppressSync,
    commitRowsRef,
  }
}
