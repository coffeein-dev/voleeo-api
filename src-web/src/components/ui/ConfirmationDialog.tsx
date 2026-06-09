import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { Glyph } from "@/components/Glyph"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

export interface ConfirmationDialogProps {
  title: string
  icon?: "warning" | "x"
  description: ReactNode
  infoBox?: ReactNode
  warningText?: string
  confirmByTyping?: string
  confirmByTypingLabel?: ReactNode
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: "destructive" | "default"
  confirmDisabled?: boolean
  isLoading?: boolean
  loadingLabel?: string
  error?: string | null
}

export function ConfirmationDialog({
  title,
  icon = "warning",
  description,
  infoBox,
  warningText,
  confirmByTyping,
  confirmByTypingLabel,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "default",
  confirmDisabled = false,
  isLoading = false,
  loadingLabel,
  error,
}: ConfirmationDialogProps) {
  const [typedValue, setTypedValue] = useState("")

  const typingConfirmed =
    confirmByTyping == null || typedValue === confirmByTyping
  const isDisabled = isLoading || confirmDisabled || !typingConfirmed

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault()
        onCancel()
      } else if (e.key === "Enter" && !isDisabled) {
        e.preventDefault()
        onConfirm()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isDisabled, onConfirm, onCancel])

  const confirmBtnClass =
    confirmVariant === "destructive"
      ? "cursor-pointer bg-error text-bg border-transparent hover:bg-error/85 gap-1.5"
      : "cursor-pointer gap-1.5"

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center"
      onClick={onCancel}
    >
      <div
        className="font-sans bg-surface border border-border rounded-[8px] shadow-[0_16px_48px_rgba(0,0,0,0.7)] w-[480px] max-w-[94vw] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-2.5 border-b border-border">
          <Glyph kind={icon} size={18} color="var(--base08)" />
          <span className="flex-1 font-sans text-[1.071rem] font-semibold text-fg">
            {title}
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-[4px] cursor-pointer hover:bg-subtle bg-transparent border-0 outline-none"
          >
            <Glyph kind="x" size={13} color="var(--base04)" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4">
          <p className="font-sans text-[0.929rem] text-fg leading-relaxed">
            {description}
          </p>

          {infoBox && (
            <div className="border border-border rounded-[5px] px-4 py-3 flex flex-col gap-1 bg-bg">
              {infoBox}
            </div>
          )}

          {warningText && (
            <p className="font-sans text-[0.857rem] text-warn leading-relaxed">
              {warningText}
            </p>
          )}

          {confirmByTyping != null && (
            <div className="flex flex-col gap-2">
              {confirmByTypingLabel && (
                <label className="font-sans text-[0.857rem] text-fg">
                  {confirmByTypingLabel}
                </label>
              )}
              <input
                autoFocus
                autoComplete="off"
                spellCheck={false}
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                placeholder={confirmByTyping}
                className="px-3 py-2 border border-border rounded-[5px] bg-bg text-[0.857rem] text-fg outline-none select-text placeholder:text-muted focus:border-accent transition-colors"
              />
            </div>
          )}

          {error && (
            <div className="text-[0.786rem] text-error border border-error/50 rounded-[3px] px-2.5 py-1.5">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="cursor-pointer border-border text-fg bg-transparent hover:bg-subtle hover:text-fg"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDisabled}
            className={confirmBtnClass}
          >
            {isLoading && <Spinner className="size-3.5 shrink-0" />}
            {isLoading && loadingLabel ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
