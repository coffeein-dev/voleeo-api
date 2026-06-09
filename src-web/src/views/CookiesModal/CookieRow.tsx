import { useMemo, useState } from "react"
import { Glyph } from "@/components/Glyph"
import { useTemplateInputData } from "@/components/TemplateInput/useTemplateInputData"
import { tokenize } from "@/lib/template"
import { cn } from "@/lib/utils"
import type { StoredCookie } from "@/store/cookies"
import { ClockIcon, GlobeIcon, LockIcon } from "./icons"

interface Props {
  cookie: StoredCookie
  active: boolean
  onClick: () => void
  onDelete: () => void
}

function formatExpiry(exp: string | null | undefined): string {
  if (!exp) return "session"
  const d = new Date(exp)
  if (Number.isNaN(d.getTime())) return exp
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function isExpired(exp: string | null | undefined): boolean {
  if (!exp) return false // session cookies don't expire on the clock
  const d = new Date(exp)
  if (Number.isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

type ChipTone = "neutral" | "secure" | "http" | "scope" | "expired"

function Chip({
  children,
  icon,
  tone = "neutral",
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  tone?: ChipTone
}) {
  // Tones map to base16 slots so chips track the active theme. Inline `style`
  // is used because the bg/fg pair is a tone-specific mix Tailwind utilities
  // don't expose directly.
  const style =
    tone === "secure"
      ? {
          background: "color-mix(in oklch, var(--base0B) 22%, transparent)",
          color: "var(--base0B)",
          borderColor: "color-mix(in oklch, var(--base0B) 38%, transparent)",
        }
      : tone === "expired"
        ? {
            background: "color-mix(in oklch, var(--base08) 22%, transparent)",
            color: "var(--base08)",
            borderColor: "color-mix(in oklch, var(--base08) 38%, transparent)",
          }
        : tone === "http"
          ? {
              background: "color-mix(in oklch, var(--base0D) 22%, transparent)",
              color: "var(--base0D)",
              borderColor:
                "color-mix(in oklch, var(--base0D) 38%, transparent)",
            }
          : tone === "scope"
            ? {
                background:
                  "color-mix(in oklch, var(--base0C) 22%, transparent)",
                color: "var(--base0C)",
                borderColor:
                  "color-mix(in oklch, var(--base0C) 38%, transparent)",
              }
            : {
                // Translucent neutral so the chip stays readable over both the
                // default surface and the selected row's `bg-accent/10` tint —
                // matches the mixing pattern used by the secure/http chips.
                background:
                  "color-mix(in oklch, var(--base04) 18%, transparent)",
                color: "var(--base05)",
                borderColor:
                  "color-mix(in oklch, var(--base04) 38%, transparent)",
              }
  return (
    <span
      style={style}
      className="inline-flex items-center gap-1 h-[19px] px-[7px] rounded-[5px] border text-[0.714rem] font-medium whitespace-nowrap"
    >
      {icon}
      {children}
    </span>
  )
}

export function CookieRow({ cookie, active, onClick, onDelete }: Props) {
  const [hover, setHover] = useState(false)
  const { activeVars } = useTemplateInputData()
  // Build a {name → resolved value} lookup once per render; renders the var
  // chip as the live env value so the user sees what will actually be sent
  // while still flagging the value as dynamic.
  const varsMap = useMemo(
    () => new Map(activeVars.map((v) => [v.key, v.value])),
    [activeVars],
  )
  const expired = isExpired(cookie.expires)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative flex flex-col gap-[7px] px-[14px] py-[11px] rounded-[9px] cursor-pointer transition-colors border",
        active
          ? "bg-accent/10 border-transparent"
          : hover
            ? "bg-subtle/60 border-border"
            : "bg-transparent border-border",
        expired && !active && "opacity-55",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete cookie"
        aria-label="Delete cookie"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 hover:!opacity-100 flex items-center justify-center w-5 h-5 rounded-[3px] border-0 outline-none cursor-pointer bg-transparent transition-opacity"
      >
        <Glyph kind="trash" size={12} color="var(--base08)" />
      </button>

      {/* name = value */}
      <div className="flex items-baseline gap-[7px] min-w-0">
        <span className="text-[0.929rem] font-semibold text-fg shrink-0">
          {cookie.name}
        </span>
        <span className="text-[0.857rem] text-muted/70">=</span>
        <span className="text-[0.857rem] text-muted truncate min-w-0">
          {!cookie.value ? (
            <em className="not-italic opacity-50">(empty)</em>
          ) : (
            <TemplatedText text={cookie.value} vars={varsMap} />
          )}
        </span>
      </div>

      {/* domain */}
      <div className="flex items-center gap-1.5 text-[0.821rem] text-muted/70 min-w-0">
        <GlobeIcon width="12" height="12" />
        <span className="truncate min-w-0">
          <TemplatedText text={cookie.domain} vars={varsMap} />
        </span>
      </div>

      {/* attribute chips */}
      <div className="flex items-center gap-[5px] flex-wrap">
        {cookie.secure && (
          <Chip tone="secure" icon={<LockIcon width="12" height="12" />}>
            Secure
          </Chip>
        )}
        {cookie.httpOnly && <Chip tone="http">HttpOnly</Chip>}
        {cookie.hostOnly && <Chip tone="scope">host-only</Chip>}
        {cookie.sameSite && <Chip>SameSite={cookie.sameSite}</Chip>}
        {expired ? (
          <Chip tone="expired" icon={<ClockIcon width="12" height="12" />}>
            Expired
          </Chip>
        ) : (
          <Chip icon={<ClockIcon width="12" height="12" />}>
            {formatExpiry(cookie.expires)}
          </Chip>
        )}
      </div>
    </div>
  )
}

/**
 * Inline renderer for cookie field text that may contain `{{ env_var }}` or
 * `{{ fn() }}` tokens. Plain segments render as-is. Env-var tokens render the
 * resolved value (from the active env) inside a globe-prefixed chip; functions
 * render `fn()` inside a wand-prefixed chip. A missing env var falls back to
 * an error-tinted chip so a stale reference is visible.
 */
function TemplatedText({
  text,
  vars,
}: {
  text: string
  vars: Map<string, string>
}) {
  const tokens = useMemo(() => tokenize(text), [text])
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.kind === "plain") {
          // biome-ignore lint/suspicious/noArrayIndexKey: token list is stable per `text` and never reordered
          return <span key={i}>{tok.text}</span>
        }
        if (tok.kind === "var") {
          const val = vars.get(tok.name)
          const found = val !== undefined
          const style = found
            ? {
                background:
                  "color-mix(in oklch, var(--base0E) 22%, transparent)",
                color: "var(--base0E)",
              }
            : {
                background:
                  "color-mix(in oklch, var(--base08) 22%, transparent)",
                color: "var(--base08)",
              }
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: tokens are stable across renders
              key={i}
              style={style}
              title={
                found
                  ? `{{ ${tok.name} }} → ${val}`
                  : `{{ ${tok.name} }} — not in active env`
              }
              className="inline-flex items-center px-1.5 py-px rounded-[3px] text-[0.786rem] align-baseline"
            >
              {found ? val : tok.name}
            </span>
          )
        }
        const hasArgs = Object.keys(tok.args).length > 0
        const display = hasArgs ? `${tok.name}(…)` : `${tok.name}()`
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens are stable across renders
            key={i}
            title={`{{ ${display} }}`}
            style={{
              background: "color-mix(in oklch, var(--base0D) 22%, transparent)",
              color: "var(--base0D)",
            }}
            className="inline-flex items-center gap-1 px-1.5 py-px rounded-[3px] text-[0.786rem] align-baseline"
          >
            <Glyph kind="wand" size={10} color="currentColor" />
            {display}
          </span>
        )
      })}
    </>
  )
}
