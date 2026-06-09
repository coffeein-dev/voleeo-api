import type { ReactNode } from "react"
import { useEffect, useRef } from "react"
import { Glyph } from "@/components/Glyph"
import { Body, Heading } from "@/components/Primitives"
import { applyFlowWindowHeight } from "./flowUtils"

interface FlowShellProps {
  icon: string
  title: string
  description: string
  footer: ReactNode
  children: ReactNode
}

export function FlowShell({
  icon,
  title,
  description,
  footer,
  children,
}: FlowShellProps) {
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function measure() {
      const h = shellRef.current?.offsetHeight ?? 0
      if (h > 0) applyFlowWindowHeight(h)
    }

    const observer = new ResizeObserver(measure)
    if (shellRef.current) observer.observe(shellRef.current)
    measure()
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={shellRef} className="w-full flex flex-col">
      {/* Full-width header */}
      <div className="flex items-center gap-4 px-8 py-5 border-b border-border">
        <div className="w-[38px] h-[38px] rounded-[8px] border border-border bg-surface grid place-items-center shrink-0">
          <Glyph kind={icon} size={20} color="var(--base05)" />
        </div>
        <div>
          <Heading size={16}>{title}</Heading>
          <Body size={12} style={{ marginTop: 2 }}>
            {description}
          </Body>
        </div>
      </div>

      {/* Content — no height constraint, sizes to children */}
      <div className="flex flex-col items-center px-8">
        <div className="w-full max-w-[560px] py-6 flex flex-col gap-5">
          {children}
        </div>
      </div>

      {/* Full-width footer */}
      <div className="border-t border-border px-8 py-4 flex items-center">
        {footer}
      </div>
    </div>
  )
}
