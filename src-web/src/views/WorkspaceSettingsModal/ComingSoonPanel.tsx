import { Heading } from "@/components/Primitives"

export function ComingSoonPanel({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Heading size={14}>{label}</Heading>
      <span className="text-[0.75rem] text-muted">Coming soon.</span>
    </div>
  )
}
