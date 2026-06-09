import type React from "react"
import { useEffect, useRef, useState } from "react"

export interface ListDragHandle {
  draggingIndex: number | null
  dropIndex: number | null
  startDrag: (e: React.PointerEvent, index: number) => void
}

/**
 * Pointer-event drag-to-reorder for a flat list.
 *
 * Rows must carry:
 *   data-list-index="<number>"
 *
 * The trailing sentinel row (no data-list-index) is automatically excluded
 * from drop targeting — place it last and omit the attribute.
 */
export function useListDrag(
  onDrop: (fromIndex: number, toIndex: number) => void,
): ListDragHandle {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  const drag = useRef<{
    index: number
    active: boolean
    x0: number
    y0: number
  } | null>(null)

  const dropRef = useRef<number | null>(null)
  const dropKeyRef = useRef<number | null>(null)
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  })

  useEffect(() => {
    function resolveDropIndex(e: PointerEvent): number | null {
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-list-index]"),
      )
      if (rows.length === 0) return null

      let hit = rows[0]
      let bestDist = Infinity
      for (const el of rows) {
        const r = el.getBoundingClientRect()
        const dist = Math.abs(e.clientY - (r.top + r.bottom) / 2)
        if (dist < bestDist) {
          bestDist = dist
          hit = el
        }
      }

      const hitIndex = parseInt(hit.dataset.listIndex ?? "0", 10)
      const rect = hit.getBoundingClientRect()
      return e.clientY <= (rect.top + rect.bottom) / 2 ? hitIndex : hitIndex + 1
    }

    function onMove(e: PointerEvent) {
      const d = drag.current
      if (!d) return

      if (!d.active) {
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return
        d.active = true
        setDraggingIndex(d.index)
      }

      const idx = resolveDropIndex(e)
      if (idx === null) return

      dropRef.current = idx
      if (dropKeyRef.current !== idx) {
        dropKeyRef.current = idx
        setDropIndex(idx)
      }
    }

    function onUp() {
      const d = drag.current
      if (!d) return

      const wasActive = d.active
      const fromIndex = d.index
      const toRaw = dropRef.current

      drag.current = null
      dropRef.current = null
      dropKeyRef.current = null
      setDraggingIndex(null)
      setDropIndex(null)

      if (!wasActive || toRaw === null) return

      // Dropping at fromIndex or fromIndex+1 is a no-op
      const toIndex = toRaw > fromIndex ? toRaw - 1 : toRaw
      if (toIndex !== fromIndex) {
        onDropRef.current(fromIndex, toIndex)
      }
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("pointercancel", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("pointercancel", onUp)
    }
  }, [])

  function startDrag(e: React.PointerEvent, index: number) {
    if (e.button !== 0) return
    ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    drag.current = { index, active: false, x0: e.clientX, y0: e.clientY }
  }

  return { draggingIndex, dropIndex, startDrag }
}
