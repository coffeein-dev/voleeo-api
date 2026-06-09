import { useEffect, useRef, useState } from "react"
import { beginPreview, endPreview } from "@/plugins/promptStore"
import type { BoundTemplateFunction } from "@/plugins/types"

export interface TestResult {
  value: string
  hint?: string
  error?: boolean
}

export function useTemplatePreview(
  fn: BoundTemplateFunction,
  values: Record<string, string>,
  isEncryptionEnabled: boolean,
  enabled: boolean,
) {
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const previewValue = testResult && !testResult.error ? testResult.value : ""
  const canCopy =
    !!testResult && !testResult.error && previewValue !== "" && !testing

  function clear() {
    setTestResult(null)
  }

  async function runTest() {
    if (fn.name === "encrypt" && !isEncryptionEnabled) {
      setTestResult({ value: "encryption_disabled", error: true })
      return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setTesting(true)
    setTestResult(null)

    beginPreview()
    try {
      if (fn.previewRender) {
        const preview = await fn.previewRender(values)
        if (!ac.signal.aborted) {
          setTestResult(
            preview === null
              ? null
              : { value: preview.value, hint: preview.hint },
          )
        }
        return
      }
      const result = await fn.onRender(values)
      if (!ac.signal.aborted) setTestResult({ value: result ?? "(null)" })
    } catch (err) {
      if (!ac.signal.aborted) {
        setTestResult({
          value: err instanceof Error ? err.message : String(err),
          error: true,
        })
      }
    } finally {
      endPreview()
      if (!ac.signal.aborted) setTesting(false)
    }
  }

  // Auto-preview on arg change (debounced). Non-previewable fns still get one
  // shot via `previewRender` (e.g. ask() showing a cached value + TTL).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runTest is non-stable; `values` is the trigger
  useEffect(() => {
    if (!enabled) return
    if (fn.previewable === false && !fn.previewRender) return
    const timer = setTimeout(() => void runTest(), 300)
    return () => clearTimeout(timer)
  }, [values, enabled])

  function copyPreview() {
    if (!canCopy) return
    navigator.clipboard.writeText(previewValue).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return {
    testResult,
    testing,
    copied,
    previewValue,
    canCopy,
    clear,
    runTest,
    copyPreview,
  }
}
