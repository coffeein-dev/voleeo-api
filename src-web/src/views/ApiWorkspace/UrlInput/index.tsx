import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { EnableEncryptionDialog } from "@/components/EnableEncryptionDialog"
import { TemplateFunctionModal } from "@/components/TemplateFunctionModal"
import { useTemplateInputData } from "@/components/TemplateInput/useTemplateInputData"
import {
  attachAtomSnapListener,
  ensureTrailingTextNode,
  getAnchorOffset,
  getCaretOffset,
  getChipRanges,
  getFocusOffset,
  setCaretOffset,
  setSelectionExtended,
} from "@/lib/caret"
import type { CommandImportResult } from "@/lib/commandImport"
import { cn } from "@/lib/utils"
import { toHtml } from "./urlTokenizer"
import { Autocomplete, useUrlAutocomplete } from "./useUrlAutocomplete"
import { useUrlFuncModal } from "./useUrlFuncModal"
import { useUrlInputHandlers } from "./useUrlInputHandlers"

interface Props {
  value: string
  disabled: boolean
  onChange: (v: string) => void
  onCommit: () => void
  onSend: () => void
  onParamClick?: (paramName: string) => void
  onVarClick?: (varName: string) => void
  /** Called when the user types or pastes a `?` — carries the extracted params. */
  onQueryParams?: (params: Array<{ key: string; value: string }>) => void
  /** Called when the user pastes a curl/httpie command into an empty URL bar. */
  onImportCommand?: (result: CommandImportResult) => void
  onFocus?: () => void
  onBlur?: () => void
}

export function UrlInput({
  value,
  disabled,
  onChange,
  onCommit,
  onSend,
  onParamClick,
  onVarClick,
  onQueryParams,
  onImportCommand,
  onFocus,
  onBlur,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null)
  const skipSyncRef = useRef(false)
  // Tracks an active pointer drag so the atom-snap listener knows to prefer
  // snapping before a chip (enabling right-drag to include the chip).
  const isDragging = useRef(false)
  // Tracks the mousedown position so handleClick can detect drag vs. pure click.
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  const {
    activeVars,
    fns,
    isEncryptionEnabled,
    activeWorkspaceId,
    varStatus,
    funcStatus,
  } = useTemplateInputData()

  const buildHtml = useCallback(
    (text: string) => toHtml(text, varStatus, funcStatus),
    [varStatus, funcStatus],
  )

  const {
    acOpen,
    acItems,
    acIdx,
    acNsFilter,
    acQuery,
    anchorRect,
    setAcIdx,
    openAutocomplete,
    closeAutocomplete,
    insertUrlToken,
    selectUrlItem,
  } = useUrlAutocomplete({
    divRef,
    activeVars,
    fns,
    buildHtml,
    skipSyncRef,
    onChange,
    // biome-ignore lint/correctness/useExhaustiveDependencies: setShowEncryptionDialog and setFuncModal are useState setters — always stable
    onFuncSelect: useCallback(
      (fn) => {
        if (fn.name === "encrypt" && !isEncryptionEnabled) {
          setShowEncryptionDialog(true)
        } else {
          setFuncModal({ fnName: fn.name, initialArgs: {}, oldToken: "" })
        }
      },
      [isEncryptionEnabled],
    ),
  })

  const {
    funcModal,
    setFuncModal,
    showEncryptionDialog,
    setShowEncryptionDialog,
    handleChipClick,
    handleFuncModalInsert,
  } = useUrlFuncModal({
    divRef,
    skipSyncRef,
    buildHtml,
    onChange,
    activeWorkspaceId,
    insertUrlToken,
  })

  const {
    handleInput,
    handleBeforeInput,
    handleCopy,
    handleCut,
    handlePaste,
    handleKeyDown,
  } = useUrlInputHandlers({
    buildHtml,
    skipSyncRef,
    onChange,
    onSend,
    onQueryParams,
    onImportCommand,
    acOpen,
    acItems,
    acIdx,
    acNsFilter,
    setAcIdx,
    openAutocomplete,
    closeAutocomplete,
    selectUrlItem,
  })

  // Atom-snap listener (treats chips as single characters for selection).
  // Native mousedown/mouseup listeners set isDragging before selectionchange
  // fires so the snap can prefer "before chip" during a drag.
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    const onDown = () => {
      isDragging.current = true
    }
    const onUp = () => {
      isDragging.current = false
    }
    el.addEventListener("mousedown", onDown)
    document.addEventListener("mouseup", onUp)
    const cleanup = attachAtomSnapListener(el, { isDragging })
    return () => {
      el.removeEventListener("mousedown", onDown)
      document.removeEventListener("mouseup", onUp)
      cleanup()
    }
  }, [])

  // Sync innerHTML from the value prop (skipped on internal edits via skipSyncRef).
  useLayoutEffect(() => {
    const el = divRef.current
    if (!el) return
    if (skipSyncRef.current) {
      skipSyncRef.current = false
      return
    }
    const html = buildHtml(value)
    if (el.innerHTML !== html) {
      if (document.activeElement === el) {
        const caret = getCaretOffset(el)
        el.innerHTML = html
        ensureTrailingTextNode(el)
        setCaretOffset(el, caret)
      } else {
        el.innerHTML = html
        ensureTrailingTextNode(el)
      }
    } else {
      ensureTrailingTextNode(el)
    }
  }, [value, buildHtml])

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }

  // Snap a drag-selection to whole chip boundaries (mirrors CodeMirror atomicRanges).
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!(e.buttons & 1) || !divRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const el = divRef.current
    const anchor = getAnchorOffset(el)
    const focus = getFocusOffset(el)
    const chips = getChipRanges(el)
    for (const chip of chips) {
      // Focus is inside chip while dragging rightward — snap past it.
      if (anchor <= chip.start && focus > chip.start && focus < chip.end) {
        setSelectionExtended(el, anchor, chip.end)
        return
      }
      // Focus is inside chip while dragging leftward — snap before it.
      if (anchor >= chip.end && focus > chip.start && focus < chip.end) {
        setSelectionExtended(el, anchor, chip.start)
        return
      }
    }
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.tagName !== "SPAN") return
    // If the mouse moved more than 4 px between mousedown and click, the user
    // was drag-selecting — preserve the selection and don't open any modal.
    const down = mouseDownPos.current
    if (down) {
      const dx = e.clientX - down.x
      const dy = e.clientY - down.y
      if (dx * dx + dy * dy > 16) return
    }
    if (target.dataset.param === "true") {
      const name = (target.textContent ?? "").replace(/^:/, "")
      if (name) onParamClick?.(name)
      return
    }
    if (target.dataset.tpl === "var") {
      const varName = target.dataset.var
      if (varName) onVarClick?.(varName)
      return
    }
    if (target.dataset.tpl === "func") handleChipClick(target)
  }

  return (
    <>
      <div
        ref={divRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onBeforeInput={handleBeforeInput}
        onInput={handleInput}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onFocus={onFocus}
        onBlur={() => {
          onCommit()
          onBlur?.()
        }}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        data-placeholder={disabled ? "Select a request" : "https://..."}
        style={{ fontSize: "0.786rem" }}
        className={cn(
          "ce-placeholder editor-font flex-1 min-w-0 px-2.5 py-[6px] text-fg outline-none leading-[1.5] whitespace-nowrap overflow-hidden",
          disabled && "opacity-40 cursor-not-allowed pointer-events-none",
        )}
      />

      {acOpen &&
        anchorRect &&
        acItems.length > 0 &&
        createPortal(
          <Autocomplete
            items={acItems}
            selectedIndex={acIdx}
            anchorRect={anchorRect}
            query={acQuery}
            onSelect={selectUrlItem}
            onClose={closeAutocomplete}
          />,
          document.body,
        )}

      {showEncryptionDialog &&
        activeWorkspaceId &&
        createPortal(
          <EnableEncryptionDialog
            workspaceId={activeWorkspaceId}
            onEnabled={() => setShowEncryptionDialog(false)}
            onCancel={() => setShowEncryptionDialog(false)}
          />,
          document.body,
        )}

      {funcModal &&
        createPortal(
          <TemplateFunctionModal
            fn={
              fns.find((f) => f.name === funcModal.fnName) ??
              ({ name: funcModal.fnName, onRender: () => "" } as never)
            }
            initialArgs={funcModal.initialArgs}
            onInsert={handleFuncModalInsert}
            onClose={() => setFuncModal(null)}
          />,
          document.body,
        )}
    </>
  )
}
