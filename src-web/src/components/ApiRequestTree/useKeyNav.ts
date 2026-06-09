import type React from "react"
import type { TreeNode } from "@/store/requests"
import { useTreeUiStore } from "@/store/treeUi"
import { flattenVisible } from "./treeUtils"

export interface KeyNavHandle {
  focusedId: string | null
  setFocusedId: (id: string | null) => void
  selectedIds: string[]
  selectRow: (id: string, modifiers: { meta: boolean; shift: boolean }) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
}

const NAV_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Enter",
])

export function useKeyNav(
  tree: TreeNode[],
  isFolderOpen: (id: string) => boolean,
  toggleFolder: (id: string) => void,
  onEnterAction: (id: string, kind: "folder" | "request" | "websocket") => void,
): KeyNavHandle {
  const focusedId = useTreeUiStore((s) => s.focusedNodeId)
  const setFocusedId = useTreeUiStore((s) => s.setFocusedNodeId)
  const selectedIds = useTreeUiStore((s) => s.selectedIds)

  function rangeIds(from: string, to: string): string[] {
    const flat = flattenVisible(tree, isFolderOpen)
    const fromIdx = flat.findIndex((n) => n.id === from)
    const toIdx = flat.findIndex((n) => n.id === to)
    if (fromIdx === -1 || toIdx === -1) return [to]
    const [lo, hi] = fromIdx <= toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx]
    return flat.slice(lo, hi + 1).map((n) => n.id)
  }

  function selectRow(
    id: string,
    modifiers: { meta: boolean; shift: boolean },
  ): void {
    const { setSelection, toggleSelected, selectionAnchorId } =
      useTreeUiStore.getState()
    if (modifiers.shift) {
      const anchor = selectionAnchorId ?? focusedId ?? id
      setSelection(rangeIds(anchor, id), anchor)
      setFocusedId(id)
      return
    }
    if (modifiers.meta) {
      toggleSelected(id)
      return
    }
    setSelection([id], id)
    setFocusedId(id)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!NAV_KEYS.has(e.key)) return
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) return
    e.preventDefault()

    const flat = flattenVisible(tree, isFolderOpen)
    if (flat.length === 0) return

    const idx = flat.findIndex((n) => n.id === focusedId)

    const move = (nextIdx: number) => {
      const next = flat[nextIdx].id
      const { setSelection, selectionAnchorId } = useTreeUiStore.getState()
      if (e.shiftKey) {
        const anchor = selectionAnchorId ?? focusedId ?? next
        setSelection(rangeIds(anchor, next), anchor)
      } else {
        setSelection([next], next)
      }
      setFocusedId(next)
    }

    switch (e.key) {
      case "ArrowUp": {
        if (idx === -1) move(flat.length - 1)
        else if (idx > 0) move(idx - 1)
        break
      }

      case "ArrowDown": {
        if (idx === -1) move(0)
        else if (idx < flat.length - 1) move(idx + 1)
        break
      }

      case "ArrowLeft": {
        if (idx === -1) break
        const cur = flat[idx]

        if (cur.kind === "folder" && isFolderOpen(cur.id)) {
          // Collapse this open folder and stay on it.
          toggleFolder(cur.id)
        } else if (cur.isFirstChild && cur.parentId !== null) {
          // At the top of a folder — escape to parent and collapse it.
          move(flat.findIndex((n) => n.id === cur.parentId))
          if (isFolderOpen(cur.parentId)) toggleFolder(cur.parentId)
        } else if (idx > 0) {
          move(idx - 1)
        }
        break
      }

      case "ArrowRight": {
        if (idx === -1) break
        const cur = flat[idx]

        if (cur.kind === "folder" && !isFolderOpen(cur.id)) {
          // Open a closed folder and stay on it; next Right/Down descends.
          toggleFolder(cur.id)
        } else if (cur.kind === "folder" && isFolderOpen(cur.id)) {
          // Descend into first child (already visible in flat list).
          if (idx < flat.length - 1) move(idx + 1)
        } else if (idx < flat.length - 1) {
          // Move to next node; auto-open if it is a closed folder.
          const nextNode = flat[idx + 1]
          move(idx + 1)
          if (nextNode.kind === "folder" && !isFolderOpen(nextNode.id)) {
            toggleFolder(nextNode.id)
          }
        }
        break
      }

      case "Enter": {
        if (idx !== -1) onEnterAction(flat[idx].id, flat[idx].kind)
        break
      }
    }
  }

  return { focusedId, setFocusedId, selectedIds, selectRow, handleKeyDown }
}
