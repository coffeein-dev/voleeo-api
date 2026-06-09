import { useEffect, useRef, useState } from "react"
import { ensureResponse } from "@/builtins/response/strategy"
import { Glyph } from "@/components/Glyph"
import { RequestPicker } from "@/components/RequestPicker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { extractBody, extractHeader } from "@/lib/extract"
import { cn } from "@/lib/utils"
import { useUiStore } from "@/store/workspace"
import { commands } from "../../../packages/types/bindings"

type Strategy = "cache" | "refresh-after" | "force"

interface Props {
  fnName: "response.body" | "response.header"
  initialArgs?: Record<string, string>
  onInsert: (args: Record<string, string>) => void
  onClose: () => void
}

export function ResponseFunctionModal({
  fnName,
  initialArgs = {},
  onInsert,
  onClose,
}: Props) {
  const isBody = fnName === "response.body"
  const workspaceId = useUiStore((s) => s.activeWorkspaceId)

  const [requestId, setRequestId] = useState(initialArgs.requestId ?? "")
  const [strategy, setStrategy] = useState<Strategy>(
    (initialArgs.strategy as Strategy) ?? "cache",
  )
  const [ttl, setTtl] = useState(initialArgs.ttl ?? "60")
  const [selector, setSelector] = useState(initialArgs.selector ?? "")
  const [headerName, setHeaderName] = useState(initialArgs.name ?? "")
  const [availableHeaders, setAvailableHeaders] = useState<string[]>([])

  const [testResult, setTestResult] = useState<{
    value: string
    error?: boolean
  } | null>(null)
  const [testing, setTesting] = useState(false)
  const testAbortRef = useRef<AbortController | null>(null)

  // Load available headers when requestId changes (for response.header preview)
  useEffect(() => {
    if (!requestId || !workspaceId || isBody) {
      setAvailableHeaders([])
      return
    }
    let cancelled = false
    ;(async () => {
      const listRes = await commands.responseList(workspaceId, requestId)
      if (cancelled || listRes.status !== "ok" || listRes.data.length === 0)
        return
      const getRes = await commands.responseGet(
        workspaceId,
        requestId,
        listRes.data[0].id,
      )
      if (cancelled || getRes.status !== "ok" || !getRes.data) return
      setAvailableHeaders(
        getRes.data.response.headers.map((h: { name: string }) => h.name),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [requestId, workspaceId, isBody])

  // Auto-preview whenever the relevant fields change (debounced for text inputs).
  // biome-ignore lint/correctness/useExhaustiveDependencies: handleTest and isBody are non-stable; deps are the values that should trigger re-run
  useEffect(() => {
    const previewKey = isBody ? selector : headerName
    const timer = setTimeout(
      () => void handleTest(),
      previewKey !== "" ? 300 : 0,
    )
    return () => clearTimeout(timer)
  }, [requestId, selector, headerName])

  async function handleTest() {
    if (!requestId || !workspaceId) return
    testAbortRef.current?.abort()
    const ac = new AbortController()
    testAbortRef.current = ac
    setTesting(true)
    setTestResult(null)
    try {
      // Preview always uses "cache" — never fires a live request from the modal.
      const stored = await ensureResponse(
        workspaceId,
        requestId,
        "cache",
        Number(ttl) || 60,
      )
      if (ac.signal.aborted) return
      const value = isBody
        ? extractBody(stored.response.body, selector)
        : extractHeader(stored.response.headers, headerName)
      setTestResult({ value: value || "(empty)" })
    } catch (err) {
      if (!ac.signal.aborted)
        setTestResult({
          value: err instanceof Error ? err.message : String(err),
          error: true,
        })
    } finally {
      if (!ac.signal.aborted) setTesting(false)
    }
  }

  function handleInsert() {
    onInsert({
      requestId,
      strategy,
      ...(strategy === "refresh-after" ? { ttl } : {}),
      ...(isBody ? { selector } : { name: headerName }),
    })
  }

  const canInsert = Boolean(requestId) && (isBody ? true : Boolean(headerName))

  return (
    <div
      className="fixed inset-0 z-300 bg-black/50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-[0_12px_48px_rgba(0,0,0,0.6)] w-[460px] max-w-[96vw] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
          <span
            className="font-mono text-[0.714rem] font-bold w-5 h-5 flex items-center justify-center rounded-[4px] shrink-0"
            style={{
              background: "color-mix(in srgb,var(--base0D) 15%,transparent)",
              color: "var(--base0D)",
            }}
          >
            f
          </span>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-mono text-[0.857rem] text-fg font-semibold truncate">
              {fnName}
            </span>
            <span className="font-sans text-[0.786rem] text-muted truncate">
              {isBody
                ? "Use response body of another request"
                : "Use a response header from another request"}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[3px] cursor-pointer hover:bg-subtle bg-transparent border-0 outline-none shrink-0"
          >
            <Glyph kind="x" size={13} color="var(--base04)" />
          </button>
        </div>

        {/* Form */}
        <div className="px-4 py-4 flex flex-col gap-3 border-b border-border">
          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[0.786rem] text-muted font-medium">
              Source request <span className="text-error">*</span>
            </label>
            <RequestPicker
              value={requestId}
              onChange={(id) => {
                setRequestId(id)
                setTestResult(null)
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-sans text-[0.786rem] text-muted font-medium">
              Execution strategy
            </label>
            <Select
              value={strategy}
              onValueChange={(v) => {
                setStrategy(v as Strategy)
                setTestResult(null)
              }}
            >
              <SelectTrigger className="w-full font-mono text-[0.786rem] rounded-[4px] border-border bg-bg text-fg h-auto py-1.5 px-2 focus-visible:ring-0 focus-visible:border-accent/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-mono text-[0.786rem]">
                <SelectItem value="cache">
                  Cache — use stored response
                </SelectItem>
                <SelectItem value="refresh-after">Refresh after TTL</SelectItem>
                <SelectItem value="force">Force — always re-run</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {strategy === "refresh-after" && (
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[0.786rem] text-muted font-medium">
                TTL (seconds)
              </label>
              <input
                type="number"
                min={1}
                value={ttl}
                onChange={(e) => {
                  setTtl(e.target.value)
                  setTestResult(null)
                }}
                className="font-mono text-[0.786rem] bg-bg border border-border rounded-[4px] px-2 py-1.5 text-fg outline-none focus:border-accent/60"
              />
            </div>
          )}

          {isBody ? (
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[0.786rem] text-muted font-medium">
                Selector{" "}
                <span className="font-normal text-muted/60">
                  — empty = full body, $… = JSONPath, /… = XPath
                </span>
              </label>
              <input
                type="text"
                value={selector}
                onChange={(e) => {
                  setSelector(e.target.value)
                  setTestResult(null)
                }}
                placeholder="$.access_token  or  //token/text()"
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-[0.786rem] bg-bg border border-border rounded-[4px] px-2 py-1.5 text-fg outline-none focus:border-accent/60 placeholder:text-muted/40"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="font-sans text-[0.786rem] text-muted font-medium">
                Header name <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={headerName}
                onChange={(e) => {
                  setHeaderName(e.target.value)
                  setTestResult(null)
                }}
                placeholder="content-type"
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-[0.786rem] bg-bg border border-border rounded-[4px] px-2 py-1.5 text-fg outline-none focus:border-accent/60 placeholder:text-muted/40"
              />
              {availableHeaders.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {availableHeaders.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setHeaderName(h)
                        setTestResult(null)
                      }}
                      className="font-mono text-[0.714rem] px-1.5 py-0.5 rounded-[3px] border border-border bg-subtle hover:bg-surface text-muted hover:text-fg cursor-pointer transition-colors"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="px-4 py-3 border-b border-border flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex-1 font-mono text-[0.786rem] bg-bg border border-border rounded-[4px] px-2 py-1.5 min-w-0 truncate select-text",
                testResult && !testResult.error
                  ? "text-success"
                  : "text-muted/50",
              )}
              title={
                testResult && !testResult.error ? testResult.value : undefined
              }
            >
              {testing
                ? "Loading…"
                : testResult && !testResult.error
                  ? testResult.value
                  : "—"}
            </div>
            <button
              type="button"
              onClick={() => void handleTest()}
              disabled={testing || !requestId}
              title="Re-run preview"
              className="p-1.5 rounded-[4px] text-fg border border-border bg-transparent hover:bg-subtle disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed outline-none transition-colors shrink-0"
            >
              <Glyph
                kind="refresh"
                size={13}
                color={testing ? "var(--base04)" : "var(--base05)"}
              />
            </button>
          </div>
          {testResult?.error && (
            <span className="font-sans text-[0.786rem] text-error leading-snug">
              {testResult.value}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-[5px] font-sans text-[0.857rem] text-muted border border-border bg-transparent hover:bg-subtle cursor-pointer outline-none transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleInsert}
            disabled={!canInsert}
            className="px-3 py-1.5 rounded-[5px] font-sans text-[0.857rem] font-medium border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed outline-none transition-colors"
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  )
}
