import { useEffect, useState } from "react"
import { Glyph } from "@/components/Glyph"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/error"
import { cn } from "@/lib/utils"
import { commands } from "../../../../packages/types/bindings"

interface EncryptionSectionProps {
  workspaceId: string
  encrypted: boolean
  onEncryptionChanged: () => void
}

export function EncryptionSection({
  workspaceId,
  encrypted,
  onEncryptionChanged,
}: EncryptionSectionProps) {
  const [isEncrypted, setIsEncrypted] = useState(encrypted)
  const [hasKey, setHasKey] = useState(false)

  const [keyString, setKeyString] = useState<string | null>(null)
  const [keyVisible, setKeyVisible] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [enabling, setEnabling] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)
  const [enableError, setEnableError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEncrypted) return
    commands.workspaceHasKey(workspaceId).then((res) => {
      if (res.status === "ok") setHasKey(res.data)
    })
  }, [workspaceId, isEncrypted])

  const [importValue, setImportValue] = useState("")
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importOk, setImportOk] = useState(false)

  async function loadKey(): Promise<string | null> {
    if (keyString) return keyString
    const res = await commands.workspaceGetKeyDisplay(workspaceId)
    if (res.status === "ok") {
      setKeyString(res.data)
      return res.data
    }
    setKeyError(
      `Encryption key not found for this workspace. Import encryption key below.`,
    )
    return null
  }

  async function handleEnable() {
    setEnabling(true)
    setEnableError(null)
    try {
      const res = await commands.workspaceEnableEncryption(workspaceId)
      if (res.status === "ok") {
        setKeyString(res.data)
        setKeyVisible(true)
        setIsEncrypted(true)
        setHasKey(true)
        onEncryptionChanged()
      } else {
        setEnableError(errorMessage(res.error))
      }
    } finally {
      setEnabling(false)
    }
  }

  async function handleToggleReveal() {
    setKeyError(null)
    if (keyVisible) {
      setKeyVisible(false)
      return
    }
    const key = await loadKey()
    if (key) setKeyVisible(true)
  }

  async function handleCopyKey() {
    setKeyError(null)
    const key = keyString ?? (await loadKey())
    if (!key) return
    navigator.clipboard.writeText(key).then(() => {
      setKeyCopied(true)
      setTimeout(() => setKeyCopied(false), 1800)
    })
  }

  async function handleImport() {
    setImporting(true)
    setImportError(null)
    setImportOk(false)
    try {
      const res = await commands.workspaceImportKey(workspaceId, importValue)
      if (res.status === "ok") {
        setImportOk(true)
        setHasKey(true)
        setImportValue("")
        setKeyString(null)
        setKeyVisible(false)
        setKeyError(null)
        setTimeout(() => setImportOk(false), 3000)
      } else {
        setImportError(errorMessage(res.error))
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Glyph kind="lock" size={13} color="var(--base04)" />
        <span className="font-sans text-[0.929rem] font-semibold text-fg flex-1">
          Encryption
        </span>
        <span
          className={cn(
            "text-[0.643rem] px-1.5 py-0.5 rounded-[3px] border",
            isEncrypted
              ? "border-success text-success"
              : "border-border text-muted",
          )}
        >
          {isEncrypted ? "Enabled" : "Disabled"}
        </span>
      </div>

      {isEncrypted ? (
        <>
          {hasKey && (
            <>
              <div className="border border-border rounded-[5px] bg-bg overflow-hidden">
                <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                  <span className="font-sans text-[0.857rem] font-semibold text-accent flex-1">
                    Encryption key
                  </span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      title="Copy encryption key"
                      className="p-1.5 cursor-pointer hover:bg-subtle bg-transparent border-0 outline-none rounded-[3px] transition-colors"
                    >
                      {keyCopied ? (
                        <Glyph kind="check" size={13} color="var(--base0B)" />
                      ) : (
                        <Glyph kind="copy" size={13} color="var(--base04)" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleReveal}
                      title={keyVisible ? "Hide key" : "Reveal key"}
                      className="p-1.5 cursor-pointer hover:bg-subtle bg-transparent border-0 outline-none rounded-[3px] transition-colors"
                    >
                      <Glyph
                        kind={keyVisible ? "hide" : "view"}
                        size={13}
                        color="var(--base04)"
                      />
                    </button>
                  </div>
                </div>

                <div className="px-3 pb-2.5">
                  <input
                    readOnly
                    type={keyVisible ? "text" : "password"}
                    value={keyString ?? "placeholder-key-for-masking-dots"}
                    className="w-full font-mono text-[0.786rem] text-fg bg-transparent border-0 outline-none select-text"
                  />
                </div>
              </div>

              {keyError && (
                <div className="text-[0.786rem] text-error border border-error/50 rounded-[4px] px-2.5 py-1.5 leading-relaxed">
                  {keyError}
                </div>
              )}

              <div className="w-full text-left rounded-md border border-success/40 bg-success/10 p-3 flex gap-3 items-start">
                <Glyph kind="key" size={24} color="var(--base0B)" />
                <div className="text-[0.8rem] text-fg">
                  <strong className="text-success">
                    Store your key somewhere safe
                  </strong>{" "}
                  <br />
                  If your keychain is cleared or you migrate to a new machine,
                  this backup is the only way to decrypt your stored secrets.
                </div>
              </div>
            </>
          )}

          {!hasKey && (
            <div className="border border-border rounded-[5px] p-3.5 flex flex-col gap-2.5 bg-bg">
              <div className="flex items-center gap-1.5">
                <Glyph kind="import" size={13} color="var(--base04)" />
                <span className="font-sans text-[0.857rem] font-semibold text-fg">
                  Import encryption key
                </span>
              </div>
              <p className="text-[0.714rem] text-muted leading-relaxed">
                Restore keychain access after a migration or system reinstall by
                pasting your previously saved encryption key.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importValue}
                  onChange={(e) => setImportValue(e.target.value)}
                  placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-…"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 min-w-0 px-[11px] py-[7px] border border-border rounded-[4px] bg-surface font-mono text-[0.714rem] text-fg outline-none select-text placeholder:text-muted focus:border-accent transition-colors"
                />
                <Button
                  variant="outline"
                  onClick={handleImport}
                  disabled={!importValue.trim() || importing}
                  className="cursor-pointer shrink-0 gap-1.5 border-border text-fg hover:bg-subtle"
                >
                  {importing ? (
                    <>
                      <Spinner className="size-3 shrink-0" />
                      Importing
                    </>
                  ) : (
                    "Import"
                  )}
                </Button>
              </div>
              {importError && (
                <div className="text-[0.786rem] text-error border border-error/50 rounded-[3px] px-2.5 py-1.5">
                  {importError}
                </div>
              )}
              {importOk && (
                <div className="text-[0.786rem] text-success border border-[var(--base0B)]/50 rounded-[3px] px-2.5 py-1.5">
                  Key imported successfully.
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="border border-border rounded-[5px] p-4 flex flex-col gap-3">
          <p className="font-sans text-[0.857rem] text-muted leading-relaxed">
            Sensitive values stored in this workspace are encrypted at rest
            using <span className="text-fg font-medium">AES-256-GCM</span>.
            <br />
            The key lives in your OS keychain, with an encryption key you can
            save externally.
          </p>
          {enableError && (
            <div className="text-[0.786rem] text-error border border-error/50 rounded-[3px] px-2.5 py-1.5">
              {enableError}
            </div>
          )}
          <Button
            onClick={handleEnable}
            disabled={enabling}
            className="cursor-pointer self-start gap-2"
          >
            {enabling ? (
              <>
                <Spinner className="size-3.5 shrink-0" />
                Enabling
              </>
            ) : (
              <>
                <Glyph kind="lock" size={13} color="var(--base00)" />
                Enable encryption
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
