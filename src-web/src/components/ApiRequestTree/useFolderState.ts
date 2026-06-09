import { useEffect, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useTreeUiStore } from "@/store/treeUi"

export interface FolderStateHandle {
  isFolderOpen: (id: string) => boolean
  toggleFolder: (id: string) => void
}

export function useFolderState(workspaceId: string): FolderStateHandle {
  const { initForWorkspace, isFolderOpen, toggleFolder } = useTreeUiStore(
    useShallow((s) => ({
      initForWorkspace: s.initForWorkspace,
      isFolderOpen: s.isFolderOpen,
      toggleFolder: s.toggleFolder,
    })),
  )

  useEffect(() => {
    initForWorkspace(workspaceId)
  }, [workspaceId, initForWorkspace])

  return useMemo(
    () => ({ isFolderOpen, toggleFolder }),
    [isFolderOpen, toggleFolder],
  )
}
