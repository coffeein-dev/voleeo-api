import type React from "react"
import { Glyph } from "@/components/Glyph"
import { TemplateInput } from "@/components/TemplateInput"
import type { ConstantSuggestion } from "@/components/TemplateInput/Autocomplete"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface ParamRowProps {
  name: string
  value: string
  enabled: boolean
  isTrailing: boolean
  isDragging: boolean
  colStyle: React.CSSProperties
  onNameChange: (val: string) => void
  onValueChange: (val: string) => void
  onToggle: () => void
  onRemove: () => void
  onDragStart: (e: React.PointerEvent) => void
  onVarClick?: (varName: string) => void
  /** Called instead of inserting an encrypt() chip — parent pre-encrypts and stores ciphertext. */
  onEncryptInsert?: (plaintext: string) => void
  /** Forwarded to the value TemplateInput so the parent can focus it. */
  valueInputRef?: React.Ref<HTMLDivElement>
  /** Forwarded to the key input so the parent can focus it. */
  keyInputRef?: React.Ref<HTMLInputElement>
  namePlaceholder?: string
  /**
   * Optional warning tooltip shown beneath the key input.
   * Pass a string to show the tooltip, null/undefined to hide it.
   */
  keyWarning?: string | null
  /**
   * Optional warning tooltip shown beneath the value input.
   * Pass a string to show the tooltip, null/undefined to hide it.
   */
  valueWarning?: string | null
  keyClassName?: string
  valueClassName?: string
  /**
   * When provided, replaces the default plain `<input>` in the key cell.
   * The slot is responsible for its own ref and onChange wiring.
   */
  nameInputSlot?: React.ReactNode
  /**
   * Predefined literal value suggestions forwarded to the value TemplateInput.
   * Shown at the top of the autocomplete dropdown in non-template context.
   */
  constantItems?: ConstantSuggestion[]
}

export function ParamRow({
  name,
  value,
  enabled,
  isTrailing,
  isDragging,
  colStyle,
  onNameChange,
  onValueChange,
  onToggle,
  onRemove,
  onDragStart,
  onVarClick,
  onEncryptInsert,
  valueInputRef,
  keyInputRef,
  namePlaceholder = "name",
  keyWarning,
  valueWarning,
  keyClassName,
  valueClassName,
  nameInputSlot,
  constantItems,
}: ParamRowProps) {
  return (
    <div
      className={cn(
        "group/row grid gap-x-1 py-[3px] items-center border-b border-border/40 transition-opacity",
        isDragging && "opacity-40",
      )}
      style={colStyle}
    >
      {/* Checkbox — hidden for the untouched trailing row */}
      {isTrailing ? (
        <span />
      ) : (
        <Checkbox checked={enabled} onCheckedChange={onToggle} />
      )}

      {/* Drag handle — hover-only, absent on trailing row */}
      {isTrailing ? (
        <span />
      ) : (
        <div
          className="flex items-center justify-center opacity-0 group-hover/row:opacity-100 cursor-grab active:cursor-grabbing transition-opacity touch-none -mx-1"
          onPointerDown={onDragStart}
        >
          <Glyph kind="drag-handle" size={12} color="var(--base04)" />
        </div>
      )}

      {/* Key / name cell — accepts a custom slot or falls back to plain input */}
      <div className="relative group/paramkey">
        {nameInputSlot ?? (
          <input
            ref={keyInputRef}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder={namePlaceholder}
            className={cn(
              "w-full font-mono text-[0.786rem] bg-transparent outline-none px-1 py-0.5 select-text placeholder:text-muted/40 transition-opacity",
              !isTrailing && !enabled && "opacity-40",
              keyClassName,
            )}
          />
        )}
        {keyWarning && (
          <div className="absolute top-full left-1 z-10 mt-0.5 rounded-[3px] border border-warn/30 bg-bg px-1.5 py-[2px] font-mono text-[0.643rem] text-warn shadow-sm pointer-events-none whitespace-nowrap hidden group-hover/paramkey:block">
            {keyWarning}
          </div>
        )}
      </div>

      {/* Value cell — optional warning tooltip */}
      <div className="relative group/paramval">
        <TemplateInput
          ref={valueInputRef}
          value={value}
          onChange={onValueChange}
          onVarClick={onVarClick}
          onEncryptInsert={onEncryptInsert}
          placeholder="value"
          constantItems={constantItems}
          className={cn(
            "w-full px-1 py-0.5",
            !isTrailing && !enabled && "opacity-40",
            valueClassName,
          )}
        />
        {valueWarning && (
          <div className="absolute top-full left-1 z-10 mt-0.5 rounded-[3px] border border-warn/30 bg-bg px-1.5 py-[2px] font-mono text-[0.643rem] text-warn shadow-sm pointer-events-none whitespace-nowrap hidden group-hover/paramval:block">
            {valueWarning}
          </div>
        )}
      </div>

      {/* Trash — invisible on the pristine trailing row, hover-only on all others */}
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-[3px] border-0 outline-none cursor-pointer bg-transparent hover:bg-error/10 transition-opacity",
          isTrailing
            ? "invisible pointer-events-none"
            : "opacity-0 group-hover/row:opacity-100",
        )}
      >
        <Glyph kind="trash" size={11} color="var(--base08)" />
      </button>
    </div>
  )
}
