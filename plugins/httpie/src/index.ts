import type { RequestActionContribution, VoleeoPlugin } from "@voleeo/plugin-api"
import { serializeAsHttpie } from "./serialize"

const copyAsHttpie: RequestActionContribution = {
  id: "copy-as-httpie",
  label: "Copy as HTTPie",
  glyph: "terminal",
  async onInvoke(ctx, request) {
    try {
      const snippet = await serializeAsHttpie(request, ctx)
      await ctx.clipboard.copyText(snippet)
      ctx.toast.show({ message: "Copied HTTPie command", kind: "success" })
    } catch (e) {
      ctx.log.error("Failed to serialize HTTPie:", e)
      ctx.toast.show({
        message: "Failed to copy as HTTPie — see console",
        kind: "error",
      })
    }
  },
}

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/httpie",
    name: "Copy as HTTPie",
    version: "0.1.0",
    author: "Voleeo",
  },
  requestActions: [copyAsHttpie],
}
