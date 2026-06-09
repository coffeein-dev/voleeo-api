import type React from "react"
import { TemplateInput } from "@/components/TemplateInput"
import { cn } from "@/lib/utils"
import { ParamRow } from "../ParamRow"
import type { QueryRow } from "../paramUtils"
import { needsEscaping } from "../paramUtils"

export interface QueryParamRowProps {
  row: QueryRow
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
  keyInputRef?: React.Ref<HTMLDivElement>
}

const RFC_WARNING = "contains characters that need percent-encoding (RFC 3986)"

export function QueryParamRow({
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
}: QueryParamRowProps) {
  const nameInputSlot = (
    <TemplateInput
      ref={keyInputRef}
      value={row.key}
      onChange={onKeyChange}
      onVarClick={onVarClick}
      placeholder="param_name"
      disabled={!isTrailing && !row.enabled}
      className={cn(
        "w-full px-1 py-0.5",
        !isTrailing && !row.enabled && "opacity-40",
        needsEscaping(row.key) && "text-warn",
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
      nameInputSlot={nameInputSlot}
      keyWarning={needsEscaping(row.key) ? RFC_WARNING : null}
      valueWarning={needsEscaping(row.value) ? RFC_WARNING : null}
      valueClassName={needsEscaping(row.value) ? "text-warn" : undefined}
    />
  )
}
