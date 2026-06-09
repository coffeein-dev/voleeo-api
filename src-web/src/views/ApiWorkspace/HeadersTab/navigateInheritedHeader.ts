import { useRequestStore } from "@/store/requests"
import { useUiStore } from "@/store/workspace"
import { revealInTree } from "../revealInTree"
import type { InheritedHeader } from "./InheritedHeaders"

export function navigateToInheritedHeader(header: InheritedHeader) {
  if (header.origin === "folder" && header.folderId) {
    const folders = useRequestStore.getState().folders
    revealInTree(header.folderId, header.folderId, folders)
    useRequestStore.getState().focusFolderHeader(header.folderId, header.name)
  } else {
    useUiStore.getState().requestWorkspaceSettings("headers", header.name)
  }
}
