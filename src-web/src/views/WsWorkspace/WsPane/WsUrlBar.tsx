import { useRef } from "react"
import { Glyph } from "@/components/Glyph"
import { C_WS } from "@/components/tokens"
import { cn } from "@/lib/utils"
import { UrlInput } from "@/views/ApiWorkspace/UrlInput"

interface Props {
  urlDraft: string
  setUrlDraft: (v: string) => void
  onCommitUrl: () => void
  onUrlSend: () => void
  onVarClick: (varName: string) => void
  onToggle: () => void
  onSendMessage: () => void
  onQueryParams: (params: Array<{ key: string; value: string }>) => void
  live: boolean
  open: boolean
  sendDisabled: boolean
}
export function WsUrlBar({
  urlDraft,
  setUrlDraft,
  onCommitUrl,
  onUrlSend,
  onVarClick,
  onToggle,
  onSendMessage,
  onQueryParams,
  live,
  open,
  sendDisabled,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null)

  function focusUrlInput() {
    barRef.current?.querySelector<HTMLElement>("[contenteditable]")?.focus()
  }

  return (
    <div className="px-3.5 py-2.5 shrink-0">
      <div
        ref={barRef}
        onClick={(e) => {
          const t = e.target as HTMLElement
          if (
            !live &&
            !t.closest("[contenteditable]") &&
            !t.closest("button")
          ) {
            focusUrlInput()
          }
        }}
        className="group flex items-center border border-border rounded-[5px] bg-surface overflow-hidden cursor-text"
      >
        <span
          className="self-stretch flex items-center px-2.5 editor-font font-semibold border-r border-border shrink-0 tracking-wide"
          style={{ color: C_WS, fontSize: "0.786rem" }}
        >
          WS
        </span>
        <UrlInput
          value={urlDraft}
          disabled={live}
          onChange={setUrlDraft}
          onCommit={onCommitUrl}
          onSend={onUrlSend}
          onVarClick={onVarClick}
          onQueryParams={onQueryParams}
        />
        <button
          type="button"
          onClick={onToggle}
          title={live ? "Disconnect" : "Connect"}
          aria-label={live ? "Disconnect" : "Connect"}
          className={cn(
            "self-stretch px-2.5 flex items-center justify-center cursor-pointer bg-transparent border-0 border-l border-border outline-none shrink-0 transition-colors",
            live
              ? "text-destructive hover:bg-destructive/10"
              : "text-accent hover:bg-subtle",
          )}
        >
          <Glyph
            kind={live ? "plugs-connected" : "plugs"}
            size={14}
            color="currentColor"
          />
        </button>
        {open && (
          <button
            type="button"
            onClick={onSendMessage}
            disabled={sendDisabled}
            title="Send message (⌘↵)"
            aria-label="Send message"
            className="self-stretch px-2.5 flex items-center justify-center cursor-pointer bg-transparent border-0 border-l border-border outline-none shrink-0 transition-colors text-accent hover:bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Glyph kind="send-right" size={14} color="currentColor" />
          </button>
        )}
      </div>
    </div>
  )
}
