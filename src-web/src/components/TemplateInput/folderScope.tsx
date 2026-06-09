import { createContext, type ReactNode, useContext } from "react"

const FolderScopeContext = createContext<string | null>(null)

export function FolderScopeProvider({
  folderId,
  children,
}: {
  folderId: string | null
  children: ReactNode
}) {
  return (
    <FolderScopeContext.Provider value={folderId}>
      {children}
    </FolderScopeContext.Provider>
  )
}

export function useFolderScope(): string | null {
  return useContext(FolderScopeContext)
}
