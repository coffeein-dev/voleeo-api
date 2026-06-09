import type { RememberChoice } from "@voleeo/plugin-api"
import { useMemo } from "react"
import { TemplateFunctionModal } from "@/components/TemplateFunctionModal"
import { usePromptStore } from "@/plugins/promptStore"
import type { BoundTemplateFunction } from "@/plugins/types"

const REMEMBER_OPTIONS: Array<{ label: string; value: RememberChoice }> = [
  { label: "Never", value: "never" },
  { label: "Expire in", value: "expire" },
  { label: "Forever", value: "forever" },
]

const UNIT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "sec", value: "sec" },
  { label: "min", value: "min" },
  { label: "hour", value: "hour" },
]

const UNIT_MS: Record<string, number> = {
  sec: 1000,
  min: 60 * 1000,
  hour: 60 * 60 * 1000,
}

/** Global host for ctx.prompt.ask(...). Mounted once near the app root.
 *  Reuses TemplateFunctionModal so the runtime prompt looks identical to the
 *  function-insertion modal. */
export function PluginPromptHost() {
  const current = usePromptStore((s) => s.current)
  const resolveCurrent = usePromptStore((s) => s.resolveCurrent)

  // Synthesize a BoundTemplateFunction whose only purpose is to feed the
  // modal: a Value input, a Remember segmented control, and (when "Expire in"
  // is picked) an amount + unit pair revealed via visibleWhen.
  const fn = useMemo<BoundTemplateFunction | null>(() => {
    if (!current) return null
    const { title, defaultValue, placeholder } = current.opts
    return {
      name: title ?? "ask",
      label: "Provide a value",
      previewable: true,
      args: [
        {
          name: "value",
          label: "Value",
          type: "text",
          defaultValue,
          placeholder,
        },
        {
          name: "remember",
          label: "Remember",
          type: "buttons",
          defaultValue: "never",
          options: REMEMBER_OPTIONS,
        },
        {
          name: "expireAmount",
          label: "Expire in",
          type: "number",
          defaultValue: "1",
          min: "1",
          required: true,
          visibleWhen: { remember: "expire" },
          row: "expire",
        },
        {
          name: "expireUnit",
          type: "buttons",
          defaultValue: "min",
          options: UNIT_OPTIONS,
          visibleWhen: { remember: "expire" },
          row: "expire",
        },
      ],
      onRender: (args) => args.value ?? "",
    }
  }, [current])

  if (!current || !fn) return null

  return (
    <TemplateFunctionModal
      fn={fn}
      onInsert={(args) => {
        const remember = (args.remember ?? "never") as RememberChoice
        let expiresInMs: number | undefined
        if (remember === "expire") {
          const raw = Number.parseFloat(args.expireAmount ?? "1")
          const amount = Number.isFinite(raw) && raw > 0 ? raw : 1
          const unit = args.expireUnit ?? "min"
          const perUnit = UNIT_MS[unit] ?? UNIT_MS.min
          expiresInMs = amount * perUnit
        }
        resolveCurrent({
          value: args.value ?? "",
          remember,
          ...(expiresInMs !== undefined ? { expiresInMs } : {}),
        })
      }}
      onClose={() => resolveCurrent(null)}
      confirmLabel="OK"
      iconLabel="ask"
      hidePreview
    />
  )
}
