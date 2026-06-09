// This module is intentionally in-tree (not a plugin-api plugin) because it
// depends on host state: the requests store, response commands, and sendRequest.
// Third-party plugins must use ctx.* instead.

import { emit } from "@tauri-apps/api/event"
import type {
  TemplateFunctionContribution,
  VoleeoPlugin,
} from "@voleeo/plugin-api"
import { extractBody, extractHeader } from "@/lib/extract"
import type { ResolutionEvent } from "@/lib/template"
import { resolveTemplate } from "@/lib/template"
import { useEnvironmentStore } from "@/store/environment"
import { sendRequestCommand } from "@/store/http"
import { useRequestStore } from "@/store/requests"
import { useUiStore } from "@/store/workspace"
import { extractPathParams } from "@/views/ApiWorkspace/paramUtils"
import {
  clearResponseCycleCache,
  ensureResponse,
  markResolving,
  type RequestSender,
  type ResponseStrategy,
  unmarkResolving,
} from "./strategy"

export { clearResponseCycleCache }

// Pre-flight events accumulated during a resolution cycle.
// RequestPane drains this after resolveSendPayload so they appear in the timing tab.
export const pendingPreflightEvents: ResolutionEvent[] = []

function buildSender(callerName: string): RequestSender {
  return async (workspaceId, requestId) => {
    // Cycle guard here — this is the point where we actually resolve the source
    // request's URL/headers, which could itself contain response.* references.
    // Two independent onRender calls for the same requestId are fine (parallel, not nested);
    // this guard only fires when resolution of X would recursively re-enter X.
    if (!markResolving(requestId))
      throw new Error(
        `Cycle detected: "${callerName}" indirectly references itself via response.*`,
      )
    try {
      const req = useRequestStore
        .getState()
        .requests.find((r) => r.id === requestId)
      if (!req) throw new Error(`Pre-flight request failed: request not found`)

      const { environments, activeEnvId } = useEnvironmentStore.getState()
      const globalVars =
        environments
          .find((e) => e.kind === "global")
          ?.variables.filter((v) => v.enabled) ?? []
      const activeVars =
        environments
          .find((e) => e.id === activeEnvId)
          ?.variables.filter((v) => v.enabled) ?? []
      // Active env takes precedence over global (same logic as RequestPane/mergeEnvVars).
      const activeKeys = new Set(activeVars.map((v) => v.key))
      const vars = [
        ...activeVars,
        ...globalVars.filter((v) => !activeKeys.has(v.key)),
      ]

      // Template functions are resolved lazily via the registry to avoid a circular dep.
      const { registry } = await import("@/plugins/registry")
      const fns = registry.templateFunctions()

      // Substitute :param placeholders using stored parameter values before template resolution.
      const pathParamNames = extractPathParams(req.url)
      let urlWithPathParams = req.url
      for (const paramName of pathParamNames) {
        const param = (req.parameters ?? []).find(
          (p) => p.name === paramName && p.enabled !== false,
        )
        const value = param ? await resolveTemplate(param.value, vars, fns) : ""
        urlWithPathParams = urlWithPathParams.replace(
          new RegExp(`:${paramName}(?=[/?#]|$)`),
          encodeURIComponent(value),
        )
      }
      const resolvedUrl = await resolveTemplate(urlWithPathParams, vars, fns)
      const resolvedHeaders = await Promise.all(
        (req.headers ?? []).map(async (h) => ({
          ...h,
          value: await resolveTemplate(h.value, vars, fns),
        })),
      )

      const t0 = Date.now()
      // No `cookieOverrides` — chained sends use the backend's load+resolve
      // path because the function executor isn't reachable from here; env
      // vars and encrypt chips still resolve in Rust.
      const sendRes = await sendRequestCommand(workspaceId, requestId, {
        urlOverride: resolvedUrl,
        headersOverride: resolvedHeaders,
        calledFrom: callerName,
      })
      const elapsed = Date.now() - t0

      if (sendRes.status !== "ok") {
        const err = sendRes.error
        const msg = "data" in err ? String(err.data) : err.kind
        pendingPreflightEvents.push({
          label: "Pre-flight",
          source: req.name,
          result: `failed: ${msg}`,
        })
        throw new Error(`Pre-flight request failed: ${msg}`)
      }

      pendingPreflightEvents.push({
        label: "Pre-flight",
        source: req.name,
        result: `${sendRes.data.status} ${sendRes.data.statusText} (${elapsed}ms)`,
      })

      // Notify the UI so the source request's history panel refreshes.
      void emit("response:stored", { workspaceId, requestId })
    } finally {
      unmarkResolving(requestId)
    }
  }
}

const STRATEGY_DEFAULT: ResponseStrategy = "cache"
const TTL_DEFAULT = 60

const templateFunctions: TemplateFunctionContribution[] = [
  {
    name: "response.body",
    label: "Response body",
    description:
      "Use the response body of another request (plain text, JSONPath, or XPath)",
    args: [
      {
        name: "requestId",
        label: "Source request",
        type: "text",
        required: true,
      },
      {
        name: "strategy",
        label: "Execution strategy",
        type: "select",
        defaultValue: STRATEGY_DEFAULT,
        options: [
          { label: "Cache — use stored response", value: "cache" },
          { label: "Refresh after TTL", value: "refresh-after" },
          { label: "Force — always re-run", value: "force" },
        ],
      },
      {
        name: "ttl",
        label: "TTL (seconds)",
        type: "text",
        defaultValue: String(TTL_DEFAULT),
      },
      { name: "selector", label: "Selector", type: "text", defaultValue: "" },
    ],
    onRender: async (_ctx, args) => {
      const { requestId, strategy, ttl, selector } = args
      if (!requestId) throw new Error("response.body: requestId is required")

      const workspaceId = useUiStore.getState().activeWorkspaceId
      if (!workspaceId) throw new Error("response.body: no active workspace")
      const { activeRequestId, requests } = useRequestStore.getState()
      const callerName =
        requests.find((r) => r.id === activeRequestId)?.name ??
        "Unknown request"

      const stored = await ensureResponse(
        workspaceId,
        requestId,
        (strategy as ResponseStrategy) ?? STRATEGY_DEFAULT,
        ttl ? Number(ttl) : TTL_DEFAULT,
        buildSender(callerName),
      )
      return extractBody(stored.response.body, selector ?? "")
    },
  },
  {
    name: "response.header",
    label: "Response header",
    description: "Use a response header value from another request",
    args: [
      {
        name: "requestId",
        label: "Source request",
        type: "text",
        required: true,
      },
      {
        name: "strategy",
        label: "Execution strategy",
        type: "select",
        defaultValue: STRATEGY_DEFAULT,
        options: [
          { label: "Cache — use stored response", value: "cache" },
          { label: "Refresh after TTL", value: "refresh-after" },
          { label: "Force — always re-run", value: "force" },
        ],
      },
      {
        name: "ttl",
        label: "TTL (seconds)",
        type: "text",
        defaultValue: String(TTL_DEFAULT),
      },
      { name: "name", label: "Header name", type: "text", required: true },
    ],
    onRender: async (_ctx, args) => {
      const { requestId, strategy, ttl, name } = args
      if (!requestId) throw new Error("response.header: requestId is required")
      if (!name) throw new Error("response.header: name is required")

      const workspaceId = useUiStore.getState().activeWorkspaceId
      if (!workspaceId) throw new Error("response.header: no active workspace")
      const { activeRequestId, requests } = useRequestStore.getState()
      const callerName =
        requests.find((r) => r.id === activeRequestId)?.name ??
        "Unknown request"

      const stored = await ensureResponse(
        workspaceId,
        requestId,
        (strategy as ResponseStrategy) ?? STRATEGY_DEFAULT,
        ttl ? Number(ttl) : TTL_DEFAULT,
        buildSender(callerName),
      )
      return extractHeader(stored.response.headers, name)
    },
  },
]

export const responseBuiltin: VoleeoPlugin = {
  meta: {
    id: "@voleeo/builtin-response",
    name: "Response Functions",
    version: "1.0.0",
    author: "Voleeo",
  },
  templateFunctions,
}
