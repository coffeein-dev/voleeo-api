import type { TemplateFunctionContribution, VoleeoPlugin } from "@voleeo/plugin-api"

const templateFunctions: TemplateFunctionContribution[] = [
  {
    name: "url.encode",
    label: "URL encode",
    description:
      "Percent-encode a string for safe use in URL query params or path segments (encodeURIComponent)",
    args: [{ name: "value", label: "Value", type: "text", required: true }],
    onRender: (_ctx, args) => encodeURIComponent(args.value ?? ""),
  },
  {
    name: "url.decode",
    label: "URL decode",
    description: "Decode a percent-encoded string (decodeURIComponent)",
    args: [{ name: "value", label: "Value", type: "text", required: true }],
    onRender: (_ctx, args) => decodeURIComponent(args.value ?? ""),
  },
]

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/url",
    name: "URL Encode/Decode",
    version: "1.0.0",
    author: "Voleeo",
  },
  templateFunctions,
}
