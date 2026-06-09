import { open } from "@tauri-apps/plugin-dialog"
import { Glyph } from "@/components/Glyph"

interface Props {
  path: string | null
  contentType: string | null
  onChange: (path: string | null, contentType?: string | null) => void
}

function basename(p: string): string {
  return p.split(/[/\\]/).pop() || p
}

export function BinaryBody({ path, contentType, onChange }: Props) {
  async function pick() {
    const selected = await open({ directory: false, multiple: false })
    if (typeof selected === "string") onChange(selected, contentType)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-start gap-3 px-3.5 py-6">
      {path ? (
        <div className="flex flex-col items-center gap-2">
          <Glyph kind="upload" size={22} color="var(--base04)" />
          <span className="font-mono text-[0.857rem] text-fg break-all text-center max-w-[28rem]">
            {basename(path)}
          </span>
          <span className="font-mono text-[0.714rem] text-muted break-all text-center max-w-[28rem]">
            {path}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={pick}
              className="px-2.5 py-1 rounded-[3px] border border-border text-fg hover:border-fg/30 bg-transparent font-sans text-[0.786rem] cursor-pointer"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange(null, contentType)}
              className="px-2.5 py-1 rounded-[3px] border border-border text-muted hover:text-error bg-transparent font-sans text-[0.786rem] cursor-pointer flex items-center gap-1"
            >
              <Glyph kind="x" size={11} color="currentColor" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pick}
          className="flex flex-col items-center gap-2 text-muted hover:text-fg bg-transparent border border-dashed border-border rounded-[6px] px-8 py-6 cursor-pointer transition-colors"
        >
          <Glyph kind="upload" size={22} color="currentColor" />
          <span className="font-sans text-[0.857rem]">
            Choose a file to send as the request body
          </span>
        </button>
      )}
      <p className="font-sans text-[0.714rem] text-muted text-center max-w-[26rem]">
        The file is read at send time and stays on this machine.
      </p>
    </div>
  )
}
