import { codeFolding, foldGutter, foldKeymap } from "@codemirror/language"
import type { Extension } from "@codemirror/state"
import { keymap } from "@uiw/react-codemirror"

function chevronMarker(open: boolean): HTMLElement {
  const el = document.createElement("span")
  el.className = "cm-fold-chevron"
  el.setAttribute("aria-hidden", "true")
  el.innerHTML = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4 L10 8 L6 12"/></svg>`
  const svg = el.firstElementChild as SVGElement | null
  if (svg) svg.style.transform = open ? "rotate(90deg)" : "none"
  return el
}

export function foldingExtension(): Extension {
  return [
    codeFolding(),
    foldGutter({ markerDOM: chevronMarker }),
    keymap.of(foldKeymap),
  ]
}
