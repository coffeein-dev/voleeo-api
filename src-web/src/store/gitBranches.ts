import { errorMessage } from "@/lib/error"
import type { GitBranch } from "../../../packages/types/bindings"
import { commands } from "../../../packages/types/bindings"
import { useGitStore } from "./git"
import { reloadEverywhere } from "./gitReview"

export type { GitBranch }

async function unwrap<T>(
  p: Promise<{ status: "ok"; data: T } | { status: "error"; error: unknown }>,
): Promise<T> {
  const res = await p
  if (res.status === "ok") return res.data
  throw new Error(errorMessage(res.error as never))
}

export function listBranches(workspaceId: string): Promise<GitBranch[]> {
  return unwrap(commands.gitBranches(workspaceId))
}

/** Switch branches, then reload requests (files changed) and git state. */
export async function checkoutBranch(
  workspaceId: string,
  branch: string,
): Promise<void> {
  await unwrap(commands.gitCheckout(workspaceId, branch))
  await reloadEverywhere()
  await useGitStore.getState().load(workspaceId)
}

/** Create a branch at HEAD and switch to it, then refresh git state. */
export async function createGitBranch(
  workspaceId: string,
  name: string,
): Promise<void> {
  await unwrap(commands.gitCreateBranch(workspaceId, name))
  await useGitStore.getState().load(workspaceId)
}

/** Rename a local branch (e.g. the current one), then refresh git state. */
export async function renameGitBranch(
  workspaceId: string,
  oldName: string,
  newName: string,
): Promise<void> {
  await unwrap(commands.gitRenameBranch(workspaceId, oldName, newName))
  await useGitStore.getState().load(workspaceId)
}
