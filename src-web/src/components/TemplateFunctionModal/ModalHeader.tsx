import { Glyph } from "@/components/Glyph"
import type { BoundTemplateFunction } from "@/plugins/types"

interface Props {
  fn: BoundTemplateFunction
  iconLabel: string
  onClose: () => void
}

export function ModalHeader({ fn, iconLabel, onClose }: Props) {
  return (
    <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
      <span
        className="font-mono text-[0.714rem] font-bold min-w-5 h-5 px-1 flex items-center justify-center rounded-[4px] shrink-0"
        style={{
          background: "color-mix(in srgb,var(--base0D) 15%,transparent)",
          color: "var(--base0D)",
        }}
      >
        {iconLabel}
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-mono text-[0.857rem] text-fg font-semibold truncate">
          {fn.name}
        </span>
        {fn.label && (
          <span className="font-sans text-[0.786rem] text-muted truncate">
            {fn.label}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded-[3px] cursor-pointer hover:bg-subtle bg-transparent border-0 outline-none shrink-0"
      >
        <Glyph kind="x" size={13} color="var(--base04)" />
      </button>
    </div>
  )
}
