import type React from "react"
import { useCallback, useEffect } from "react"
import { buildPathParams, type QueryRow, rowsToParams } from "../paramUtils"
import type { ParamsCommit } from "./paramsCommit"

interface UseParamCountsOptions {
  allPathParams: string[]
  pathParamEnabled: Record<string, boolean>
  pathParamValues: Record<string, string>
  rows: QueryRow[]
  onParamCountChange: ((enabled: number, total: number) => void) | undefined
  onPathParamEnabledChange: (enabled: Record<string, boolean>) => void
  setRows: React.Dispatch<React.SetStateAction<QueryRow[]>>
  suppressSync: (json: string) => void
  commit: ParamsCommit
}

export interface UseParamCountsResult {
  totalParams: number
  allEnabled: boolean
  selectAll: (enable: boolean) => void
}

export function useParamCounts({
  allPathParams,
  pathParamEnabled,
  pathParamValues,
  rows,
  onParamCountChange,
  onPathParamEnabledChange,
  setRows,
  suppressSync,
  commit,
}: UseParamCountsOptions): UseParamCountsResult {
  const filledRows = rows.filter((r) => r.key !== "" || r.value !== "")
  const totalParams = allPathParams.length + filledRows.length
  const enabledCount =
    allPathParams.filter((n) => pathParamEnabled[n] !== false).length +
    filledRows.filter((r) => r.enabled).length
  const allEnabled = enabledCount === totalParams

  useEffect(() => {
    onParamCountChange?.(enabledCount, totalParams)
  }, [enabledCount, totalParams, onParamCountChange])

  const selectAll = useCallback(
    (enable: boolean) => {
      const nextEnabled: Record<string, boolean> = {}
      for (const name of allPathParams) nextEnabled[name] = enable
      onPathParamEnabledChange(nextEnabled)
      setRows((prev) => {
        const next = prev.map((r) => ({ ...r, enabled: enable }))
        void (async () => {
          const qParams = rowsToParams(next)
          suppressSync(JSON.stringify(qParams))
          await commit([
            ...buildPathParams(allPathParams, pathParamValues, nextEnabled),
            ...qParams,
          ])
        })()
        return next
      })
    },
    [
      allPathParams,
      pathParamValues,
      onPathParamEnabledChange,
      setRows,
      suppressSync,
      commit,
    ],
  )

  return { totalParams, allEnabled, selectAll }
}
