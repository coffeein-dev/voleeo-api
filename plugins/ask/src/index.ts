import type { TemplateFunctionContribution, VoleeoPlugin } from "@voleeo/plugin-api"

interface RememberedEntry {
  value: string
  expiresAt: number | null
}

function storageKey(args: { title: string; placeholder: string }): string {
  // JSON.stringify of the tuple is collision-proof and DevTools-readable
  // unlike a delimiter-joined string, which can collide if a field contains the delimiter character.
  return `ask:${JSON.stringify([args.title, args.placeholder])}`
}

/** Humanize a millisecond duration as "5s", "4m 30s", "2h 5m", "3d 4h". */
function humanizeRemaining(ms: number): string {
  if (ms <= 0) return "0s"
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) {
    const remSec = sec % 60
    return remSec ? `${min}m ${remSec}s` : `${min}m`
  }
  const hr = Math.floor(min / 60)
  if (hr < 24) {
    const remMin = min % 60
    return remMin ? `${hr}h ${remMin}m` : `${hr}h`
  }
  const days = Math.floor(hr / 24)
  const remHr = hr % 24
  return remHr ? `${days}d ${remHr}h` : `${days}d`
}

const templateFunctions: TemplateFunctionContribution[] = [
  {
    name: "ask",
    label: "Ask value",
    description:
      "Prompt the user for a value when the request runs. Remembered answers skip the prompt until expiry.",
    previewable: false,
    previewRender: async (ctx, args) => {
      const title = args.title ?? ""
      const placeholder = args.placeholder ?? ""
      if (!title) return null
      const key = storageKey({ title, placeholder })
      const cached = await ctx.store.get<RememberedEntry>(key)
      if (!cached) return null
      if (cached.expiresAt !== null && cached.expiresAt <= Date.now()) {
        await ctx.store.delete(key)
        return null
      }
      const hint =
        cached.expiresAt === null
          ? "Remembered forever"
          : `Expires in ${humanizeRemaining(cached.expiresAt - Date.now())}`
      return { value: cached.value, hint }
    },
    args: [
      {
        name: "title",
        label: "What to ask",
        type: "text",
        placeholder: "e.g. Enter the 2FA code",
        required: true,
      },
      {
        name: "placeholder",
        label: "Placeholder",
        type: "text",
        placeholder: "hint shown in the empty input",
      },
    ],
    onRender: async (ctx, args) => {
      const title = args.title ?? ""
      const placeholder = args.placeholder ?? ""
      const key = storageKey({ title, placeholder })

      const cached = await ctx.store.get<RememberedEntry>(key)
      if (cached) {
        if (cached.expiresAt === null || cached.expiresAt > Date.now()) {
          return cached.value
        }
        // Expired — drop it so we re-prompt.
        await ctx.store.delete(key)
      }

      const result = await ctx.prompt.ask({ title, placeholder })
      if (result === null) {
        // Standard "user cancelled an async op" signal. The host's resolve
        // pipeline catches this specifically and aborts the send/query.
        throw new DOMException("prompt cancelled", "AbortError")
      }

      if (result.remember === "forever") {
        await ctx.store.set<RememberedEntry>(key, {
          value: result.value,
          expiresAt: null,
        })
      } else if (result.remember === "expire" && result.expiresInMs && result.expiresInMs > 0) {
        await ctx.store.set<RememberedEntry>(key, {
          value: result.value,
          expiresAt: Date.now() + result.expiresInMs,
        })
      }

      return result.value
    },
  },
]

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/ask",
    name: "Ask value",
    version: "1.0.0",
    author: "Voleeo",
  },
  templateFunctions,
}
