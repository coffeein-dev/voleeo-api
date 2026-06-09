import type {
  AuthConfig,
  RequestParameter,
  WsConnection,
} from "@/store/requests"
import { useRequestStore } from "@/store/requests"

type ConnectionPatch = Partial<{
  url: string
  parameters: RequestParameter[]
  headers: RequestParameter[]
  auth: AuthConfig
}>

/** Persist a partial change to a connection, carrying its other fields through. */
export function persistConnection(
  workspaceId: string,
  connection: WsConnection,
  patch: ConnectionPatch,
) {
  void useRequestStore.getState().updateConnection(workspaceId, connection.id, {
    url: connection.url,
    parameters: connection.parameters ?? [],
    headers: connection.headers ?? [],
    auth: connection.auth ?? { kind: "none" },
    ...patch,
  })
}

export function newRowId(): string {
  return crypto.randomUUID()
}
