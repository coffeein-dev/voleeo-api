import type { AuthConfig, RequestParameter } from "@/store/requests"

export type WsTab = "params" | "headers" | "message" | "auth"

/** JSX for each WS pane tab label (count badges, configured dot). */
export function wsTabLabel(
  t: WsTab,
  ctx: {
    paramCounts: { enabled: number; total: number } | null
    headers: RequestParameter[] | null | undefined
    auth: AuthConfig
  },
): React.ReactNode {
  if (t === "params") {
    if (!ctx.paramCounts || ctx.paramCounts.total === 0) return "PARAMS"
    return (
      <>
        PARAMS{" "}
        <span className="font-normal opacity-40 tracking-normal">
          {ctx.paramCounts.enabled}/{ctx.paramCounts.total}
        </span>
      </>
    )
  }
  if (t === "headers") {
    const hdrAll = (ctx.headers ?? []).filter((h) => h.name.trim())
    if (hdrAll.length === 0) return "HEADERS"
    const enabled = hdrAll.filter((h) => h.enabled).length
    return (
      <>
        HEADERS{" "}
        <span className="font-normal opacity-40 tracking-normal">
          {enabled}/{hdrAll.length}
        </span>
      </>
    )
  }
  if (t === "auth" && ctx.auth.kind !== "none") {
    return (
      <span className="inline-flex items-center gap-1">
        AUTH
        <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
      </span>
    )
  }
  return t.toUpperCase()
}
