import type { AuthConfig } from "@/store/requests"
import type { BodyKind } from "../BodyTab/useBodyEditor"

/** Where a header in the snapshot came from. Drives the origin chip in the UI. */
export type HeaderOrigin =
  | { kind: "request" }
  | { kind: "folder"; folderName: string }
  | { kind: "workspace" }
  | { kind: "auth" }

export interface SentHeader {
  name: string
  value: string
  origin: HeaderOrigin
}

export interface SentCookie {
  name: string
  value: string
  domain: string
  path: string
}

export interface SentRequestSnapshot {
  capturedAt: number | null
  method: string
  fullUrl: string
  headers: SentHeader[]
  body?: { kind: BodyKind; text: string }
  cookies: SentCookie[]
  resolvedAuth: {
    kind: AuthConfig["kind"]
    summary: string
    apiKeyLocation?: "header" | "query"
    inheritedFromFolderId?: string
    inheritedFromFolderName?: string
    inheritedFromWorkspace?: boolean
  }
}
