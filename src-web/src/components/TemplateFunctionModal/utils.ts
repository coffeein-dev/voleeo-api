import type { BoundTemplateFunction } from "@/plugins/types"

export type Arg = NonNullable<BoundTemplateFunction["args"]>[number]

/** Group consecutive args sharing the same `row` id so they render inline. */
export function groupArgsByRow(args: Arg[]): Arg[][] {
  const groups: Arg[][] = []
  for (const arg of args) {
    const last = groups[groups.length - 1]
    if (arg.row && last && last[0].row === arg.row) last.push(arg)
    else groups.push([arg])
  }
  return groups
}
