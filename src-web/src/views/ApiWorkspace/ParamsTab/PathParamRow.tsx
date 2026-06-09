import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Glyph } from "@/components/Glyph"
import { TemplateInput } from "@/components/TemplateInput"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { isValidParamName, needsEscaping } from "../paramUtils"

export interface PathParamRowProps {
  name: string
  value: string
  enabled: boolean
  existingNames: string[]
  colStyle: React.CSSProperties
  isDragging?: boolean
  onToggle: () => void
  onValueChange: (val: string) => void
  onRename: (oldName: string, newName: string) => void
  onRemove: () => void
  valueInputRef: (el: HTMLDivElement | null) => void
  onDragHandlePointerDown: (e: React.PointerEvent) => void
  shouldFocusKey?: boolean
  onKeyFocused?: () => void
  onVarClick?: (varName: string) => void
  /** Called instead of inserting an encrypt() chip — parent pre-encrypts and stores ciphertext. */
  onEncryptInsert?: (plaintext: string) => void
}

export function PathParamRow({
  name,
  value,
  enabled,
  existingNames,
  colStyle,
  isDragging,
  onToggle,
  onValueChange,
  onRename,
  onRemove,
  valueInputRef,
  onDragHandlePointerDown,
  shouldFocusKey,
  onKeyFocused,
  onVarClick,
  onEncryptInsert,
}: PathParamRowProps) {
  const keyInputRef = useRef<HTMLInputElement>(null)
  const [keyDraft, setKeyDraft] = useState(`:${name}`)

  // Keep draft in sync when the name changes from outside (e.g. URL sync)
  useEffect(() => {
    setKeyDraft(`:${name}`)
  }, [name])

  // Auto-focus when requested (e.g. freshly converted from a query row)
  // biome-ignore lint/correctness/useExhaustiveDependencies: onKeyFocused clears state on every render; including it would re-fire the effect unnecessarily
  useEffect(() => {
    if (shouldFocusKey && keyInputRef.current) {
      keyInputRef.current.focus()
      onKeyFocused?.()
    }
  }, [shouldFocusKey])

  const currentName = keyDraft.replace(/^:+/, "").replace(/\s/g, "")
  const isDuplicate =
    currentName.length > 0 && existingNames.includes(currentName)
  const isInvalidName = currentName.length > 0 && !isValidParamName(currentName)

  function handleKeyChange(raw: string) {
    setKeyDraft(raw)
    const newName = raw.replace(/^:+/, "").replace(/\s/g, "")
    if (newName && newName !== name && isValidParamName(newName)) {
      onRename(name, newName)
    }
  }

  return (
    <div
      className={cn(
        "group/row grid gap-x-1 py-[3px] items-center border-b border-border/40 transition-opacity",
        isDragging && "opacity-40",
      )}
      style={colStyle}
    >
      <Checkbox checked={enabled} onCheckedChange={onToggle} />

      <div
        className="flex items-center justify-center opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing transition-opacity touch-none -mx-1"
        onPointerDown={onDragHandlePointerDown}
      >
        <Glyph kind="drag-handle" size={12} color="var(--base04)" />
      </div>

      {/* Key — group/key scopes the hover tooltip */}
      <div className={cn("relative group/key", !enabled && "opacity-40")}>
        <input
          ref={keyInputRef}
          value={keyDraft}
          onChange={(e) => handleKeyChange(e.target.value)}
          onBlur={() => {
            const n = keyDraft.replace(/^:+/, "").replace(/\s/g, "")
            if (!n) onRemove()
          }}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            "w-full font-mono text-[0.786rem] bg-transparent outline-none px-1 py-0.5 select-text",
            isDuplicate
              ? "text-error"
              : isInvalidName
                ? "text-warn"
                : "text-accent",
          )}
        />
        {isDuplicate && (
          <div className="absolute top-full left-1 z-10 mt-0.5 rounded-[3px] border border-error/30 bg-bg px-1.5 py-[2px] font-mono text-[0.643rem] text-error shadow-sm pointer-events-none whitespace-nowrap hidden group-hover/key:block">
            already exists
          </div>
        )}
        {isInvalidName && !isDuplicate && (
          <div className="absolute top-full left-1 z-10 mt-0.5 rounded-[3px] border border-warn/30 bg-bg px-1.5 py-[2px] font-mono text-[0.643rem] text-warn shadow-sm pointer-events-none whitespace-nowrap hidden group-hover/key:block">
            only letters, digits and _ allowed
          </div>
        )}
      </div>

      <div className="relative group/val">
        <TemplateInput
          ref={valueInputRef}
          value={value}
          onChange={onValueChange}
          onVarClick={onVarClick}
          onEncryptInsert={onEncryptInsert}
          placeholder="value"
          className={cn(
            "w-full px-1 py-0.5",
            !enabled && "opacity-40",
            needsEscaping(value) ? "text-warn" : undefined,
          )}
        />
        {needsEscaping(value) && (
          <div className="absolute top-full left-1 z-10 mt-0.5 rounded-[3px] border border-warn/30 bg-bg px-1.5 py-[2px] font-mono text-[0.643rem] text-warn shadow-sm pointer-events-none whitespace-nowrap hidden group-hover/val:block">
            contains characters that need percent-encoding (RFC 3986)
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="flex items-center justify-center w-6 h-6 rounded-[3px] border-0 outline-none cursor-pointer bg-transparent opacity-0 group-hover/row:opacity-100 hover:bg-error/10 transition-opacity"
      >
        <Glyph kind="trash" size={11} color="var(--base08)" />
      </button>
    </div>
  )
}
