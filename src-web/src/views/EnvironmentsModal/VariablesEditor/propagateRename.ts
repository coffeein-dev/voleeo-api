import { serialize } from "@/lib/template"
import { useEnvironmentStore } from "@/store/environment"
import { useRequestStore } from "@/store/requests"

/**
 * When a variable key is renamed, update every stored `{{ oldKey }}` token to
 * `{{ newKey }}` across all environments in the workspace and across all
 * request URLs (query params are embedded in the URL string).
 *
 * Pass `skipEnvId` to exclude the env being actively edited — its local state
 * is handled by VariablesEditor directly, avoiding a race between the debounced
 * Tauri save and this update.
 */
export async function propagateVariableRename(
  workspaceId: string,
  oldKey: string,
  newKey: string,
  skipEnvId: string,
) {
  const oldToken = serialize([{ kind: "var", name: oldKey }])
  const newToken = serialize([{ kind: "var", name: newKey }])

  const { environments, update: updateEnv } = useEnvironmentStore.getState()
  for (const env of environments) {
    if (env.workspaceId !== workspaceId || env.id === skipEnvId) continue
    let changed = false
    const updatedVars = env.variables.map((v) => {
      if (v.encrypted) return v
      const next = v.value.split(oldToken).join(newToken)
      if (next !== v.value) {
        changed = true
        return { ...v, value: next }
      }
      return v
    })
    if (changed) {
      await updateEnv({ ...env, variables: updatedVars }).catch(() => {})
    }
  }

  const { requests, updateRequest } = useRequestStore.getState()
  for (const req of requests) {
    if (req.workspaceId !== workspaceId) continue
    const newUrl = req.url.split(oldToken).join(newToken)
    const newParameters = (req.parameters ?? []).map((p) => {
      const next = p.value.split(oldToken).join(newToken)
      return next !== p.value ? { ...p, value: next } : p
    })
    const newHeaders = (req.headers ?? []).map((h) => {
      const next = h.value.split(oldToken).join(newToken)
      return next !== h.value ? { ...h, value: next } : h
    })
    const urlChanged = newUrl !== req.url
    const paramsChanged = newParameters.some(
      (p, i) => p !== (req.parameters ?? [])[i],
    )
    const headersChanged = newHeaders.some(
      (h, i) => h !== (req.headers ?? [])[i],
    )
    if (urlChanged || paramsChanged || headersChanged) {
      await updateRequest(
        workspaceId,
        req.id,
        req.method,
        newUrl,
        newParameters,
        newHeaders,
      ).catch(() => {})
    }
  }
}
