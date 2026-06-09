import type { CSSProperties } from "react"
import { Glyph } from "@/components/Glyph"
import type {
  FieldGroup as FG,
  FieldChange,
  FieldKind,
} from "@/lib/gitEntityDiff"
import { cn } from "@/lib/utils"
import { RV } from "../reviewClasses"
import { TemplateText } from "../TemplateText"

const KIND = {
  added: { word: "Added", color: "text-[var(--c-add)]" },
  removed: { word: "Removed", color: "text-[var(--c-del)]" },
  changed: { word: "Changed", color: "text-[var(--c-chg)]" },
} as const

const tint = (tone: string): CSSProperties => ({
  background: `color-mix(in oklch, ${tone} 12%, transparent)`,
})

const isShort = (a: string, b: string) =>
  a.length <= 22 && b.length <= 22 && !a.includes("\n") && !b.includes("\n")

const HEX = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

/** A hex color renders as a swatch + hex; everything else as template chips. */
function ValueContent({
  value,
  className,
  style,
}: {
  value: string
  className?: string
  style?: CSSProperties
}) {
  const v = value.trim()
  if (HEX.test(v)) {
    return (
      <span className={cn(className, RV.color)} style={style}>
        <span className={RV.swatch} style={{ background: v }} />
        {v}
      </span>
    )
  }
  return <TemplateText className={className} value={value} style={style} />
}

function ValueRow({
  sign,
  tone,
  text,
  del,
}: {
  sign: string
  tone: string
  text: string
  del?: boolean
}) {
  return (
    <div className={RV.vrow} style={tint(tone)}>
      <span className={RV.vsign} style={{ color: tone }}>
        {sign}
      </span>
      <ValueContent className={cn(RV.vtext, del && RV.vtextDel)} value={text} />
    </div>
  )
}

function ItemValue({ f }: { f: FieldChange }) {
  const before = f.before ?? ""
  const after = f.after ?? ""
  if (f.kind === "changed" && isShort(before, after)) {
    return (
      <div className={RV.inline}>
        <ValueContent
          className={cn(RV.chip, RV.chipDel)}
          value={before}
          style={tint("var(--c-del)")}
        />
        <span className={RV.arrow}>
          <Glyph kind="arrow" size={14} color="currentColor" />
        </span>
        <ValueContent
          className={RV.chip}
          value={after}
          style={tint("var(--c-add)")}
        />
      </div>
    )
  }
  if (f.kind === "changed") {
    return (
      <>
        <ValueRow sign="−" tone="var(--c-del)" text={before} del />
        <ValueRow sign="+" tone="var(--c-add)" text={after} />
      </>
    )
  }
  if (f.kind === "added") {
    return <ValueRow sign="+" tone="var(--c-add)" text={after} />
  }
  return <ValueRow sign="−" tone="var(--c-del)" text={before} del />
}

/** Group same-action fields under one card (one "Added" card lists every add). */
function groupByKind(items: FieldChange[]): [FieldKind, FieldChange[]][] {
  const byKind = new Map<FieldKind, FieldChange[]>()
  for (const f of items) {
    const arr = byKind.get(f.kind)
    if (arr) arr.push(f)
    else byKind.set(f.kind, [f])
  }
  return [...byKind.entries()]
}

export function FieldGroup({
  group,
  items,
  onDiscard,
}: {
  group: FG
  items: FieldChange[]
  /** Omitted for deleted entities — those can only be fully restored. */
  onDiscard?: (key: string) => void
}) {
  return (
    <div className={RV.fgroup}>
      <div className={RV.fgroupH}>
        <span className={RV.fgroupName}>{group}</span>
        <span className={RV.fgroupN}>{items.length}</span>
      </div>
      {groupByKind(items).map(([kind, fields]) => {
        const k = KIND[kind]
        const sole = fields.length === 1 ? fields[0] : null
        const headDiscardKey =
          sole && !(sole.label && sole.label !== group) ? sole.key : undefined
        return (
          <div key={kind} className={RV.change}>
            <div className={RV.changeHead}>
              <span className={cn(RV.kind, k.color)}>{k.word}</span>
              {fields.length > 1 && (
                <span className={RV.changeCount}>{fields.length}</span>
              )}
              {headDiscardKey && onDiscard && (
                <button
                  type="button"
                  className={cn(RV.itemDiscard, "ml-auto")}
                  title="Rollback this change"
                  onClick={() => onDiscard(headDiscardKey)}
                >
                  <Glyph
                    kind="arrow-counter-clockwise"
                    size={12}
                    color="currentColor"
                  />
                </button>
              )}
            </div>
            <div className={RV.changeVals}>
              {fields.map((f) => {
                const showLabel = f.label && f.label !== group
                return (
                  <div key={f.key ?? f.label ?? f.kind} className={RV.item}>
                    {showLabel && (
                      <div className={RV.itemHead}>
                        <span className={RV.changeLabel}>{f.label}</span>
                        {f.key && onDiscard && (
                          <button
                            type="button"
                            className={RV.itemDiscard}
                            title="Rollback this change"
                            onClick={() => f.key && onDiscard(f.key)}
                          >
                            <Glyph
                              kind="arrow-counter-clockwise"
                              size={12}
                              color="currentColor"
                            />
                          </button>
                        )}
                      </div>
                    )}
                    <ItemValue f={f} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
