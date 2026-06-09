import type React from "react"
import { useEffect, useRef, useState } from "react"

export type ParamSection = "path" | "query" | "header"

export interface DropTarget {
  section: ParamSection
  index: number
}

export interface ParamDragHandle {
  draggingKey: string | null
  dropTarget: DropTarget | null
  startDrag: (
    e: React.PointerEvent,
    section: ParamSection,
    index: number,
  ) => void
}

/**
 * Pointer-event drag for the flat params list.
 * Rows must carry:
 *   data-param-section="path"|"query"
 *   data-param-index="<number>"
 *
 * Cross-section drops are blocked — path params stay above query params.
 */
export function useParamDrag(
  onDrop: (section: ParamSection, fromIndex: number, toIndex: number) => void,
): ParamDragHandle {
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const drag = useRef<{
    section: ParamSection
    index: number
    active: boolean
    x0: number
    y0: number
  } | null>(null)

  const dropRef = useRef<DropTarget | null>(null)
  const dropKeyRef = useRef("")
  const onDropRef = useRef(onDrop)
  useEffect(() => {
    onDropRef.current = onDrop
  })

  useEffect(() => {
    function resolveTarget(
      e: PointerEvent,
      section: ParamSection,
    ): DropTarget | null {
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-param-section="${section}"]`,
        ),
      )
      if (rows.length === 0) return null

      // Find the row whose vertical centre is closest to the cursor
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

      const hitIndex = parseInt(hit.dataset.paramIndex ?? "0", 10)
      const rect = hit.getBoundingClientRect()
      // Top half → drop before this row; bottom half → drop after
      const index =
        e.clientY <= (rect.top + rect.bottom) / 2 ? hitIndex : hitIndex + 1

      return { section, index }
    }

    function onMove(e: PointerEvent) {
      const d = drag.current
      if (!d) return

      if (!d.active) {
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return
        d.active = true
        setDraggingKey(`${d.section}:${d.index}`)
      }

      const target = resolveTarget(e, d.section)
      if (!target) return

      dropRef.current = target
      const key = `${target.section}:${target.index}`
      if (dropKeyRef.current !== key) {
        dropKeyRef.current = key
        setDropTarget({ ...target })
      }
    }

    function onUp() {
      const d = drag.current
      if (!d) return

      const wasActive = d.active
      const { section, index: fromIndex } = d
      const target = dropRef.current

      drag.current = null
      dropRef.current = null
      dropKeyRef.current = ""
      setDraggingKey(null)
      setDropTarget(null)

      if (!wasActive || !target) return

      // Normalize: dropping at fromIndex or fromIndex+1 is a no-op
      const toIndex = target.index > fromIndex ? target.index - 1 : target.index
      if (toIndex !== fromIndex) {
        onDropRef.current(section, fromIndex, toIndex)
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

  function startDrag(
    e: React.PointerEvent,
    section: ParamSection,
    index: number,
  ) {
    if (e.button !== 0) return
    ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    drag.current = {
      section,
      index,
      active: false,
      x0: e.clientX,
      y0: e.clientY,
    }
  }

  return { draggingKey, dropTarget, startDrag }
}
