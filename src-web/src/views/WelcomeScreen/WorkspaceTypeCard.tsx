import { Glyph } from "@/components/Glyph"
import { cn } from "@/lib/utils"

interface WorkspaceTypeCardProps {
  icon: string
  title: string
  description: string
  onClick: () => void
}

export function WorkspaceTypeCard({
  icon,
  title,
  description,
  onClick,
}: WorkspaceTypeCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex-1 flex gap-3 items-start px-4 py-4 border border-border bg-surface rounded-[6px] cursor-pointer",
        "hover:border-accent transition-colors",
      )}
    >
      <div className="w-[34px] h-[34px] rounded-[6px] border border-border bg-bg grid place-items-center shrink-0">
        <Glyph kind={icon} size={18} color="var(--base05)" />
      </div>
      <div className="min-w-0 pt-0.5">
        <div className="font-sans text-[1rem] font-semibold text-fg leading-tight">
          {title}
        </div>
        <div className="font-sans text-[0.821rem] text-muted leading-snug mt-1">
          {description}
        </div>
      </div>
    </div>
  )
}
