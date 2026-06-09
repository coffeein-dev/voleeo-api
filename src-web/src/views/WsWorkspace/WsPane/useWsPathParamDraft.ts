import { useState } from "react"
import type { WsConnection } from "@/store/requests"
import { extractPathParams } from "@/views/ApiWorkspace/paramUtils"

/** WS counterpart of `useRequestDraft`'s path-param slice — seeded from the
 *  connection's persisted `parameters`, filtered by `:name` in the URL. */
export function useWsPathParamDraft(connection: WsConnection | null) {
  const [pathParamValues, setPathParamValues] = useState<
    Record<string, string>
  >(() => {
    if (!connection) return {}
    const urlNames = new Set(extractPathParams(connection.url))
    const v: Record<string, string> = {}
    for (const p of connection.parameters ?? []) {
      if (urlNames.has(p.name)) v[p.name] = p.value
    }
    return v
  })
  const [pathParamEnabled, setPathParamEnabled] = useState<
    Record<string, boolean>
  >(() => {
    if (!connection) return {}
    const urlNames = new Set(extractPathParams(connection.url))
    const e: Record<string, boolean> = {}
    for (const p of connection.parameters ?? []) {
      if (urlNames.has(p.name)) e[p.name] = p.enabled
    }
    return e
  })
  const [manualPathParamNames, setManualPathParamNames] = useState<string[]>([])
  const [paramCounts, setParamCounts] = useState<{
    enabled: number
    total: number
  } | null>(null)

  return {
    pathParamValues,
    setPathParamValues,
    pathParamEnabled,
    setPathParamEnabled,
    manualPathParamNames,
    setManualPathParamNames,
    paramCounts,
    setParamCounts,
  }
}
