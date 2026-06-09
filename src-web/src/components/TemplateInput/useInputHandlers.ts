import type React from "react"
import type { RefObject } from "react"
import { useRef } from "react"
import {
  displayToStoredOffset,
  ensureTrailingTextNode,
  extractStoredValue,
  getAnchorOffset,
  getCaretOffset,
  getChipRanges,
  getFocusOffset,
  setCaretOffset,
  setSelectionExtended,
} from "@/lib/caret"
import type { AutocompleteItem } from "./Autocomplete"

interface UseInputHandlersOptions {
  buildHtml: (text: string) => string
  skipSyncRef: RefObject<boolean>
  onChange: (v: string) => void
  onCommit?: () => void
  onVarClick?: (varName: string) => void
  multiline?: boolean
  acOpen: boolean
  acItems: AutocompleteItem[]
  acIdx: number
  acNsFilter: string | null
  setAcIdx: React.Dispatch<React.SetStateAction<number>>
  openAutocomplete: (
    query: string,
    partialStart: number,
    nsFilter?: string | null,
    isTemplate?: boolean,
  ) => void
  closeAutocomplete: () => void
  getPartialExpr: (
    el: HTMLElement,
  ) => { query: string; startOffset: number; isTemplate: boolean } | null
  selectItem: (item: AutocompleteItem) => void
  handleChipClick: (target: HTMLElement) => void
}

export function useInputHandlers({
  buildHtml,
  skipSyncRef,
  onChange,
  onCommit,
  onVarClick,
  multiline,
  acOpen,
  acItems,
  acIdx,
  acNsFilter,
  setAcIdx,
  openAutocomplete,
  closeAutocomplete,
  getPartialExpr,
  selectItem,
  handleChipClick,
}: UseInputHandlersOptions) {
  // Tracks mousedown position to distinguish a drag-select from a pure click.
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)
  const undoStack = useRef<Array<{ value: string; caret: number }>>([])
  const redoStack = useRef<Array<{ value: string; caret: number }>>([])

  function pushUndo(el: HTMLElement) {
    const value = extractStoredValue(el, { multiline })
    const caret = getCaretOffset(el)
    const last = undoStack.current[undoStack.current.length - 1]
    if (last?.value === value) return
    undoStack.current.push({ value, caret })
    if (undoStack.current.length > 100) undoStack.current.shift()
    redoStack.current = []
  }

  function handleBeforeInput(e: React.FormEvent<HTMLDivElement>) {
    const inputEvent = e.nativeEvent as InputEvent
    if (
      inputEvent.inputType === "historyUndo" ||
      inputEvent.inputType === "historyRedo"
    )
      return
    pushUndo(e.currentTarget as HTMLElement)
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    mouseDownPos.current = { x: e.clientX, y: e.clientY }
  }
  function handleInput(e: React.SyntheticEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const displayCaret = getCaretOffset(el)
    const stored = extractStoredValue(el, { multiline })
    const html = buildHtml(stored)
    if (el.innerHTML !== html) {
      el.innerHTML = html
      ensureTrailingTextNode(el)
      setCaretOffset(el, displayCaret)
    } else {
      ensureTrailingTextNode(el)
    }
    skipSyncRef.current = true
    onChange(stored)

    // Namespace filter only applies within a `{{ }}` context — discard it for
    // plain-word completions so it doesn't bleed across unrelated keystrokes.
    const partial = getPartialExpr(el)
    if (partial) {
      openAutocomplete(
        partial.query,
        partial.startOffset,
        partial.isTemplate ? acNsFilter : null,
        partial.isTemplate,
      )
    } else {
      closeAutocomplete()
    }
  }

  /** Copies the stored form of the selection so chips survive copy-paste. */
  function handleCopy(e: React.ClipboardEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const stored = extractStoredValue(el, { multiline })
    const selStart = Math.min(getAnchorOffset(el), getFocusOffset(el))
    const selEnd = Math.max(getAnchorOffset(el), getFocusOffset(el))
    const storedStart = displayToStoredOffset(el, selStart)
    const storedEnd = displayToStoredOffset(el, selEnd)
    e.preventDefault()
    e.clipboardData.setData("text/plain", stored.slice(storedStart, storedEnd))
  }

  /** Same as handleCopy but also removes the selected content.
   *  Uses execCommand('delete') so the deletion is tracked in the undo stack. */
  function handleCut(e: React.ClipboardEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const stored = extractStoredValue(el, { multiline })
    const selStart = Math.min(getAnchorOffset(el), getFocusOffset(el))
    const selEnd = Math.max(getAnchorOffset(el), getFocusOffset(el))
    const storedStart = displayToStoredOffset(el, selStart)
    const storedEnd = displayToStoredOffset(el, selEnd)
    e.preventDefault()
    e.clipboardData.setData("text/plain", stored.slice(storedStart, storedEnd))
    pushUndo(el)
    document.execCommand("delete")
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const el = e.currentTarget
    const raw = e.clipboardData.getData("text/plain")
    const text = multiline
      ? raw.replace(/\r\n?/g, "\n")
      : raw.replace(/[\r\n]+/g, "")
    if (!text) return
    pushUndo(el)
    document.execCommand("insertText", false, text)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const el = e.currentTarget

    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault()
      const state = undoStack.current.pop()
      if (!state) return
      redoStack.current.push({
        value: extractStoredValue(el, { multiline }),
        caret: getCaretOffset(el),
      })
      el.innerHTML = buildHtml(state.value)
      ensureTrailingTextNode(el)
      setCaretOffset(el, state.caret)
      skipSyncRef.current = true
      onChange(state.value)
      closeAutocomplete()
      return
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
      e.preventDefault()
      const state = redoStack.current.pop()
      if (!state) return
      undoStack.current.push({
        value: extractStoredValue(el, { multiline }),
        caret: getCaretOffset(el),
      })
      el.innerHTML = buildHtml(state.value)
      ensureTrailingTextNode(el)
      setCaretOffset(el, state.caret)
      skipSyncRef.current = true
      onChange(state.value)
      closeAutocomplete()
      return
    }

    // Backspace: delete chip atomically when caret is inside or at its end.
    if (e.key === "Backspace" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const caret = getCaretOffset(el)
      const chips = getChipRanges(el)
      for (const chip of chips) {
        if (caret > chip.start && caret <= chip.end) {
          e.preventDefault()
          pushUndo(el)
          const stored = extractStoredValue(el, { multiline })
          const newStored =
            stored.slice(0, displayToStoredOffset(el, chip.start)) +
            stored.slice(displayToStoredOffset(el, chip.end))
          el.innerHTML = buildHtml(newStored)
          ensureTrailingTextNode(el)
          setCaretOffset(el, chip.start)
          skipSyncRef.current = true
          onChange(newStored)
          closeAutocomplete()
          return
        }
      }
    }

    // Delete (forward): same but triggered when caret is at chip start.
    if (e.key === "Delete" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const caret = getCaretOffset(el)
      const chips = getChipRanges(el)
      for (const chip of chips) {
        if (caret >= chip.start && caret < chip.end) {
          e.preventDefault()
          pushUndo(el)
          const stored = extractStoredValue(el, { multiline })
          const newStored =
            stored.slice(0, displayToStoredOffset(el, chip.start)) +
            stored.slice(displayToStoredOffset(el, chip.end))
          el.innerHTML = buildHtml(newStored)
          ensureTrailingTextNode(el)
          setCaretOffset(el, chip.start)
          skipSyncRef.current = true
          onChange(newStored)
          closeAutocomplete()
          return
        }
      }
    }

    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault()
      const caret = getCaretOffset(el)
      const partial = getPartialExpr(el)
      openAutocomplete(
        partial?.query ?? "",
        partial?.startOffset ?? caret,
        null,
        partial?.isTemplate ?? false,
      )
      return
    }

    if (acOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        e.stopPropagation()
        setAcIdx((i) => Math.min(i + 1, acItems.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        e.stopPropagation()
        setAcIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        e.stopPropagation()
        const item = acItems[acIdx]
        if (item) selectItem(item)
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        closeAutocomplete()
        return
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        closeAutocomplete() // fall through to atom-snap below
      }
    }

    if (e.key === "Escape") {
      closeAutocomplete()
      return
    }

    if (e.key === "Enter") {
      if (multiline && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        pushUndo(el)

        const stored = extractStoredValue(el, { multiline })
        const displayCaret = getCaretOffset(el)
        const storedCaret = displayToStoredOffset(el, displayCaret)
        const newStored = `${stored.slice(0, storedCaret)}\n${stored.slice(storedCaret)}`
        el.innerHTML = buildHtml(newStored)
        ensureTrailingTextNode(el)
        setCaretOffset(el, displayCaret + 1)
        skipSyncRef.current = true
        onChange(newStored)
        closeAutocomplete()
        return
      }
      e.preventDefault()
      onCommit?.()
      return
    }

    // Arrow-key atom snap: treat each chip as a single character.
    if (
      (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      const caret = getCaretOffset(el)
      const chips = getChipRanges(el)
      if (e.key === "ArrowLeft" && caret > 0) {
        for (const chip of chips) {
          if (caret > chip.start && caret <= chip.end) {
            e.preventDefault()
            setCaretOffset(el, chip.start)
            return
          }
        }
      }
      if (e.key === "ArrowRight" && caret < (el.textContent ?? "").length) {
        for (const chip of chips) {
          if (caret >= chip.start && caret < chip.end) {
            e.preventDefault()
            setCaretOffset(el, chip.end)
            return
          }
        }
      }
    }

    // Shift+Arrow selection snap: extend selection treating each chip as atomic.
    if (
      (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
      e.shiftKey &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      const focus = getFocusOffset(el)
      const anchor = getAnchorOffset(el)
      const chips = getChipRanges(el)
      const totalLen = (el.textContent ?? "").length

      if (e.key === "ArrowRight" && focus < totalLen) {
        let newFocus = focus + 1
        for (const chip of chips) {
          // If the new focus lands on or inside the chip, snap to its end.
          if (newFocus >= chip.start && newFocus < chip.end) {
            newFocus = chip.end
            break
          }
        }
        e.preventDefault()
        setSelectionExtended(el, anchor, newFocus)
        return
      }
      if (e.key === "ArrowLeft" && focus > 0) {
        let newFocus = focus - 1
        for (const chip of chips) {
          // If the new focus lands on or inside the chip, snap to its start.
          if (newFocus > chip.start && newFocus <= chip.end) {
            newFocus = chip.start
            break
          }
        }
        e.preventDefault()
        setSelectionExtended(el, anchor, newFocus)
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
    if (target.dataset.tpl === "var") {
      onVarClick?.(target.dataset.var ?? "")
      return
    }
    if (target.dataset.tpl === "func") {
      handleChipClick(target)
    }
  }

  return {
    handleInput,
    handleBeforeInput,
    handleCopy,
    handleCut,
    handlePaste,
    handleKeyDown,
    handleClick,
    handleMouseDown,
  }
}
