import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"

const MIN = 220
const MAX = 560
const DEFAULT = 320

const key = (wsId: string) => `voleeo:gitSidebar:${wsId}`
const clamp = (v: number) => Math.max(MIN, Math.min(MAX, v))

function load(wsId: string): number {
  const raw = localStorage.getItem(key(wsId))
  const n = raw ? Number(raw) : Number.NaN
  return Number.isFinite(n) ? clamp(n) : DEFAULT
}

/** Drag-to-resize width (px) for the Source Control sidebar, persisted per workspace. */
export function useSidebarResize(wsId: string) {
  const [width, setWidth] = useState(() => load(wsId))
  const widthRef = useRef(width)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  // Reload the saved width when switching workspaces.
  useEffect(() => {
    const w = load(wsId)
    widthRef.current = w
    setWidth(w)
  }, [wsId])

  const onSepDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = widthRef.current
    e.preventDefault()
  }, [])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return
      const w = clamp(startW.current + (e.clientX - startX.current))
      widthRef.current = w
      setWidth(w)
    }
    function onUp() {
      if (!dragging.current) return
      dragging.current = false
      localStorage.setItem(key(wsId), String(widthRef.current))
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
    return () => {
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
  }, [wsId])

  return { width, onSepDown }
}
