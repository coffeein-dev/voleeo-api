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
import { type CommandImportResult, tryParseCommand } from "@/lib/commandImport"
import { parseQueryString } from "../paramUtils"
import type { AutocompleteItem } from "./useUrlAutocomplete"
import { getUrlPartialExpr } from "./useUrlAutocomplete"

interface UseUrlInputHandlersOptions {
  buildHtml: (text: string) => string
  skipSyncRef: RefObject<boolean>
  onChange: (v: string) => void
  onSend: () => void
  onQueryParams?: (params: Array<{ key: string; value: string }>) => void
  onImportCommand?: (result: CommandImportResult) => void
  acOpen: boolean
  acItems: AutocompleteItem[]
  acIdx: number
  acNsFilter: string | null
  setAcIdx: React.Dispatch<React.SetStateAction<number>>
  openAutocomplete: (
    query: string,
    partialStart: number,
    nsFilter?: string | null,
  ) => void
  closeAutocomplete: () => void
  selectUrlItem: (item: AutocompleteItem) => void
}

export function useUrlInputHandlers({
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
}: UseUrlInputHandlersOptions) {
  const undoStack = useRef<Array<{ value: string; caret: number }>>([])
  const redoStack = useRef<Array<{ value: string; caret: number }>>([])

  function pushUndo(el: HTMLElement) {
    const value = extractStoredValue(el)
    const caret = getCaretOffset(el)
    const last = undoStack.current[undoStack.current.length - 1]
    if (last?.value === value) return
    undoStack.current.push({ value, caret })
    if (undoStack.current.length > 100) undoStack.current.shift()
    redoStack.current = []
  }

  function handleBeforeInput(e: React.FormEvent<HTMLDivElement>) {
    const inputEvent = e.nativeEvent as InputEvent
    // Don't capture undo/redo browser events — we handle those ourselves.
    if (
      inputEvent.inputType === "historyUndo" ||
      inputEvent.inputType === "historyRedo"
    )
      return
    pushUndo(e.currentTarget as HTMLElement)
  }

  function handleInput(e: React.SyntheticEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const stored = extractStoredValue(el)

    // If the user typed `?`, extract query params and strip them from the URL bar.
    const qDisplayIdx = (el.textContent ?? "").indexOf("?")
    if (qDisplayIdx !== -1) {
      const qStoredIdx = displayToStoredOffset(el, qDisplayIdx)
      const pathStored = stored.slice(0, qStoredIdx)
      const params = parseQueryString(stored.slice(qStoredIdx + 1))
      el.innerHTML = buildHtml(pathStored)
      ensureTrailingTextNode(el)
      setCaretOffset(el, qDisplayIdx)
      skipSyncRef.current = true
      onChange(pathStored)
      onQueryParams?.(params)
      return
    }

    const displayCaret = getCaretOffset(el)
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

    const partial = getUrlPartialExpr(el)
    if (partial) {
      openAutocomplete(
        partial.query,
        partial.startOffset,
        partial.isTemplate ? acNsFilter : null,
      )
    } else {
      closeAutocomplete()
    }
  }

  /** Copies the *stored* form of the selection (e.g. `{{ HOST }}`) so a
   *  subsequent paste re-creates chips rather than pasting display text. */
  function handleCopy(e: React.ClipboardEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const stored = extractStoredValue(el)
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
    const stored = extractStoredValue(el)
    const selStart = Math.min(getAnchorOffset(el), getFocusOffset(el))
    const selEnd = Math.max(getAnchorOffset(el), getFocusOffset(el))
    const storedStart = displayToStoredOffset(el, selStart)
    const storedEnd = displayToStoredOffset(el, selEnd)
    e.preventDefault()
    e.clipboardData.setData("text/plain", stored.slice(storedStart, storedEnd))
    pushUndo(el)
    // execCommand records the deletion in the browser undo stack;
    // handleInput fires automatically and updates React state.
    document.execCommand("delete")
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault()
    const el = e.currentTarget
    const text = e.clipboardData.getData("text/plain")
    if (!text) return
    // When the input is empty and the paste looks like a curl/httpie command,
    // hand it up to the parent for full request import instead of inserting
    // it as plain text. Disabled commands (no onImportCommand) fall through.
    if (onImportCommand && extractStoredValue(el) === "") {
      const result = tryParseCommand(text)
      if (result) {
        onImportCommand(result)
        return
      }
    }
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
        value: extractStoredValue(el),
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
        value: extractStoredValue(el),
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
    // WebKit doesn't reliably backspace into a `contenteditable="false"` span
    // when there is no text node between two adjacent chips.
    if (e.key === "Backspace" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      const caret = getCaretOffset(el)
      const chips = getChipRanges(el)
      for (const chip of chips) {
        if (caret > chip.start && caret <= chip.end) {
          e.preventDefault()
          pushUndo(el)
          const stored = extractStoredValue(el)
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
          const stored = extractStoredValue(el)
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

    if (e.key === "Enter" && !acOpen) {
      e.preventDefault()
      onSend()
      return
    }

    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault()
      const caret = getCaretOffset(el)
      const partial = getUrlPartialExpr(el)
      openAutocomplete(
        partial?.query ?? "",
        partial?.startOffset ?? caret,
        null,
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
        if (item) selectUrlItem(item)
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

  return {
    handleInput,
    handleBeforeInput,
    handleCopy,
    handleCut,
    handlePaste,
    handleKeyDown,
  }
}
