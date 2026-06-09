import { formatKeyCombo, SHORTCUT_HELP } from "@/config/shortcuts"

interface Group {
  id: "shared" | "api"
  label: string
}

const GROUPS: Group[] = [
  { id: "shared", label: "Shared" },
  { id: "api", label: "API workspace" },
]

export function KeyboardPanel() {
  return (
    <section>
      <h2 className="text-[1.286rem] font-semibold mb-1 text-fg">
        Keyboard Shortcuts
      </h2>
      <p className="text-[0.929rem] text-muted mb-6">
        Quick reference for all available shortcuts.
      </p>

      <div className="flex flex-col gap-6">
        {GROUPS.map((group) => {
          const items = SHORTCUT_HELP.filter((s) => s.scope === group.id)
          if (items.length === 0) return null
          return (
            <div key={group.id}>
              <h3 className="text-[0.857rem] font-semibold uppercase tracking-[1.5px] text-muted mb-2">
                {group.label}
              </h3>
              <div className="border border-border rounded-md overflow-hidden">
                {items.map((s, i) => (
                  <div
                    key={s.description}
                    className={
                      "flex items-center justify-between gap-4 px-3 py-2.5 bg-bg" +
                      (i > 0 ? " border-t border-border" : "")
                    }
                  >
                    <span className="text-[0.929rem] text-fg">
                      {s.description}
                    </span>
                    <kbd className="shrink-0 font-mono text-[0.786rem] tracking-[0.2em] px-2 py-0.5 rounded-[4px] border border-border bg-surface text-muted">
                      {formatKeyCombo(s.combo)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
