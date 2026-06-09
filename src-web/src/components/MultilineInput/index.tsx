import {
  TemplateInput,
  type TemplateInputProps,
} from "@/components/TemplateInput"
import { cn } from "@/lib/utils"

export type MultilineInputProps = Omit<TemplateInputProps, "multiline">

/**
 * Textarea-shaped template input.
 *
 * Same chip-as-atom selection and `{{ … }}` autosuggestion as `UrlInput` and
 * the single-line `TemplateInput`, but wraps + preserves newlines so users
 * can compose multi-line values (cookie value, request body, …).
 *
 * Enter inserts a real `\n`; `onCommit` fires on blur. Pass `min-h-*`
 * through `className` to set the visible baseline height.
 */
export function MultilineInput({ className, ...rest }: MultilineInputProps) {
  return (
    <TemplateInput
      {...rest}
      multiline
      className={cn("block w-full overflow-auto", className)}
    />
  )
}
