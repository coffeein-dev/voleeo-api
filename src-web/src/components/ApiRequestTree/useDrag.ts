import type React from "react"
import { useEffect, useRef, useState } from "react"
import {
  computeUpdate,
  findAncestorAtDepth,
} from "@/components/ApiRequestTree/treeUtils"
import type { DropZone } from "@/components/ApiRequestTree/types"
import type { MoveItemUpdate, TreeNode } from "@/store/requests"
import { useTreeUiStore } from "@/store/treeUi"

export interface DragHandle {
  draggingId: string | null
  draggingIds: string[]
  dropZone: DropZone | null
  startDrag: (e: React.PointerEvent, id: string) => void
  didDrag: React.RefObject<boolean>
}

/**
 * Manages pointer-event drag state and emits one or more MoveItemUpdates on
 * drop. When the dragged row is part of the current multi-selection, the
 * whole selection moves together. Global listeners are registered once on
 * mount so re-renders never re-attach them.
 */
export function useDrag(
  tree: TreeNode[],
  onMoveItems: (updates: MoveItemUpdate[]) => Promise<void>,
): DragHandle {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [draggingIds, setDraggingIds] = useState<string[]>([])
  const [dropZone, setDropZone] = useState<DropZone | null>(null)

  const drag = useRef<{
    id: string
    ids: string[]
    active: boolean
    x0: number
    y0: number
  } | null>(null)
  const zoneRef = useRef<DropZone | null>(null)
  const zoneKey = useRef("")
  const treeRef = useRef(tree)
  const moveRef = useRef(onMoveItems)
  const didDrag = useRef(false)

  // Keep refs current so the long-lived pointer listeners (registered once on
  // mount) always see the latest tree + handler without re-attaching.
  useEffect(() => {
    treeRef.current = tree
  }, [tree])
  useEffect(() => {
    moveRef.current = onMoveItems
  }, [onMoveItems])

  useEffect(() => {
    function resolveZone(
      e: PointerEvent,
      draggingNodeIds: string[],
    ): DropZone | null {
      const skip = new Set(draggingNodeIds)
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>("[data-node-id]"),
      ).filter((el) => el.dataset.nodeId && !skip.has(el.dataset.nodeId))

      if (rows.length === 0) return null

      // Closest row by vertical centre — robust against gaps and drop-line elements
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

      const nodeId = hit.dataset.nodeId
      if (!nodeId) return null
      const isFolder = hit.dataset.nodeKind === "folder"
      const nodeDepth = parseInt(hit.dataset.nodeDepth ?? "0", 10)
      const rect = hit.getBoundingClientRect()
      const relY = (e.clientY - rect.top) / rect.height

      // Folders: middle 40% → "into", outer 30% each → before / after
      const type: DropZone["type"] =
        isFolder && relY > 0.3 && relY < 0.7
          ? "into"
          : relY <= 0.5
            ? "before"
            : "after"

      let targetId = nodeId

      // X-based depth promotion: if cursor is shallower than the node's indent,
      // walk up to the matching ancestor so the user can escape nested folders.
      if (type === "after" && nodeDepth > 0) {
        const nodeIndent = nodeDepth * 12 + 14 + (isFolder ? 0 : 4)
        if (e.clientX < nodeIndent - 8) {
          const targetDepth = Math.max(0, Math.floor((e.clientX - 14) / 12))
          const ancestor = findAncestorAtDepth(
            treeRef.current,
            nodeId,
            nodeDepth,
            targetDepth,
          )
          if (ancestor) targetId = ancestor
        }
      }

      return { type, id: targetId }
    }

    function onMove(e: PointerEvent) {
      const d = drag.current
      if (!d) return

      if (!d.active) {
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 4) return
        d.active = true
        setDraggingId(d.id)
        setDraggingIds(d.ids)
      }

      const zone = resolveZone(e, d.ids)
      if (!zone) return

      zoneRef.current = zone
      const key = `${zone.type}:${zone.id}`
      if (zoneKey.current !== key) {
        zoneKey.current = key
        setDropZone(zone)
      }
    }

    function onUp() {
      const d = drag.current
      if (!d) return

      const { active: wasActive, ids } = d
      const zone = zoneRef.current

      drag.current = null
      zoneRef.current = null
      zoneKey.current = ""
      setDraggingId(null)
      setDraggingIds([])
      setDropZone(null)

      if (!wasActive) return // plain click — let onClick handle it

      didDrag.current = true // signal onClick to skip selection

      // Auto-reset after a short delay: if the browser doesn't fire a click
      // event after the drag release (e.g. pointer moved far), didDrag would
      // otherwise stay true and eat the user's next genuine click.
      setTimeout(() => {
        didDrag.current = false
      }, 200)
      if (!zone) return

      // Build one MoveItemUpdate per moving id. `computeUpdate` slots each
      // item into the drop zone independently; the backend applies them as a
      // single moveItems call so the order doesn't matter to the user.
      const updates = ids
        .map((id) => computeUpdate(treeRef.current, id, zone))
        .filter((u): u is NonNullable<typeof u> => u !== null)
      if (updates.length > 0) moveRef.current(updates)
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

  function startDrag(e: React.PointerEvent, id: string) {
    if (e.button !== 0)
      return // Release implicit pointer capture so global window listeners receive all events
    ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    const selected = useTreeUiStore.getState().selectedIds
    const ids = selected.includes(id) ? selected : [id]
    drag.current = { id, ids, active: false, x0: e.clientX, y0: e.clientY }
  }

  return { draggingId, draggingIds, dropZone, startDrag, didDrag }
}
