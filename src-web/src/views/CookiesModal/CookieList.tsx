import { useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { Glyph } from "@/components/Glyph"
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog"
import type { CookieJar, StoredCookie } from "@/store/cookies"
import { useCookiesStore } from "@/store/cookies"
import { CookieRow, isExpired } from "./CookieRow"
import { PlusIcon, SearchIcon } from "./icons"

interface Props {
  jar: CookieJar
  workspaceId: string
  selectedCookieId: string | null
  onSelect: (cookieId: string | null) => void
}

function makeDraft(): StoredCookie {
  const now = new Date().toISOString()
  return {
    id: "",
    domain: "example.com",
    hostOnly: true,
    path: "/",
    name: "new_cookie",
    value: "",
    valueEncrypted: false,
    secure: false,
    httpOnly: false,
    sameSite: "lax",
    expires: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function CookieList({
  jar,
  workspaceId,
  selectedCookieId,
  onSelect,
}: Props) {
  const { saveCookie, clearJar, clearExpired, deleteCookie } = useCookiesStore(
    useShallow((s) => ({
      saveCookie: s.saveCookie,
      clearJar: s.clearJar,
      clearExpired: s.clearExpired,
      deleteCookie: s.deleteCookie,
    })),
  )
  const [query, setQuery] = useState("")
  const [confirmClear, setConfirmClear] = useState(false)

  const filtered = useMemo(() => {
    if (!query) return jar.cookies
    const q = query.toLowerCase()
    return jar.cookies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.domain.toLowerCase().includes(q) ||
        c.value.toLowerCase().includes(q),
    )
  }, [jar.cookies, query])

  async function addCookie() {
    setQuery("")
    const saved = await saveCookie(workspaceId, jar.id, makeDraft()).catch(
      () => null,
    )
    if (saved) onSelect(saved.id)
  }

  const isEmpty = jar.cookies.length === 0
  const expiredCount = useMemo(
    () => jar.cookies.filter((c) => isExpired(c.expires)).length,
    [jar.cookies],
  )

  return (
    <>
      {/* Toolbar + count are only worth showing once there's something to
          filter — an empty jar leans entirely on the centered empty state. */}
      {!isEmpty && (
        <>
          {/* ── toolbar: search + add ── */}
          <div className="px-3 py-3 flex items-stretch gap-2.5 shrink-0">
            <label className="flex-1 h-9 px-[11px] flex items-center gap-2 bg-bg border border-border rounded-lg text-muted/70 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/20 transition-colors box-border">
              <SearchIcon />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter cookies"
                className="flex-1 h-full bg-transparent border-0 outline-none text-fg text-[0.893rem] min-w-0"
              />
            </label>
            <button
              type="button"
              onClick={addCookie}
              title="Add cookie"
              aria-label="Add cookie"
              className="w-9 h-9 inline-flex items-center justify-center bg-transparent border border-transparent rounded-lg text-accent cursor-pointer outline-none hover:bg-accent/10 hover:border-accent/40 transition-colors box-border shrink-0"
            >
              <PlusIcon />
            </button>
          </div>

          {/* ── count + clear ── */}
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 shrink-0">
            <span className="font-sans text-[0.714rem] uppercase tracking-[1.4px] text-muted/70 font-semibold">
              {filtered.length} cookie{filtered.length === 1 ? "" : "s"}
            </span>
            <div className="flex items-center gap-2">
              {expiredCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    void clearExpired(workspaceId, jar.id)
                  }}
                  title={`Remove ${expiredCount} expired cookie${expiredCount === 1 ? "" : "s"}`}
                  // Inline font-size to match the "N COOKIES" span exactly —
                  // some browsers still honor a UA-default button font even
                  // with `font: inherit`, which makes Tailwind's text utility
                  // appear larger than the sibling span.
                  style={{ fontSize: "0.714rem" }}
                  className="font-sans uppercase tracking-[1.4px] font-semibold text-error/80 hover:text-error cursor-pointer bg-transparent border-0 outline-none p-0"
                >
                  Clear expired ({expiredCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                title="Clear all cookies"
                aria-label="Clear all cookies"
                className="p-1 rounded-[3px] cursor-pointer hover:bg-subtle bg-transparent border-0 outline-none"
              >
                <Glyph kind="trash" size={13} color="var(--base08)" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── rows ── */}
      <div className="flex-1 overflow-auto px-3 pb-2.5 pt-0.5 flex flex-col gap-2">
        {filtered.map((c) => (
          <CookieRow
            key={c.id}
            cookie={c}
            active={c.id === selectedCookieId}
            onClick={() => onSelect(c.id)}
            onDelete={async () => {
              await deleteCookie(workspaceId, jar.id, c.id).catch(() => {})
              if (c.id === selectedCookieId) onSelect(null)
            }}
          />
        ))}

        {filtered.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-5 py-10 text-center text-muted/70">
            <div className="w-12 h-12 rounded-[12px] flex items-center justify-center bg-surface border border-border">
              {jar.cookies.length === 0 ? (
                <Glyph kind="cookie" size={24} color="var(--base04)" />
              ) : (
                <SearchIcon width="20" height="20" />
              )}
            </div>
            <div className="font-sans text-[0.929rem] text-muted">
              {jar.cookies.length === 0
                ? "No cookies in this jar yet"
                : "No cookies match your filter"}
            </div>
            {jar.cookies.length === 0 && (
              <button
                type="button"
                onClick={addCookie}
                className="font-sans bg-transparent border-0 cursor-pointer text-[0.893rem] text-accent p-0 outline-none hover:opacity-80"
              >
                Add your first cookie
              </button>
            )}
          </div>
        )}
      </div>

      {confirmClear && (
        <ConfirmationDialog
          title="Clear All Cookies"
          icon="warning"
          description={
            <>
              Remove every cookie from{" "}
              <span className="font-semibold">"{jar.name}"</span>?
            </>
          }
          warningText="This cannot be undone."
          onCancel={() => setConfirmClear(false)}
          onConfirm={async () => {
            await clearJar(workspaceId, jar.id).catch(() => {})
            onSelect(null)
            setConfirmClear(false)
          }}
          confirmLabel="Clear"
          confirmVariant="destructive"
        />
      )}
    </>
  )
}
