/** Standard "user cancelled an async op" check — matches what fetch() throws
 *  for an aborted AbortSignal. Plugins signal cancellation by throwing
 *  `new DOMException("...", "AbortError")` so the resolve pipeline can abort
 *  cleanly without inventing a custom error class. */
export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError"
}
