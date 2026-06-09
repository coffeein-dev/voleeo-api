import { Glyph } from "@/components/Glyph"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { BoundTemplateFunction } from "@/plugins/types"
import { useUiStore } from "@/store/workspace"
import type { useTemplatePreview } from "./useTemplatePreview"

interface Props {
  fn: BoundTemplateFunction
  preview: ReturnType<typeof useTemplatePreview>
  missingRequired: boolean
  onClose: () => void
}

export function PreviewBlock({ fn, preview, missingRequired, onClose }: Props) {
  const { testResult, testing, copied, previewValue, canCopy } = preview

  if (fn.previewable === false && !fn.previewRender) {
    return (
      <div className="px-4 py-3 border-b border-border">
        <span className="font-sans text-[0.786rem] text-muted/70 italic">
          Value will be asked at run time.
        </span>
      </div>
    )
  }

  if (fn.previewable === false && fn.previewRender && !testResult) {
    return (
      <div className="px-4 py-3 border-b border-border flex items-center gap-1.5">
        {testing && <Spinner className="size-3.5 text-muted" />}
        <span className="font-sans text-[0.786rem] text-muted/70 italic">
          {testing ? "Loading" : "Value will be asked at run time."}
        </span>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 border-b border-border flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={preview.copyPreview}
          disabled={!canCopy}
          title={canCopy ? "Click to copy" : undefined}
          className={cn(
            "flex-1 font-mono text-[0.786rem] bg-bg border border-border rounded-[4px] px-2 py-1.5 min-w-0 truncate text-left outline-none transition-colors flex items-center gap-1.5",
            copied
              ? "text-accent border-accent/40"
              : canCopy
                ? "text-success hover:bg-subtle cursor-pointer"
                : "text-muted/50 cursor-default",
          )}
        >
          {testing && <Spinner className="size-3.5 shrink-0" />}
          <span className="truncate">
            {testing
              ? "Loading"
              : copied
                ? "Copied"
                : canCopy
                  ? previewValue
                  : missingRequired
                    ? "Enter required values to preview"
                    : testResult && !testResult.error
                      ? "(empty)"
                      : "—"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => void preview.runTest()}
          disabled={testing}
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
      {testResult?.error && testResult.value === "encryption_disabled" ? (
        <span className="font-sans text-[0.786rem] text-error leading-snug flex items-center gap-1.5">
          Encryption not enabled.{" "}
          <button
            type="button"
            onClick={() => {
              useUiStore.getState().requestWorkspaceSettings("storage")
              onClose()
            }}
            className="underline underline-offset-2 cursor-pointer bg-transparent border-0 outline-none p-0 text-error hover:opacity-70 transition-opacity font-sans text-[0.786rem] shrink-0"
          >
            Open Storage Settings
          </button>
        </span>
      ) : testResult?.error ? (
        <span className="font-sans text-[0.786rem] text-error leading-snug">
          {testResult.value}
        </span>
      ) : testResult?.hint ? (
        <span className="font-sans text-[0.786rem] text-muted leading-snug">
          {testResult.hint}
        </span>
      ) : null}
    </div>
  )
}
