import type { RequestActionContribution, VoleeoPlugin } from "@voleeo/plugin-api"
import { serializeAsFetch } from "./serialize"

const copyAsFetch: RequestActionContribution = {
  id: "copy-as-fetch",
  label: "Copy as fetch",
  glyph: "code",
  async onInvoke(ctx, request) {
    try {
      const snippet = await serializeAsFetch(request, ctx)
      await ctx.clipboard.copyText(snippet)
      ctx.toast.show({ message: "Copied fetch snippet", kind: "success" })
    } catch (e) {
      ctx.log.error("Failed to serialize fetch:", e)
      ctx.toast.show({
        message: "Failed to copy as fetch — see console",
        kind: "error",
      })
    }
  },
}

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/fetch",
    name: "Copy as fetch",
    version: "0.1.0",
    author: "Voleeo",
  },
  requestActions: [copyAsFetch],
}
