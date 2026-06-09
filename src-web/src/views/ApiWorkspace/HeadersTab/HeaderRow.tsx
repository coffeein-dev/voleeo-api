import type React from "react"
import { TemplateInput } from "@/components/TemplateInput"
import type { ConstantSuggestion } from "@/components/TemplateInput/Autocomplete"
import { cn } from "@/lib/utils"
import { ParamRow } from "../ParamRow"
import type { ParamRow as HeaderRowData } from "../paramUtils"
import { HEADER_NAME_SUGGESTIONS } from "./headerSuggestions"

export interface HeaderRowProps {
  row: HeaderRowData
  isTrailing: boolean
  isDragging: boolean
  colStyle: React.CSSProperties
  onKeyChange: (val: string) => void
  onValueChange: (val: string) => void
  onToggle: () => void
  onRemove: () => void
  onDragStart: (e: React.PointerEvent) => void
  onVarClick?: (varName: string) => void
  onEncryptInsert?: (plaintext: string) => void
  valueInputRef?: React.Ref<HTMLDivElement>
  /** Ref to the key TemplateInput div (used by parent to focus programmatically). */
  keyInputRef?: React.Ref<HTMLDivElement>
  /** Predefined value suggestions for the selected header (e.g. media types for Content-Type). */
  valueSuggestions?: ConstantSuggestion[]
  /** Key-field name suggestions. Defaults to the common headers. */
  keyConstantItems?: ConstantSuggestion[]
  /** Called after a header name constant is picked from the key dropdown. */
  onSelectHeader?: () => void
}

export function HeaderRow({
  row,
  isTrailing,
  isDragging,
  colStyle,
  onKeyChange,
  onValueChange,
  onToggle,
  onRemove,
  onDragStart,
  onVarClick,
  onEncryptInsert,
  valueInputRef,
  keyInputRef,
  valueSuggestions,
  keyConstantItems,
  onSelectHeader,
}: HeaderRowProps) {
  // Fall back to the common headers when the parent supplies none.
  const keyItems = keyConstantItems ?? HEADER_NAME_SUGGESTIONS

  const nameInputSlot = (
    <TemplateInput
      ref={keyInputRef}
      value={row.key}
      onChange={onKeyChange}
      onVarClick={onVarClick}
      constantItems={keyItems}
      onConstantSelect={onSelectHeader}
      placeholder="Header-Name"
      disabled={!isTrailing && !row.enabled}
      className={cn(
        "w-full px-1 py-0.5",
        !isTrailing && !row.enabled && "opacity-40",
      )}
    />
  )

  return (
    <ParamRow
      name={row.key}
      value={row.value}
      enabled={row.enabled}
      isTrailing={isTrailing}
      isDragging={isDragging}
      colStyle={colStyle}
      onNameChange={onKeyChange}
      onValueChange={onValueChange}
      onToggle={onToggle}
      onRemove={onRemove}
      onDragStart={onDragStart}
      onVarClick={onVarClick}
      onEncryptInsert={onEncryptInsert}
      valueInputRef={valueInputRef}
      namePlaceholder="Header-Name"
      nameInputSlot={nameInputSlot}
      constantItems={valueSuggestions}
    />
  )
}
