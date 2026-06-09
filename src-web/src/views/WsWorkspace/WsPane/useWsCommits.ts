import { useCallback } from "react"
import type {
  AuthConfig,
  RequestParameter,
  WsConnection,
} from "@/store/requests"
import { useRequestStore } from "@/store/requests"
import type { ParamsCommit } from "@/views/ApiWorkspace/ParamsTab/paramsCommit"

interface ConnectionPatch {
  url?: string
  parameters?: RequestParameter[]
  headers?: RequestParameter[]
  auth?: AuthConfig
}

export function useWsCommits(
  workspaceId: string,
  connection: WsConnection | null,
) {
  const updateConnection = useRequestStore((s) => s.updateConnection)

  const commit = useCallback(
    async (patch: ConnectionPatch) => {
      if (!workspaceId || !connection) return
      await updateConnection(workspaceId, connection.id, {
        url: patch.url ?? connection.url,
        parameters: patch.parameters ?? connection.parameters ?? [],
        headers: patch.headers ?? connection.headers ?? [],
        auth: patch.auth ?? connection.auth ?? { kind: "none" },
      })
    },
    [workspaceId, connection, updateConnection],
  )

  const commitUrl = useCallback(
    (url: string) => {
      if (connection && url !== connection.url) void commit({ url })
    },
    [connection, commit],
  )

  const commitHeaders = useCallback(
    (headers: RequestParameter[]) => commit({ headers }),
    [commit],
  )

  const commitAuth = useCallback(
    (auth: AuthConfig) => commit({ auth }),
    [commit],
  )

  // ParamsTab-shaped signature: full parameters array, optional URL override.
  const commitParams = useCallback<ParamsCommit>(
    async (parameters, opts) =>
      commit({ parameters, url: opts?.url ?? connection?.url }),
    [commit, connection?.url],
  )

  return { commitUrl, commitHeaders, commitAuth, commitParams }
}
