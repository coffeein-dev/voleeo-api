import type {
  TemplateFunctionContribution,
  VoleeoPlugin,
} from "@voleeo/plugin-api"

/**
 * UTF-8 → standard base64 (RFC 4648 §4).
 * `btoa` only accepts Latin-1 — go through `TextEncoder` so multi-byte
 * sequences (`é`, `北京`, emoji) survive the trip.
 */
function encodeStd(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

/** Standard base64 → UTF-8 string. `atob` returns a Latin-1 string; decode
 *  the byte view through `TextDecoder` for multi-byte fidelity. */
function decodeStd(b64: string): string {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** UTF-8 → base64url (RFC 4648 §5). Same byte mapping as standard base64
 *  but with `+`→`-`, `/`→`_`, and trailing `=` padding stripped (the
 *  conventional JWT/OAuth shape). */
function encodeUrl(text: string): string {
  return encodeStd(text)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

/** base64url → UTF-8 string. Accepts input with or without trailing `=`
 *  padding (re-pads to a multiple of 4 before delegating to `atob`). */
function decodeUrl(b64url: string): string {
  const repad = b64url + "=".repeat((4 - (b64url.length % 4)) % 4)
  return decodeStd(repad.replace(/-/g, "+").replace(/_/g, "/"))
}

const valueArg = {
  name: "value",
  label: "Value",
  type: "text" as const,
  required: true,
}

const templateFunctions: TemplateFunctionContribution[] = [
  {
    name: "base64.encode",
    label: "Base64 encode",
    description:
      "Encode UTF-8 text to standard base64 (RFC 4648 §4) — alphabet `A-Z a-z 0-9 + / =`. " +
      "Use for Basic-auth payloads, binary-as-text, anything expecting plain base64.",
    args: [valueArg],
    onRender: (_ctx, args) => encodeStd(args.value ?? ""),
  },
  {
    name: "base64.decode",
    label: "Base64 decode",
    description:
      "Decode standard base64 (RFC 4648 §4) back to UTF-8 text. " +
      "Errors on input that contains characters outside `A-Z a-z 0-9 + / =`.",
    args: [valueArg],
    onRender: (_ctx, args) => decodeStd(args.value ?? ""),
  },
  {
    name: "base64.encodeUrl",
    label: "Base64 URL-safe encode",
    description:
      "Encode UTF-8 text to URL-safe base64 / base64url (RFC 4648 §5) — alphabet `A-Z a-z 0-9 - _`, " +
      "no trailing padding. Use for JWT segments, OAuth state, query-friendly tokens. " +
      "NOTE: different from `url.encode`, which percent-encodes for URLs (`a/b` → `a%2Fb`); " +
      "this swaps the base64 alphabet so `+`/`/`/`=` don't themselves need escaping.",
    args: [valueArg],
    onRender: (_ctx, args) => encodeUrl(args.value ?? ""),
  },
  {
    name: "base64.decodeUrl",
    label: "Base64 URL-safe decode",
    description:
      "Decode URL-safe base64 / base64url (RFC 4648 §5) back to UTF-8 text. " +
      "Accepts input with or without trailing `=` padding.",
    args: [valueArg],
    onRender: (_ctx, args) => decodeUrl(args.value ?? ""),
  },
]

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/base64",
    name: "Base64 Encode/Decode",
    version: "1.0.0",
    author: "Voleeo",
  },
  templateFunctions,
}
