/**
 * Shared caret-management utilities for contenteditable elements that contain
 * atomic inline spans (contenteditable="false").
 *
 * All positions are expressed as plain-text character offsets — i.e. the
 * number of characters in the element's textContent, ignoring HTML structure.
 * This lets callers work with a simple integer rather than DOM Range objects.
 */

import { serializeFuncToken } from "./template"

/**
 * Ensures the last child of `el` is a text node.  Without this, when the
 * final child is an atomic span there is nowhere for the browser to place the
 * cursor after it, preventing the user from typing at the end of the line.
 */
export function ensureTrailingTextNode(el: HTMLElement): void {
  if (!el.lastChild || el.lastChild.nodeType !== Node.TEXT_NODE) {
    el.appendChild(document.createTextNode(""))
  }
}

/** Returns the caret offset (plain-text character index) inside `el`. */
export function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0)
  const pre = range.cloneRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.endContainer, range.endOffset)
  return pre.toString().length
}

/**
 * Places the caret at `offset` (plain-text character index) inside `el`.
 *
 * If the offset lands inside a contenteditable=false span the caret is snapped
 * to the span's nearest boundary so the span stays atomic.
 */
export function setCaretOffset(el: HTMLElement, offset: number): void {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let remaining = offset
  let node: Node | null
  // biome-ignore lint/suspicious/noAssignInExpressions: standard tree-walker loop
  while ((node = walker.nextNode())) {
    const textNode = node as Text
    const len = textNode.length
    const parentEl = textNode.parentElement
    const inAtom =
      parentEl !== null &&
      parentEl !== el &&
      parentEl.getAttribute("contenteditable") === "false"

    if (remaining <= len) {
      if (inAtom && parentEl) {
        const range = document.createRange()
        if (remaining === 0) {
          range.setStartBefore(parentEl)
        } else {
          // Prefer placing the cursor in the next sibling text node so it lives
          // inside a text node rather than at the element boundary.
          const next = parentEl.nextSibling
          if (next?.nodeType === Node.TEXT_NODE) {
            range.setStart(next as Text, 0)
          } else {
            range.setStartAfter(parentEl)
          }
        }
        range.collapse(true)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
        return
      }
      const range = document.createRange()
      range.setStart(textNode, remaining)
      range.collapse(true)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      return
    }
    remaining -= len
  }
  // Offset past end — place at the very end.
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

/**
 * Returns the display-character offset of the selection ANCHOR (the fixed end
 * when extending a selection with Shift+Arrow). Falls back to the focus offset
 * for collapsed selections or if the anchor lies outside `el`.
 */
export function getAnchorOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
    return getCaretOffset(el)
  }
  const r = document.createRange()
  r.selectNodeContents(el)
  try {
    // biome-ignore lint/style/noNonNullAssertion: anchorNode is always set when a Selection exists
    r.setEnd(sel.anchorNode!, sel.anchorOffset)
  } catch {
    return getCaretOffset(el)
  }
  return r.toString().length
}

/**
 * Returns the display-character offset of the selection FOCUS (the moving end
 * for Shift+Arrow selections; identical to getCaretOffset for collapsed
 * selections).
 */
export function getFocusOffset(el: HTMLElement): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || !el.contains(sel.focusNode)) {
    return getCaretOffset(el)
  }
  const r = document.createRange()
  r.selectNodeContents(el)
  try {
    // biome-ignore lint/style/noNonNullAssertion: focusNode is always set when a Selection exists
    r.setEnd(sel.focusNode!, sel.focusOffset)
  } catch {
    return getCaretOffset(el)
  }
  return r.toString().length
}

/**
 * Sets a (possibly non-collapsed) selection from `anchorDisplay` to
 * `focusDisplay`, both as plain-text character offsets.
 * When they are equal the selection is collapsed (same as setCaretOffset).
 */
export function setSelectionExtended(
  el: HTMLElement,
  anchorDisplay: number,
  focusDisplay: number,
): void {
  const anchor = resolveDisplayOffset(el, anchorDisplay)
  const focus = resolveDisplayOffset(el, focusDisplay)
  if (!anchor || !focus) return
  window
    .getSelection()
    ?.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset)
}

/**
 * Maps a plain-text display offset to a `{ node, offset }` DOM position.
 * Positions exactly at a chip boundary are placed just before (start) or just
 * after (end) the chip span so the caller can distinguish the two sides.
 * Positions are expected to be at chip boundaries or in plain text — i.e.
 * never inside an atomic span.
 */
function resolveDisplayOffset(
  el: HTMLElement,
  displayOffset: number,
): { node: Node; offset: number } | null {
  let pos = 0
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i]
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child as Text
      const end = pos + text.length
      if (displayOffset <= end) {
        return { node: text, offset: displayOffset - pos }
      }
      pos = end
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const span = child as HTMLElement
      const spanLen = (span.textContent ?? "").length
      if (displayOffset === pos) {
        // Just before this span — use end of preceding text node.
        const prev = span.previousSibling
        if (prev?.nodeType === Node.TEXT_NODE) {
          return { node: prev as Text, offset: (prev as Text).length }
        }
        return { node: el, offset: i }
      }
      if (displayOffset === pos + spanLen) {
        // Just after this span — use start of following text node.
        const next = span.nextSibling
        if (next?.nodeType === Node.TEXT_NODE) {
          return { node: next as Text, offset: 0 }
        }
        return { node: el, offset: i + 1 }
      }
      pos += spanLen
    }
  }
  // Past end — place at end of last text node.
  for (let i = el.childNodes.length - 1; i >= 0; i--) {
    const n = el.childNodes[i]
    if (n.nodeType === Node.TEXT_NODE) {
      return { node: n as Text, offset: (n as Text).length }
    }
  }
  return { node: el, offset: el.childNodes.length }
}

/**
 * Attaches a `selectionchange` listener that snaps the cursor out of atomic
 * spans whenever the user clicks or arrow-keys into one.
 *
 * `isDragging` (optional ref) should be set to `true` from a native mousedown
 * listener and cleared on mouseup.  When a drag is in progress, the snap
 * always moves the cursor to just BEFORE the chip — this ensures that dragging
 * rightward from a chip includes it in the selection.  Without the flag the
 * snap is nearest-boundary (before if cursor is in the left half, after if
 * in the right half).
 *
 * Returns a cleanup function — call it in an effect's return to remove the
 * listener when the component unmounts.
 */
export function attachAtomSnapListener(
  el: HTMLElement,
  opts?: { isDragging?: { current: boolean } },
): () => void {
  function onSelectionChange() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    if (!el.contains(range.startContainer)) return

    let node: Node | null = range.startContainer
    while (node && node !== el) {
      if (
        node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).getAttribute("contenteditable") === "false"
      ) {
        const textLen = (node as Element).textContent?.length ?? 1
        const newRange = document.createRange()
        // During a pointer drag always snap before the chip so that
        // dragging rightward from it includes the chip in the selection.
        const snapBefore =
          (opts?.isDragging?.current ?? false) ||
          range.startOffset < textLen / 2
        if (snapBefore) {
          newRange.setStartBefore(node)
        } else {
          const next = (node as Element).nextSibling
          if (next?.nodeType === Node.TEXT_NODE) {
            newRange.setStart(next as Text, 0)
          } else {
            newRange.setStartAfter(node)
          }
        }
        newRange.collapse(true)
        sel.removeAllRanges()
        sel.addRange(newRange)
        return
      }
      node = node.parentNode
    }
  }

  document.addEventListener("selectionchange", onSelectionChange)
  return () =>
    document.removeEventListener("selectionchange", onSelectionChange)
}

/**
 * Reconstructs the stored template string from the DOM contents of a
 * contenteditable element that may contain atomic chip spans.
 *
 * - Plain text nodes → appended as-is.
 * - `data-tpl="var"` spans → `{{ VAR_NAME }}` (name read from `data-var`).
 * - `data-tpl="func"` spans → `{{ func(args) }}` (from `data-func`/`data-args`
 *   when present, or from `textContent` otherwise — the UrlInput path).
 * - `data-param="true"` spans → `textContent` as-is (`:paramName` is
 *   already the stored form).
 * - Any other element → `textContent`.
 */
export function extractStoredValue(
  el: HTMLElement,
  opts?: { multiline?: boolean },
): string {
  let result = ""
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent ?? ""
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const span = node as HTMLElement
      const tpl = span.dataset.tpl
      if (tpl === "var") {
        const name = span.dataset.var ?? span.textContent ?? ""
        result += `{{ ${name} }}`
      } else if (tpl === "func") {
        if (span.dataset.func !== undefined) {
          // TemplateInput path: data-func + data-args are set.
          const fnName = span.dataset.func
          let args: Record<string, string> = {}
          try {
            args = JSON.parse(span.dataset.args ?? "{}")
          } catch {
            // ignore parse errors
          }
          result += serializeFuncToken(fnName, args)
        } else {
          // UrlInput path: only textContent available.
          const inner = (span.textContent ?? "").trim()
          result += `{{ ${inner} }}`
        }
      } else {
        // data-param="true" or unknown chip — textContent is the stored form.
        result += span.textContent ?? ""
      }
    }
  }
  // Single-line callers strip newlines to keep request fields clean
  // (URL, headers, params, auth). Multiline callers (e.g. cookie value)
  // opt in to preserving them — but still strip the U+200B phantom we
  // append in multiline mode so trailing newlines render a visible line.
  return opts?.multiline
    ? result.replace(/​/g, "")
    : result.replace(/[\r\n]/g, "")
}

/**
 * Maps a display-character offset (the same coordinate used by
 * `getCaretOffset` / `setCaretOffset`) to the corresponding offset in the
 * stored template string produced by `extractStoredValue`.
 *
 * Display chars count chip text (e.g. `AUTH_HOST` = 9 chars).
 * Stored chars count the full chip token (e.g. `{{ AUTH_HOST }}` = 15 chars).
 *
 * Positions inside a chip snap to just after the chip in stored space,
 * mirroring the atomic-block caret behaviour.
 */
export function displayToStoredOffset(
  el: HTMLElement,
  displayOffset: number,
): number {
  let storedPos = 0
  let displayPos = 0

  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent ?? "").length
      if (displayPos + len >= displayOffset) {
        return storedPos + (displayOffset - displayPos)
      }
      storedPos += len
      displayPos += len
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const span = node as HTMLElement
      const displayLen = (span.textContent ?? "").length
      const tpl = span.dataset.tpl

      let storedLen: number
      if (tpl === "var") {
        const name = span.dataset.var ?? span.textContent ?? ""
        storedLen = `{{ ${name} }}`.length
      } else if (tpl === "func") {
        if (span.dataset.func !== undefined) {
          const fnName = span.dataset.func
          let args: Record<string, string> = {}
          try {
            args = JSON.parse(span.dataset.args ?? "{}")
          } catch {}
          storedLen = serializeFuncToken(fnName, args).length
        } else {
          const inner = (span.textContent ?? "").trim()
          storedLen = `{{ ${inner} }}`.length
        }
      } else {
        // param chip: display == stored
        storedLen = displayLen
      }

      if (displayOffset <= displayPos) {
        return storedPos
      }
      if (displayOffset <= displayPos + displayLen) {
        // Inside or at the end of this chip — snap to after it.
        return storedPos + storedLen
      }
      storedPos += storedLen
      displayPos += displayLen
    }
  }

  return storedPos
}

/**
 * Returns the display-character ranges `[start, end)` of all
 * `contenteditable="false"` chip spans inside `el`, in source order.
 *
 * Positions are in the same plain-text coordinate system as
 * `getCaretOffset` / `setCaretOffset`.  Use these ranges in arrow-key
 * handlers to snap the caret past chips as a single character.
 */
export function getChipRanges(
  el: HTMLElement,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = []
  let pos = 0
  for (const node of el.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      pos += (node.textContent ?? "").length
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const span = node as HTMLElement
      const len = (span.textContent ?? "").length
      if (span.getAttribute("contenteditable") === "false") {
        ranges.push({ start: pos, end: pos + len })
      }
      pos += len
    }
  }
  return ranges
}
