import { methodColor } from "@/components/tokens"

export function MethodPill({ method }: { method: string }) {
  const c = methodColor(method)
  return (
    <span
      className="editor-font font-bold text-[0.786rem] tracking-[0.2px] rounded-[5px] px-[7px] py-[2px] shrink-0"
      style={{
        color: c,
        background: `color-mix(in oklch, ${c} 14%, var(--base00))`,
        border: `1px solid color-mix(in oklch, ${c} 30%, var(--base00))`,
      }}
    >
      {method.toUpperCase()}
    </span>
  )
}
