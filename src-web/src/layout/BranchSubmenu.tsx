import { Glyph } from "@/components/Glyph"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import type { GitBranch } from "@/store/gitBranches"
import { ITEM, switchBranch } from "./gitMenu"

export function BranchSubmenu({
  workspaceId,
  branch,
  branches,
  onNewBranch,
  onRenameBranch,
}: {
  workspaceId: string
  branch: string | null
  branches: GitBranch[]
  onNewBranch: () => void
  onRenameBranch: () => void
}) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={ITEM}>
        <Glyph kind="branch" size={13} color="var(--base04)" />
        {branch ?? "Branch"}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-[180px]">
        {branches.map((b) => (
          <DropdownMenuItem
            key={b.name}
            className={ITEM}
            onClick={() => {
              if (!b.current) switchBranch(workspaceId, b.name)
            }}
          >
            <span className="w-3.5 inline-flex justify-center">
              {b.current && (
                <Glyph kind="check" size={13} color="var(--base0B)" />
              )}
            </span>
            {b.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className={ITEM} onClick={onNewBranch}>
          <Glyph kind="plus" size={13} color="var(--base04)" />
          New branch
        </DropdownMenuItem>
        {branch && (
          <DropdownMenuItem className={ITEM} onClick={onRenameBranch}>
            <Glyph kind="edit" size={13} color="var(--base04)" />
            Rename “{branch}”
          </DropdownMenuItem>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
