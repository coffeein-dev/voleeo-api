import { Checkbox } from "@/components/ui/checkbox"

interface Props {
  allEnabled: boolean
  onChange: (enable: boolean) => void
}

export function SelectAllToggle({ allEnabled, onChange }: Props) {
  return (
    <div className="pt-4 flex justify-start">
      <label className="inline-flex w-fit items-center gap-2 cursor-pointer font-mono text-[0.714rem] text-muted hover:text-fg transition-colors">
        <Checkbox
          checked={allEnabled}
          onCheckedChange={() => onChange(!allEnabled)}
        />
        {allEnabled ? "Deselect all" : "Select all"}
      </label>
    </div>
  )
}
