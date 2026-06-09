import { TabItem } from "@/components/Primitives"
import type { ApiFolder, AuthConfig } from "@/store/requests"
import { AuthTypeSelect } from "../AuthTab/AuthTypeSelect"
import type { SetAuth } from "../AuthTab/useAuthEditor"
import type { FolderTab } from "./useFolderPaneHandlers"

interface Props {
  folder: ApiFolder
  activeTab: FolderTab
  auth: AuthConfig
  onTabChange: (tab: FolderTab) => void
  onAuthChange: SetAuth
}

function countLabel(label: string, enabled: number, total: number) {
  if (total === 0) return label
  return (
    <>
      {label}{" "}
      <span className="font-normal opacity-40 tracking-normal">
        {enabled}/{total}
      </span>
    </>
  )
}

export function FolderTabBar({
  folder,
  activeTab,
  auth,
  onTabChange,
  onAuthChange,
}: Props) {
  const hdrAll = (folder.headers ?? []).filter((h) => h.name.trim())
  const varAll = (folder.variables ?? []).filter((v) => v.key.trim())

  return (
    <div className="px-3.5 border-b border-border flex shrink-0">
      <TabItem
        label={countLabel(
          "HEADERS",
          hdrAll.filter((h) => h.enabled).length,
          hdrAll.length,
        )}
        active={activeTab === "headers"}
        onClick={() => onTabChange("headers")}
      />
      <TabItem
        label={
          auth.kind !== "none" ? (
            <span className="inline-flex items-center gap-1">
              AUTH
              <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
            </span>
          ) : (
            "AUTH"
          )
        }
        active={activeTab === "auth"}
        onClick={() => onTabChange("auth")}
      />
      <TabItem
        label={countLabel(
          "VARIABLES",
          varAll.filter((v) => v.enabled).length,
          varAll.length,
        )}
        active={activeTab === "variables"}
        onClick={() => onTabChange("variables")}
      />
      {activeTab === "auth" && (
        <div className="ml-auto flex items-center">
          <AuthTypeSelect auth={auth} onChange={onAuthChange} allowInherit />
        </div>
      )}
    </div>
  )
}
