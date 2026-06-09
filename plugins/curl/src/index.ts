import type { RequestActionContribution, VoleeoPlugin } from "@voleeo/plugin-api"
import { serializeAsCurl } from "./serialize"

const copyAsCurl: RequestActionContribution = {
  id: "copy-as-curl",
  label: "Copy as cURL",
  glyph: "terminal",
  async onInvoke(ctx, request) {
    try {
      const curl = await serializeAsCurl(request, ctx)
      await ctx.clipboard.copyText(curl)
      ctx.toast.show({ message: "Copied cURL command", kind: "success" })
    } catch (e) {
      ctx.log.error("Failed to serialize cURL:", e)
      ctx.toast.show({
        message: "Failed to copy as cURL — see console",
        kind: "error",
      })
    }
  },
}

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/curl",
    name: "Copy as cURL",
    version: "0.1.0",
    author: "Voleeo",
  },
  requestActions: [copyAsCurl],
}
