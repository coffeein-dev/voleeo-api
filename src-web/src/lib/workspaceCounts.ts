import { getCachedSettings, patchSettings } from "@/lib/workspaceSettings"

export function saveItemsCount(workspaceId: string, count: number) {
  patchSettings(workspaceId, { itemsCount: count })
}

export function loadItemsCount(workspaceId: string): number | undefined {
  return getCachedSettings(workspaceId).itemsCount ?? undefined
}
