import { useCallback, useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { inheritedFolderVars } from "@/lib/folderChain"
import { useTemplateFunctions } from "@/plugins/hooks"
import type { BoundTemplateFunction } from "@/plugins/types"
import {
  type EnvironmentVariable,
  useEnvironmentStore,
} from "@/store/environment"
import type { ApiFolder } from "@/store/requests"
import { useRequestStore } from "@/store/requests"
import { useUiStore } from "@/store/workspace"
import { useFolderScope } from "./folderScope"

// Stable empty ref so inputs with no folder scope (cookies, env modal) don't
// re-render when folders change — only folder-scoped inputs subscribe for real.
const NO_FOLDERS: ApiFolder[] = []

export interface TemplateInputData {
  activeVars: EnvironmentVariable[]
  fns: BoundTemplateFunction[]
  isEncryptionEnabled: boolean
  activeWorkspaceId: string | null
  varStatus: (name: string) => "found" | "missing"
  funcStatus: (name: string) => "ok" | "error"
}

export function useTemplateInputData(): TemplateInputData {
  const { environments, activeEnvId } = useEnvironmentStore(
    useShallow((s) => ({
      environments: s.environments,
      activeEnvId: s.activeEnvId,
    })),
  )
  // Inherited folder variables are scoped via context (FolderScopeProvider) so
  // every template input under a request/folder editor sees them automatically.
  const folderId = useFolderScope()
  const folders = useRequestStore((s) => (folderId ? s.folders : NO_FOLDERS))

  // Folder vars (nearest→root) win over personal, which wins over global.
  const activeVars = useMemo(() => {
    const globalVars =
      environments
        .find((e) => e.kind === "global")
        ?.variables.filter((v) => v.enabled) ?? []
    const personalVars =
      environments
        .find((e) => e.id === activeEnvId)
        ?.variables.filter((v) => v.enabled) ?? []
    const personalKeys = new Set(personalVars.map((v) => v.key))
    const envVars = [
      ...personalVars,
      ...globalVars.filter((v) => !personalKeys.has(v.key)),
    ]
    return folderId
      ? [...inheritedFolderVars(folderId, folders), ...envVars]
      : envVars
  }, [environments, activeEnvId, folderId, folders])

  const fns = useTemplateFunctions()

  const { isEncryptionEnabled, activeWorkspaceId } = useUiStore(
    useShallow((s) => {
      const ws = s.workspaces.find((w) => w.id === s.activeWorkspaceId)
      return {
        isEncryptionEnabled: ws?.encrypted ?? false,
        activeWorkspaceId: s.activeWorkspaceId,
      }
    }),
  )

  const varStatus = useCallback(
    (name: string): "found" | "missing" =>
      activeVars.some((v) => v.key === name) ? "found" : "missing",
    [activeVars],
  )

  const funcStatus = useCallback(
    (name: string): "ok" | "error" =>
      name === "encrypt" && !isEncryptionEnabled ? "error" : "ok",
    [isEncryptionEnabled],
  )

  return {
    activeVars,
    fns,
    isEncryptionEnabled,
    activeWorkspaceId,
    varStatus,
    funcStatus,
  }
}
