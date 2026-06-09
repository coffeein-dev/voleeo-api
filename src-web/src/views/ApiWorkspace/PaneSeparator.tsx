interface Props {
  dir: "col" | "row"
  onMouseDown: (e: React.MouseEvent) => void
}

/** Thin separator between panes. The element itself is the 1px visual line;
 *  an absolutely-positioned child provides the wider hit area without gaps. */
export function PaneSeparator({ dir, onMouseDown }: Props) {
  if (dir === "col") {
    return (
      <div
        onMouseDown={onMouseDown}
        className="relative w-px shrink-0 cursor-col-resize overflow-visible select-none bg-border hover:bg-accent hover:w-[3px] transition-all group"
      >
        <div className="absolute inset-y-0 -left-[4px] -right-[4px]" />
      </div>
    )
  }
  return (
    <div
      onMouseDown={onMouseDown}
      className="relative h-px w-full shrink-0 cursor-row-resize overflow-visible select-none bg-border hover:bg-accent hover:h-[3px] transition-all group"
    >
      <div className="absolute inset-x-0 -top-[4px] -bottom-[4px]" />
    </div>
  )
}
