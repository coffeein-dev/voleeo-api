import { listen } from "@tauri-apps/api/event"
import { useEffect } from "react"
import { useRequestStore } from "@/store/requests"
import { useWebsocketStore, type WsConnStatus } from "@/store/websocket"
import type { TimelineEvent, WsMessage } from "../../../packages/types/bindings"

/** Subscribe once to the backend's `ws:*` event stream and the MCP
 *  connection-change notification. Fixed event names carry `connectionId` in the
 *  payload so a single listener per channel feeds every connection's state. */
export function useWsSync() {
  useEffect(() => {
    const unStatus = listen<{ connectionId: string; status: WsConnStatus }>(
      "ws:status",
      ({ payload }) => {
        useWebsocketStore
          .getState()
          .setStatus(payload.connectionId, payload.status)
      },
    )
    const unMessage = listen<{ connectionId: string; message: WsMessage }>(
      "ws:message",
      ({ payload }) => {
        useWebsocketStore
          .getState()
          .appendMessage(payload.connectionId, payload.message)
      },
    )
    const unTimeline = listen<{ connectionId: string; event: TimelineEvent }>(
      "ws:timeline",
      ({ payload }) => {
        useWebsocketStore
          .getState()
          .appendTimeline(payload.connectionId, payload.event)
      },
    )
    // MCP create/duplicate of a connection → reload the tree.
    const unConnections = listen<{ workspaceId: string }>(
      "mcp:connections:changed",
      ({ payload }) => {
        if (
          payload.workspaceId === useRequestStore.getState().loadedWorkspaceId
        )
          useRequestStore.getState().reload()
      },
    )
    return () => {
      unStatus.then((f) => f())
      unMessage.then((f) => f())
      unTimeline.then((f) => f())
      unConnections.then((f) => f())
    }
  }, [])
}
