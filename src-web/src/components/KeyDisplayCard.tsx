import { useState } from "react"
import { Glyph } from "@/components/Glyph"
import { MonoLabel } from "@/components/Primitives"

interface KeyDisplayCardProps {
  displayKey: string
}

export function KeyDisplayCard({ displayKey }: KeyDisplayCardProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(displayKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    })
  }

  return (
    <div className="border border-border rounded-[5px] bg-bg overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Glyph kind="lock" size={13} color="var(--base04)" />
        <MonoLabel size={9.5} color="var(--base04)">
          Encryption key
        </MonoLabel>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-[3px] font-mono text-[10px] text-muted hover:bg-subtle cursor-pointer border-0 bg-transparent outline-none transition-colors"
        >
          {copied ? (
            <>
              <Glyph kind="check" size={13} color="var(--base0B)" />
              <span className="text-success">Copied</span>
            </>
          ) : (
            <>
              <Glyph kind="copy" size={13} color="var(--base04)" />
              Copy
            </>
          )}
        </button>
      </div>

      <div className="px-3 py-3 flex flex-col gap-1">
        <span className="font-mono text-[11px] text-fg tracking-wider">
          {displayKey}
        </span>
      </div>
    </div>
  )
}
