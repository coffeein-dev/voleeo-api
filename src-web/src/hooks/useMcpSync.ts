import { listen } from "@tauri-apps/api/event"
import { useEffect } from "react"
import { useCookiesStore } from "@/store/cookies"
import { useEnvironmentStore } from "@/store/environment"
import { useRequestStore } from "@/store/requests"

/** Listen for MCP mutation events and reload the affected store.
 *  Call once at app root — sets up the long-lived listeners for every domain
 *  the MCP backend can mutate (requests, environments, cookies). */
export function useMcpSync() {
  useEffect(() => {
    const unlisten1 = listen<{ workspaceId: string }>(
      "mcp:requests:changed",
      ({ payload }) => {
        if (
          payload.workspaceId === useRequestStore.getState().loadedWorkspaceId
        ) {
          useRequestStore.getState().reload()
        }
      },
    )
    const unlisten2 = listen<{ workspaceId: string }>(
      "mcp:envs:changed",
      ({ payload }) => {
        if (
          payload.workspaceId ===
          useEnvironmentStore.getState().loadedWorkspaceId
        ) {
          useEnvironmentStore.getState().reload()
        }
      },
    )
    // Cookies: MCP `request.send` captures Set-Cookie into the active jar,
    // and `cookie.set_cookie` / `cookie.clear_jar` mutate directly. Reload so
    // the TopBar jar chip + open CookiesModal both reflect the AI's writes.
    const unlisten3 = listen<{ workspaceId: string }>(
      "mcp:cookies:changed",
      ({ payload }) => {
        if (
          payload.workspaceId === useCookiesStore.getState().loadedWorkspaceId
        ) {
          useCookiesStore.getState().reload()
        }
      },
    )
    return () => {
      unlisten1.then((f) => f())
      unlisten2.then((f) => f())
      unlisten3.then((f) => f())
    }
  }, [])
}
