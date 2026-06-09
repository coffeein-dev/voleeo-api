import { type CurlRequest, formatCurl } from "@voleeo/curl/format"
import type { SentRequestSnapshot } from "./types"

/** Adapt an already-resolved snapshot to the cURL plugin's formatter, so the
 *  inspector and "Copy as cURL" render identically. */
export function buildCurl(snapshot: SentRequestSnapshot): string {
  const req: CurlRequest = {
    method: snapshot.method.toUpperCase(),
    url: snapshot.fullUrl,
    headers: snapshot.headers.map((h) => ({ name: h.name, value: h.value })),
    body: snapshot.body?.text
      ? { kind: snapshot.body.kind, text: snapshot.body.text }
      : undefined,
    cookies: snapshot.cookies.map((c) => ({ name: c.name, value: c.value })),
  }
  return formatCurl(req)
}
