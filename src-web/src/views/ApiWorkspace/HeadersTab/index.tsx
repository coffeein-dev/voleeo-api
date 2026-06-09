import type { RefObject } from "react"
import { useCallback, useEffect, useMemo } from "react"
import type { ConstantSuggestion } from "@/components/TemplateInput/autocompleteItems"
import type { RequestParameter } from "@/store/requests"
import { useUiStore } from "@/store/workspace"
import { DropLine } from "../DropLine"
import { rowsToParams } from "../paramUtils"
import { SelectAllToggle } from "../SelectAllToggle"
import { useMakeEncryptInsertHandler } from "../useMakeEncryptInsertHandler"
import { useParamDrag } from "../useParamDrag"
import { HeaderRow } from "./HeaderRow"
import { getHeaderValues, HEADER_NAME_SUGGESTIONS } from "./headerSuggestions"
import { type InheritedHeader, InheritedHeaders } from "./InheritedHeaders"
import { useHeaderRows } from "./useHeaderRows"

interface Props {
  /** Owning entity — a request or a folder. */
  sourceId: string
  headers: RequestParameter[]
  onCommit: (headers: RequestParameter[]) => Promise<void>
  /** Lets the parent pane flush pending edits before sending or switching. */
  commitRef: RefObject<() => Promise<void>>
  onVarClick?: (varName: string) => void
  inherited?: InheritedHeader[]
  onInheritedNavigate?: (header: InheritedHeader) => void
  /** Header name whose value input to focus on mount. */
  focusKey?: string
}

export function HeadersTab({
  sourceId,
  headers,
  onCommit,
  commitRef,
  onVarClick,
  inherited,
  onInheritedNavigate,
  focusKey,
}: Props) {
  const workspaceId = useUiStore((s) => s.activeWorkspaceId)

  const {
    rows,
    setRows,
    headerValueInputRefs,
    headerKeyInputRefs,
    updateRow,
    toggleRow,
    selectAll,
    removeRow,
    suppressSync,
    commitRowsRef,
  } = useHeaderRows({ sourceId, headers })

  const namedRows = rows.filter((r) => r.key.trim() !== "")
  const allEnabled = namedRows.length > 0 && namedRows.every((r) => r.enabled)

  // Active inherited names (to override) rank ahead of common headers, deduped.
  const keyConstantItems = useMemo<ConstantSuggestion[]>(() => {
    const inheritedItems = (inherited ?? [])
      .filter((h) => !h.overridden)
      .map((h) => ({
        value: h.name,
        badge: "hd",
        description: `Inherited · ${h.source}`,
      }))
    const seen = new Set(inheritedItems.map((i) => i.value.toLowerCase()))
    return [
      ...inheritedItems,
      ...HEADER_NAME_SUGGESTIONS.filter(
        (c) => !seen.has(c.value.toLowerCase()),
      ),
    ]
  }, [inherited])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rows/refs read at fire time, keyed on focusKey
  useEffect(() => {
    if (!focusKey) return
    const row = rows.find((r) => r.key === focusKey)
    if (!row) return
    const t = setTimeout(() => {
      headerValueInputRefs.current.get(row._id)?.focus()
    }, 0)
    return () => clearTimeout(t)
  }, [focusKey])

  // Reassign each render so async callbacks close over the latest state.
  commitRowsRef.current = async (next) => {
    if (!workspaceId) return
    const hdrs = rowsToParams(next)
    suppressSync(JSON.stringify(hdrs))
    await onCommit(hdrs)
  }

  commitRef.current = async () => {
    await commitRowsRef.current(rows)
  }

  const makeEncryptInsertHandler = useMakeEncryptInsertHandler(workspaceId)

  const { draggingKey, dropTarget, startDrag } = useParamDrag(
    (_section, from, to) => {
      setRows((prev) => {
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        void commitRowsRef.current(next)
        return next
      })
    },
  )

  const handleSelectHeader = useCallback(
    (rowId: number) => () => {
      setTimeout(() => {
        headerValueInputRefs.current.get(rowId)?.focus()
      }, 0)
    },
    [headerValueInputRefs],
  )

  const colStyle = { gridTemplateColumns: "16px 8px 1fr 1fr 24px" }

  return (
    <div className="px-3.5 py-3 flex flex-col">
      {inherited && (
        <InheritedHeaders
          headers={inherited}
          onNavigate={onInheritedNavigate}
        />
      )}
      {rows.map((row, rowIndex) => {
        const isTrailing =
          rowIndex === rows.length - 1 && row.key === "" && row.value === ""
        return (
          <div
            key={row._id}
            {...(!isTrailing && {
              "data-param-section": "header",
              "data-param-index": rowIndex,
            })}
          >
            {dropTarget?.index === rowIndex && <DropLine />}
            <HeaderRow
              row={row}
              isTrailing={isTrailing}
              isDragging={draggingKey === `header:${rowIndex}`}
              colStyle={colStyle}
              onKeyChange={(val) => updateRow(row._id, "key", val)}
              onValueChange={(val) => updateRow(row._id, "value", val)}
              onToggle={() => toggleRow(row._id)}
              onRemove={() => removeRow(row._id)}
              onDragStart={(e) => startDrag(e, "header", rowIndex)}
              onVarClick={onVarClick}
              onEncryptInsert={makeEncryptInsertHandler((val) =>
                updateRow(row._id, "value", val),
              )}
              valueSuggestions={getHeaderValues(row.key)}
              keyConstantItems={keyConstantItems}
              onSelectHeader={handleSelectHeader(row._id)}
              valueInputRef={(el) => {
                if (el) headerValueInputRefs.current.set(row._id, el)
                else headerValueInputRefs.current.delete(row._id)
              }}
              keyInputRef={(el) => {
                if (el) headerKeyInputRefs.current.set(row._id, el)
                else headerKeyInputRefs.current.delete(row._id)
              }}
            />
          </div>
        )
      })}
      {dropTarget?.index === rows.length && <DropLine />}

      {namedRows.length > 0 && (
        <SelectAllToggle allEnabled={allEnabled} onChange={selectAll} />
      )}
    </div>
  )
}
