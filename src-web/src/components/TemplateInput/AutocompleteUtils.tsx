import type { RefObject } from "react"
import { useEffect } from "react"

/**
 * Shared presentational helpers for autocomplete dropdowns.
 * Extracted so they can be reused by both Autocomplete.tsx and
 * any custom dropdown (e.g. HeaderKeyInput).
 */
export function HighlightMatch({
  text,
  query,
}: {
  text: string
  query: string
}) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-accent">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}

/** Registers a click-outside listener that fires `onDismiss` when the click
 *  lands outside `containerRef`. Cleans up on unmount. */
export function DismissLayer({
  containerRef,
  onDismiss,
}: {
  containerRef: RefObject<HTMLDivElement | null>
  onDismiss: () => void
}) {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        !containerRef.current ||
        containerRef.current.contains(e.target as Node)
      )
        return
      onDismiss()
    }
    document.addEventListener("click", handler, { capture: true })
    return () =>
      document.removeEventListener("click", handler, { capture: true })
  }, [containerRef, onDismiss])
  return null
}

/** Maps a badge code to a human-readable type label shown on the right of the item. */
export function badgeLabel(badge: string): string {
  switch (badge) {
    case "hd":
      return "header"
    case "mt":
      return "media type"
    case "enc":
      return "encoding"
    case "la":
      return "language"
    case "cc":
      return "cache"
    case "auth":
      return "auth"
    default:
      return badge
  }
}

/** Maps a badge code to a CSS color token. */
export function badgeColor(badge: string): string {
  switch (badge) {
    case "mt":
      return "var(--base0D)"
    case "enc":
      return "var(--base0C)"
    case "la":
      return "var(--base0B)"
    case "cc":
      return "var(--base0A)"
    case "auth":
      return "var(--base08)"
    default:
      return "var(--base04)"
  }
}

export function Badge({ letter, color }: { letter: string; color: string }) {
  return (
    <span
      className="font-mono text-[9px] font-bold min-w-4 h-4 px-0.5 flex items-center justify-center rounded-[3px] shrink-0"
      style={{
        background: `color-mix(in srgb,${color} 15%,transparent)`,
        color,
      }}
    >
      {letter}
    </span>
  )
}
