import type { RequestParameter } from "@/store/requests"

export type ParamsCommit = (
  parameters: RequestParameter[],
  opts?: { url?: string },
) => Promise<void>
