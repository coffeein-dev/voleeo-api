import { open } from "@tauri-apps/plugin-dialog"
import { Glyph } from "@/components/Glyph"
import { TemplateInput } from "@/components/TemplateInput"
import { cn } from "@/lib/utils"
import type { BodyField } from "@/store/requests"
import { useFieldRows } from "./useFieldRows"

interface Props {
  fields: BodyField[]
  allowFiles: boolean
  onChange: (fields: BodyField[]) => void
  onVarClick: (name: string) => void
}

function basename(path: string): string {
  return path.split(/[/\\]/).pop() || path
}

export function FieldsBody({
  fields,
  allowFiles,
  onChange,
  onVarClick,
}: Props) {
  const { rows, isTrailing, patch, remove } = useFieldRows(fields, onChange)

  async function pickFile(id: string) {
    const selected = await open({ directory: false, multiple: false })
    if (typeof selected === "string") patch(id, { value: selected })
  }

  return (
    <div className="px-3.5 py-3 flex flex-col gap-1.5 overflow-auto">
      {rows.map((f, i) => {
        const trailing = isTrailing(f, i)
        const dim = !trailing && !f.enabled
        return (
          <div key={f.id} className="flex items-center gap-2">
            <button
              type="button"
              aria-label={f.enabled ? "Disable field" : "Enable field"}
              onClick={() => patch(f.id, { enabled: !f.enabled })}
              className={cn(
                "shrink-0 w-4 h-4 rounded-[3px] border flex items-center justify-center cursor-pointer transition-colors",
                trailing && "invisible",
                f.enabled
                  ? "border-accent bg-accent/15"
                  : "border-border bg-transparent",
              )}
            >
              {f.enabled && (
                <Glyph kind="check" size={10} color="var(--base0D)" />
              )}
            </button>

            <TemplateInput
              value={f.name}
              onChange={(val) => patch(f.id, { name: val })}
              onVarClick={onVarClick}
              placeholder="field_name"
              className={cn("flex-1 px-1 py-0.5", dim && "opacity-40")}
            />

            {f.isFile ? (
              <button
                type="button"
                onClick={() => pickFile(f.id)}
                title={f.value || "Choose file"}
                className={cn(
                  "flex-1 px-1.5 py-0.5 flex items-center gap-1.5 rounded-[3px] border border-border bg-transparent text-left cursor-pointer hover:border-fg/30 transition-colors min-w-0",
                  dim && "opacity-40",
                )}
              >
                <Glyph kind="upload" size={12} color="var(--base04)" />
                <span className="truncate font-mono text-[0.786rem] text-fg">
                  {f.value ? basename(f.value) : "Choose file…"}
                </span>
              </button>
            ) : (
              <TemplateInput
                value={f.value}
                onChange={(val) => patch(f.id, { value: val })}
                onVarClick={onVarClick}
                placeholder="value"
                className={cn("flex-1 px-1 py-0.5", dim && "opacity-40")}
              />
            )}

            {allowFiles && (
              <button
                type="button"
                title={f.isFile ? "Switch to text" : "Switch to file"}
                onClick={() => patch(f.id, { isFile: !f.isFile, value: "" })}
                className="shrink-0 w-5 h-5 flex items-center justify-center rounded-[3px] text-muted hover:text-fg bg-transparent border-0 cursor-pointer"
              >
                <Glyph
                  kind={f.isFile ? "code" : "file"}
                  size={13}
                  color="currentColor"
                />
              </button>
            )}

            <button
              type="button"
              aria-label="Remove field"
              onClick={() => remove(f.id)}
              className={cn(
                "shrink-0 w-5 h-5 flex items-center justify-center rounded-[3px] text-muted hover:text-error bg-transparent border-0 cursor-pointer",
                trailing && "invisible",
              )}
            >
              <Glyph kind="x" size={12} color="currentColor" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
