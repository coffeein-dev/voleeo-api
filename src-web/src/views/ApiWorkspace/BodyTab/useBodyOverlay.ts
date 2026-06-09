import { Prec } from "@codemirror/state"
import type { EditorView } from "@uiw/react-codemirror"
import { EditorView as CMEditorView, keymap } from "@uiw/react-codemirror"
import { useMemo, useRef, useState } from "react"
import type { AutocompleteItem } from "@/components/TemplateInput/Autocomplete"
import { buildItems } from "@/components/TemplateInput/Autocomplete"
import { serialize } from "@/lib/template"
import type { BoundTemplateFunction } from "@/plugins/types"

export interface BodyOverlayState {
  open: boolean
  items: AutocompleteItem[]
  selectedIndex: number
  anchorRect: DOMRect | null
  query: string
}

const CLOSED: BodyOverlayState = {
  open: false,
  items: [],
  selectedIndex: 0,
  anchorRect: null,
  query: "",
}

/** Manages the styled autocomplete overlay for the body CodeMirror editor. */
export function useBodyOverlay(
  varKeys: string[],
  fns: BoundTemplateFunction[],
) {
  const editorViewRef = useRef<EditorView | null>(null)
  const [state, setState] = useState<BodyOverlayState>(CLOSED)

  // Stable refs for use inside CM extensions (no stale closures).
  const stateRef = useRef(state)
  stateRef.current = state
  const varKeysRef = useRef(varKeys)
  varKeysRef.current = varKeys
  const fnsRef = useRef(fns)
  fnsRef.current = fns

  function closeFn() {
    setState(CLOSED)
  }
  const closeRef = useRef(closeFn)
  closeRef.current = closeFn

  /** Opens overlay at current cursor position. */
  function openAt(
    query: string,
    partialStart: number,
    nsFilter: string | null,
    view: EditorView,
  ) {
    const cursor = view.state.selection.main.head
    const coords = view.coordsAtPos(cursor)
    if (!coords) return
    const rect = new DOMRect(coords.left, coords.bottom, 0, 0)
    const items = buildItems(
      query,
      varKeysRef.current,
      fnsRef.current,
      nsFilter,
    )
    if (items.length === 0) {
      closeFn()
      return
    }
    setState({ open: true, items, selectedIndex: 0, anchorRect: rect, query })
    partialStartRef.current = partialStart
    nsFilterRef.current = nsFilter
  }
  const openAtRef = useRef(openAt)
  openAtRef.current = openAt

  const partialStartRef = useRef(0)
  const nsFilterRef = useRef<string | null>(null)

  // Defined before keymapExt so it can be referenced via selectItemRef.
  function selectItemInner(item: AutocompleteItem, view: EditorView | null) {
    if (!view) return
    const cursor = view.state.selection.main.head
    const start = partialStartRef.current

    if (item.kind === "namespace") {
      const insert = `{{ ${item.prefix}.`
      view.dispatch({
        changes: { from: start, to: cursor, insert },
        selection: { anchor: start + insert.length },
      })
      openAtRef.current("", start, item.prefix, view)
      return
    }

    let token: string
    if (item.kind === "var") {
      token = serialize([{ kind: "var", name: item.name }])
    } else if (item.kind === "func") {
      const fn = item.fn
      const argStr = (fn.args ?? [])
        .map((a) => `${a.name}="${a.defaultValue ?? ""}"`)
        .join(", ")
      token = argStr ? `{{ ${fn.name}(${argStr}) }}` : `{{ ${fn.name}() }}`
    } else {
      closeRef.current()
      return
    }

    view.dispatch({
      changes: { from: start, to: cursor, insert: token },
      selection: { anchor: start + token.length },
    })
    closeRef.current()
  }
  const selectItemRef = useRef(selectItemInner)
  selectItemRef.current = selectItemInner

  /** CM update listener: show/hide overlay as user types `{{ … }}`.
   *  Empty dep array is intentional — all values accessed via stable refs. */
  const updateListenerExt = useMemo(
    () =>
      CMEditorView.updateListener.of((update) => {
        if (!update.docChanged && !update.selectionSet) return
        const cursor = update.state.selection.main.head
        const before = update.state.sliceDoc(0, cursor)
        const openIdx = before.lastIndexOf("{{")
        const hasUnclosed =
          openIdx !== -1 && !before.slice(openIdx).includes("}}")
        if (!hasUnclosed) {
          closeRef.current()
          return
        }
        const q = before.slice(openIdx + 2).trimStart()
        const dotIdx = q.indexOf(".")
        const ns =
          nsFilterRef.current ?? (dotIdx !== -1 ? q.slice(0, dotIdx) : null)
        openAtRef.current(q, openIdx, ns, update.view)
      }),
    [],
  )

  /** CM keymap: arrow nav + Tab/Enter/Escape/Ctrl-Space for overlay.
   *  Empty dep array intentional — all logic goes via stable refs. */
  const keymapExt = useMemo(
    () =>
      Prec.highest(
        keymap.of([
          {
            key: "ArrowDown",
            run: () => {
              if (!stateRef.current.open) return false
              setState((s) => ({
                ...s,
                selectedIndex: Math.min(
                  s.selectedIndex + 1,
                  s.items.length - 1,
                ),
              }))
              return true
            },
          },
          {
            key: "ArrowUp",
            run: () => {
              if (!stateRef.current.open) return false
              setState((s) => ({
                ...s,
                selectedIndex: Math.max(s.selectedIndex - 1, 0),
              }))
              return true
            },
          },
          {
            key: "Tab",
            run: () => {
              if (!stateRef.current.open) return false
              const item =
                stateRef.current.items[stateRef.current.selectedIndex]
              if (item) selectItemRef.current(item, editorViewRef.current)
              return true
            },
          },
          {
            key: "Enter",
            run: () => {
              if (!stateRef.current.open) return false
              const item =
                stateRef.current.items[stateRef.current.selectedIndex]
              if (item) selectItemRef.current(item, editorViewRef.current)
              return true
            },
          },
          {
            key: "Escape",
            run: () => {
              if (!stateRef.current.open) return false
              closeRef.current()
              return true
            },
          },
          {
            key: "Ctrl-Space",
            run: (view) => {
              const cursor = view.state.selection.main.head
              const before = view.state.sliceDoc(0, cursor)
              const openIdx = before.lastIndexOf("{{")
              const hasUnclosed =
                openIdx !== -1 && !before.slice(openIdx).includes("}}")
              if (hasUnclosed) {
                const q = before.slice(openIdx + 2).trimStart()
                openAtRef.current(q, openIdx, null, view)
              } else {
                openAtRef.current("", cursor, null, view)
              }
              return true
            },
          },
        ]),
      ),
    [],
  )

  function selectItem(item: AutocompleteItem) {
    selectItemRef.current(item, editorViewRef.current)
  }

  return {
    editorViewRef,
    overlayState: state,
    updateListenerExt,
    keymapExt,
    selectItem,
    close: closeFn,
  }
}
