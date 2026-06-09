import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useShallow } from "zustand/react/shallow"
import {
  Autocomplete,
  type AutocompleteItem,
  buildItems,
} from "@/components/TemplateInput/Autocomplete"
import { serialize } from "@/lib/template"
import { useTemplateFunctions } from "@/plugins/hooks"
import type { Environment, EnvironmentVariable } from "@/store/environment"
import {
  useEnvironmentStore,
  useEnvironmentStore as useEnvStore,
} from "@/store/environment"

function serializeVars(variables: EnvironmentVariable[]): string {
  return variables
    .map((v) => {
      const val = v.encrypted ? `{{ encrypt(value="${v.value}") }}` : v.value
      return `${v.key}=${val}`
    })
    .join("\n")
}

function parse(
  text: string,
  original: EnvironmentVariable[],
): EnvironmentVariable[] {
  const origMap = new Map(original.map((v) => [v.key, v]))
  const result: EnvironmentVariable[] = []
  for (const line of text.split("\n")) {
    const eqIdx = line.indexOf("=")
    if (eqIdx < 1) continue
    const key = line.slice(0, eqIdx).trim()
    const rawVal = line.slice(eqIdx + 1)
    // Match {{ encrypt(value="...") }} — the standard template form for encrypted vars.
    // Note: values containing double-quote characters are not supported in this
    // syntax. Use the grid editor (Variables tab) for secrets with special chars.
    const encryptMatch = rawVal.match(
      /^\{\{\s*encrypt\(value="([^"]*)"\)\s*\}\}$/,
    )
    const encrypted = Boolean(encryptMatch)
    const value = encryptMatch ? encryptMatch[1] : rawVal
    result.push({
      key,
      value,
      encrypted: encrypted || (origMap.get(key)?.encrypted ?? false),
      enabled: origMap.get(key)?.enabled ?? true,
    })
  }
  return result
}

/** Returns the caret pixel rect inside a textarea using a shadow element. */
function getTextareaCaretRect(textarea: HTMLTextAreaElement): DOMRect {
  const mirror = document.createElement("div")
  const style = window.getComputedStyle(textarea)
  const copyProps = [
    "fontFamily",
    "fontSize",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "width",
    "wordWrap",
    "whiteSpace",
    "overflowWrap",
  ] as const
  for (const prop of copyProps) {
    mirror.style.setProperty(prop, style.getPropertyValue(prop))
  }
  mirror.style.position = "absolute"
  mirror.style.top = "0"
  mirror.style.left = "0"
  mirror.style.visibility = "hidden"
  mirror.style.overflow = "hidden"
  mirror.style.height = "0"
  mirror.style.whiteSpace = "pre-wrap"

  const beforeCaret = textarea.value.slice(0, textarea.selectionStart ?? 0)
  const textNode = document.createTextNode(beforeCaret)
  const caretSpan = document.createElement("span")
  caretSpan.textContent = "|"
  mirror.appendChild(textNode)
  mirror.appendChild(caretSpan)

  document.body.appendChild(mirror)
  const taRect = textarea.getBoundingClientRect()
  const spanRect = caretSpan.getBoundingClientRect()
  const mirrorRect = mirror.getBoundingClientRect()
  document.body.removeChild(mirror)

  // The mirror is at (0,0); offset by the textarea's position and scroll.
  const top = taRect.top + (spanRect.top - mirrorRect.top) - textarea.scrollTop
  const left =
    taRect.left + (spanRect.left - mirrorRect.left) - textarea.scrollLeft
  return new DOMRect(left, top, 0, Number.parseFloat(style.lineHeight) || 16)
}

interface Props {
  env: Environment
}

export function TextEditor({ env }: Props) {
  const { update } = useEnvStore()
  const [text, setText] = useState(() => serializeVars(env.variables))

  // Reset when env selection changes.
  const prevEnvIdRef = useRef(env.id)
  if (env.id !== prevEnvIdRef.current) {
    prevEnvIdRef.current = env.id
    // Synchronous state update during render — React re-renders immediately.
    setText(serializeVars(env.variables))
  }

  // Sync text when env is updated externally (e.g. by an MCP client) while
  // the same env is selected. TextEditor saves on blur (not debounced), so
  // there is no pending-write race to guard against.
  useEffect(() => {
    setText(serializeVars(env.variables))
  }, [env.variables])

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [acItems, setAcItems] = useState<AutocompleteItem[]>([])
  const [acIdx, setAcIdx] = useState(0)
  const [acOpen, setAcOpen] = useState(false)
  const [acPartialStart, setAcPartialStart] = useState(0)
  const [acNsFilter, setAcNsFilter] = useState<string | null>(null)
  const [acQuery, setAcQuery] = useState("")
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const { environments, activeEnvId } = useEnvironmentStore(
    useShallow((s) => ({
      environments: s.environments,
      activeEnvId: s.activeEnvId,
    })),
  )
  const activeVars = useMemo(() => {
    const globalVars =
      environments
        .find((e) => e.kind === "global")
        ?.variables.filter((v) => v.enabled) ?? []
    const personalVars =
      environments
        .find((e) => e.id === activeEnvId)
        ?.variables.filter((v) => v.enabled) ?? []
    const personalKeys = new Set(personalVars.map((v) => v.key))
    return [
      ...personalVars,
      ...globalVars.filter((v) => !personalKeys.has(v.key)),
    ]
  }, [environments, activeEnvId])

  const fns = useTemplateFunctions()

  function getPartialExpr(
    val: string,
    caretPos: number,
  ): { query: string; startPos: number } | null {
    const before = val.slice(0, caretPos)
    const openIdx = before.lastIndexOf("{{")
    if (openIdx === -1 || before.slice(openIdx).includes("}}")) return null
    const query = before.slice(openIdx + 2).trimStart()
    return { query, startPos: openIdx }
  }

  function openAutocomplete(
    query: string,
    partialStart: number,
    nsFilter: string | null = null,
  ) {
    const ta = textareaRef.current
    if (!ta) return
    const rect = getTextareaCaretRect(ta)
    setAnchorRect(rect)
    const items = buildItems(
      query,
      activeVars.map((v) => v.key),
      fns,
      nsFilter,
    )
    setAcItems(items)
    setAcIdx(0)
    setAcPartialStart(partialStart)
    setAcNsFilter(nsFilter)
    setAcQuery(query)
    setAcOpen(items.length > 0)
  }

  function closeAutocomplete() {
    setAcOpen(false)
    setAcNsFilter(null)
    setAcQuery("")
  }

  function insertToken(storedToken: string) {
    const ta = textareaRef.current
    if (!ta) return
    const caret = ta.selectionStart ?? 0
    const before = ta.value.slice(0, acPartialStart)
    const after = ta.value.slice(caret)
    const newText = before + storedToken + after
    setText(newText)
    // Restore caret after the inserted token.
    const newCaret = acPartialStart + storedToken.length
    // Use requestAnimationFrame so the state update flushes first.
    requestAnimationFrame(() => {
      ta.setSelectionRange(newCaret, newCaret)
      ta.focus()
    })
    closeAutocomplete()
  }

  function selectItem(item: AutocompleteItem) {
    if (item.kind === "namespace") {
      // Narrow the list to this namespace without inserting.
      const ta = textareaRef.current
      if (!ta) return
      const caret = ta.selectionStart ?? 0
      const before = ta.value.slice(0, acPartialStart)
      const after = ta.value.slice(caret)
      const insertText = `{{ ${item.prefix}.`
      const newText = before + insertText + after
      setText(newText)
      const newCaret = acPartialStart + insertText.length
      requestAnimationFrame(() => {
        ta.setSelectionRange(newCaret, newCaret)
        ta.focus()
      })
      openAutocomplete("", acPartialStart, item.prefix)
      return
    }
    if (item.kind === "var") {
      insertToken(serialize([{ kind: "var", name: item.name }]))
      return
    }
    // func — insert immediately (no modal in text view; users can edit the text directly)
    if (item.kind !== "func") return
    const argStr = (item.fn.args ?? [])
      .map((a) => `${a.name}="${a.defaultValue ?? ""}"`)
      .join(", ")
    insertToken(
      argStr ? `{{ ${item.fn.name}(${argStr}) }}` : `{{ ${item.fn.name}() }}`,
    )
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setText(val)
    const caret = e.target.selectionStart ?? val.length
    const partial = getPartialExpr(val, caret)
    if (partial) {
      const dotIdx = partial.query.indexOf(".")
      const nsFilter =
        acNsFilter ?? (dotIdx !== -1 ? partial.query.slice(0, dotIdx) : null)
      openAutocomplete(partial.query, partial.startPos, nsFilter)
    } else {
      closeAutocomplete()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl+Space: open autocomplete at caret.
    if (e.ctrlKey && e.code === "Space") {
      e.preventDefault()
      const ta = e.currentTarget
      const caret = ta.selectionStart ?? 0
      const partial = getPartialExpr(ta.value, caret)
      if (partial) {
        openAutocomplete(partial.query, partial.startPos, null)
      } else {
        openAutocomplete("", caret, null)
      }
      return
    }

    if (acOpen) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setAcIdx((i) => Math.min(i + 1, acItems.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setAcIdx((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === "Tab" || (e.key === "Enter" && acOpen)) {
        e.preventDefault()
        const item = acItems[acIdx]
        if (item) selectItem(item)
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        closeAutocomplete()
        return
      }
    }
  }

  async function handleBlur() {
    const parsed = parse(text, env.variables)
    await update({ ...env, variables: parsed }).catch(() => {})
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <span className="font-sans text-[0.857rem] text-muted mb-2">
        One variable per line:{" "}
        <code className="font-mono text-[0.786rem] text-fg/70">KEY=value</code>{" "}
        or{" "}
        <code className="font-mono text-[0.786rem] text-fg/70">
          {'KEY={{ encrypt(value="secret") }}'}
        </code>{" "}
        for encrypted variables (values with{" "}
        <code className="font-mono text-[0.786rem] text-fg/70">"</code> must use
        the Variables tab). Use{" "}
        <code className="font-mono text-[0.786rem] text-fg/70">
          {"{{ expr }}"}
        </code>{" "}
        for template expressions (Ctrl+Space for autocomplete).
      </span>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        spellCheck={false}
        className="flex-1 min-h-[200px] font-mono text-[0.929rem] text-fg bg-bg border border-border rounded-[5px] p-3 outline-none focus:border-accent resize-none select-text leading-relaxed"
        placeholder={
          'API_URL=https://api.example.com\nSECRET_KEY={{ encrypt(value="my-secret") }}'
        }
      />

      {acOpen &&
        anchorRect &&
        acItems.length > 0 &&
        createPortal(
          <Autocomplete
            items={acItems}
            selectedIndex={acIdx}
            anchorRect={anchorRect}
            query={acQuery}
            onSelect={selectItem}
            onClose={closeAutocomplete}
          />,
          document.body,
        )}
    </div>
  )
}
