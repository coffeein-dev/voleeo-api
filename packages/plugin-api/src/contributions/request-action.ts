import type { HttpRequest } from "@voleeo/types/bindings"
import type { Context } from "../context"

/** Action that operates on a single saved HTTP request.
 *
 * Surfaces in the request-tree right-click menu and (optionally) binds a
 * keyboard shortcut when the action is focused on a request. Typical uses:
 * "Copy as cURL", "Copy as fetch", "Export to file".
 */
export interface RequestActionContribution {
  id: string
  label: string
  glyph?: string
  isEnabled?(request: HttpRequest): boolean
  onInvoke(ctx: Context, request: HttpRequest): Promise<void> | void
}
