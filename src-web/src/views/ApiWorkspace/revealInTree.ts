import { getAncestorFolderIds } from "@/components/ApiRequestTree/treeUtils"
import type { ApiFolder } from "@/store/requests"
import { useTreeUiStore } from "@/store/treeUi"

/** Reveal + focus a node in the sidebar tree, exactly as a click would: expand
 *  the folders along `revealFromFolderId`'s ancestor chain, then select and
 *  focus `focusId`. For a folder, pass its own id as `revealFromFolderId`; for
 *  a request, pass its parent `folderId` (null for top-level). */
export function revealInTree(
  focusId: string,
  revealFromFolderId: string | null,
  folders: ApiFolder[],
) {
  const tree = useTreeUiStore.getState()
  tree.ensureFoldersOpen(getAncestorFolderIds(folders, revealFromFolderId))
  tree.setSelection([focusId], focusId)
  tree.setFocusedNodeId(focusId)
}
