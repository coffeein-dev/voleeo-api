import { useEffect } from "react"

export interface KeyCombo {
  key: string // e.g. "n", "k", "/"
  meta?: boolean // Cmd on macOS, Win on Windows
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
}

function keyToCode(key: string): string {
  if (key.length === 1 && key >= "a" && key <= "z") {
    return `Key${key.toUpperCase()}`
  }
  if (key.length === 1 && key >= "0" && key <= "9") return `Digit${key}`
  switch (key) {
    case "/":
      return "Slash"
    case "\\":
      return "Backslash"
    case "enter":
      return "Enter"
    default:
      return ""
  }
}

function keyMatches(e: KeyboardEvent, key: string): boolean {
  const k = key.toLowerCase()
  if (e.key.toLowerCase() === k) return true
  return e.code === keyToCode(k)
}

/**
 * Fires `handler` whenever the matching key combo is pressed.
 * Pass `enabled = false` to temporarily disable without unmounting.
 * Skips events originating from editable elements (input, textarea, contenteditable).
 */
export function useKeydown(
  combo: KeyCombo,
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if (!enabled) return

      // Don't steal from text inputs
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return

      if (
        keyMatches(e, combo.key) &&
        e.metaKey === !!combo.meta &&
        e.ctrlKey === !!combo.ctrl &&
        e.shiftKey === !!combo.shift &&
        e.altKey === !!combo.alt
      ) {
        e.preventDefault()
        handler()
      }
    }

    window.addEventListener("keydown", onKeydown)
    return () => window.removeEventListener("keydown", onKeydown)
  }, [
    combo.key,
    combo.meta,
    combo.ctrl,
    combo.shift,
    combo.alt,
    handler,
    enabled,
  ])
}
