import { ConnectionRow } from "./ConnectionRow"
import { FolderRow } from "./FolderRow"
import { RequestRow } from "./RequestRow"
import type { RowProps } from "./shared"

export function Row(props: RowProps) {
  if (props.node.kind === "folder")
    return <FolderRow {...props} node={props.node} />
  if (props.node.kind === "websocket")
    return <ConnectionRow {...props} node={props.node} />
  return <RequestRow {...props} node={props.node} />
}
