import { useCallback, useEffect, useRef, useState } from "react"
import type { HttpRequest } from "@/store/requests"
import { extractPathParams } from "../paramUtils"

export interface RequestDraft {
  urlDraft: string
  setUrlDraft: (url: string) => void

  pathParamValues: Record<string, string>
  setPathParamValues: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >

  pathParamEnabled: Record<string, boolean>
  setPathParamEnabled: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >

  manualPathParamNames: string[]
  setManualPathParamNames: React.Dispatch<React.SetStateAction<string[]>>
}

export function useRequestDraft(
  activeRequest: HttpRequest | null,
  onRequestSwitched: (nextRequestId: string | null) => void,
): RequestDraft {
  const [urlDraftOverride, setUrlDraftOverride] = useState<{
    url: string
    forId: string
  } | null>(null)

  const currentRequestId = activeRequest?.id ?? ""
  const urlDraft =
    urlDraftOverride?.forId === currentRequestId
      ? urlDraftOverride.url
      : (activeRequest?.url ?? "")

  const setUrlDraft = useCallback(
    (url: string) => setUrlDraftOverride({ url, forId: currentRequestId }),
    [currentRequestId],
  )

  const [pathParamValues, setPathParamValues] = useState<
    Record<string, string>
  >({})
  const [pathParamEnabled, setPathParamEnabled] = useState<
    Record<string, boolean>
  >({})
  const [manualPathParamNames, setManualPathParamNames] = useState<string[]>([])
  const prevActiveIdRef = useRef<string | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: only fires on request switch; `parameters` and `onRequestSwitched` are intentionally read at switch time
  useEffect(() => {
    const id = activeRequest?.id ?? null
    if (id !== prevActiveIdRef.current) {
      prevActiveIdRef.current = id
      // Restore path param values from stored parameters (detected by URL `:name` matching).
      const urlPathNames = new Set(extractPathParams(activeRequest?.url ?? ""))
      const ppValues: Record<string, string> = {}
      const ppEnabled: Record<string, boolean> = {}
      for (const p of activeRequest?.parameters ?? []) {
        if (urlPathNames.has(p.name)) {
          ppValues[p.name] = p.value
          ppEnabled[p.name] = p.enabled
        }
      }
      setPathParamValues(ppValues)
      setPathParamEnabled(ppEnabled)
      setManualPathParamNames([])
      onRequestSwitched(id)
    }
    setUrlDraftOverride(null)
  }, [activeRequest?.id, activeRequest?.url])

  return {
    urlDraft,
    setUrlDraft,
    pathParamValues,
    setPathParamValues,
    pathParamEnabled,
    setPathParamEnabled,
    manualPathParamNames,
    setManualPathParamNames,
  }
}
