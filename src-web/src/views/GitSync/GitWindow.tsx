import { useEffect } from "react"
import { Toast } from "@/layout/Toast"
import "@/store/interface"
import { GitSync } from "."

/**
 * Standalone Source Control window (label `git-<workspaceId>`). It loads only
 * the stores the git view needs, without the main window's tool/resize plumbing.
 */
export function GitWindow({ workspaceId }: { workspaceId: string | null }) {
  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    Promise.all([
      import("@/store/git"),
      import("@/store/requests"),
      import("@/store/environment"),
      import("@/store/cookies"),
    ]).then(([git, requests, environment, cookies]) => {
      if (cancelled) return
      const params = new URLSearchParams(window.location.search)
      const view = params.get("view")
      git.useGitStore.setState({
        showHistory: view === "history",
        historyPath: params.get("path"),
        historyName: params.get("name"),
      })
      git.useGitStore.getState().load(workspaceId)
      requests.useRequestStore.getState().load(workspaceId)
      environment.useEnvironmentStore.getState().load(workspaceId)
      cookies.useCookiesStore.getState().load(workspaceId)
    })
    return () => {
      cancelled = true
    }
  }, [workspaceId])

  return (
    <div className="h-screen flex flex-col bg-bg">
      <GitSync />
      <Toast />
    </div>
  )
}
