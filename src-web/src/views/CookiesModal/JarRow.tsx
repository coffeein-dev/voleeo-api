import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { Glyph } from "@/components/Glyph"
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog"
import { cn } from "@/lib/utils"
import type { CookieJar } from "@/store/cookies"
import { useCookiesStore } from "@/store/cookies"

interface Props {
  jar: CookieJar
  isSelected: boolean
  isActive: boolean
  isDefault: boolean
  isOnly: boolean
  workspaceId: string
  onSelect: () => void
  onDeleted: () => void
}

export function JarRow({
  jar,
  isSelected,
  isActive,
  isDefault,
  isOnly,
  workspaceId,
  onSelect,
  onDeleted,
}: Props) {
  const { renameJar, deleteJar, setActive } = useCookiesStore(
    useShallow((s) => ({
      renameJar: s.renameJar,
      deleteJar: s.deleteJar,
      setActive: s.setActive,
    })),
  )
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(jar.name)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function commitRename() {
    const trimmed = draftName.trim()
    setEditing(false)
    if (!trimmed || trimmed === jar.name) {
      setDraftName(jar.name)
      return
    }
    await renameJar(workspaceId, jar.id, trimmed).catch(() => {
      setDraftName(jar.name)
    })
  }

  async function confirmDelete() {
    await deleteJar(workspaceId, jar.id).catch(() => {})
    onDeleted()
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === "Enter" && onSelect()}
        className={cn(
          "group flex items-center gap-2 mx-2 px-2 py-[6px] rounded-md cursor-pointer transition-colors w-[calc(100%-16px)]",
          isSelected ? "bg-accent/10" : "bg-transparent hover:bg-subtle",
        )}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!isActive) setActive(workspaceId, jar.id).catch(() => {})
          }}
          title={isActive ? "Active jar" : "Set as active"}
          className="bg-transparent border-0 outline-none cursor-pointer p-0 shrink-0 flex items-center"
        >
          <Glyph
            kind="cookie"
            size={13}
            color={isActive ? "var(--base0D)" : "var(--base04)"}
          />
        </button>

        {editing ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename()
              if (e.key === "Escape") {
                setDraftName(jar.name)
                setEditing(false)
              }
            }}
            onBlur={commitRename}
            onClick={(e) => e.stopPropagation()}
            className="text-[0.929rem] text-fg bg-transparent border-0 outline-none flex-1 min-w-0 select-text"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            className={cn(
              "text-[0.929rem] truncate flex-1 text-left",
              isActive
                ? "text-accent"
                : isSelected
                  ? "text-fg"
                  : "text-muted group-hover:text-fg",
            )}
          >
            {jar.name}
          </span>
        )}

        {isDefault || isOnly ? (
          <span
            title={
              isDefault
                ? "The Default jar can't be deleted"
                : "A workspace must keep at least one cookie jar"
            }
            className="flex items-center"
          >
            <Glyph
              kind="lock"
              size={11}
              color="var(--base04)"
              style={{ opacity: 0.4 }}
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setConfirmOpen(true)
            }}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 flex items-center justify-center w-4 h-4 rounded-[3px] border-0 outline-none cursor-pointer bg-transparent shrink-0 transition-opacity"
            title="Delete jar"
          >
            <Glyph kind="trash" size={12} color="var(--base08)" />
          </button>
        )}
      </div>

      {confirmOpen && (
        <ConfirmationDialog
          title="Delete Cookie Jar"
          icon="warning"
          description={
            <>
              Are you sure you want to permanently delete{" "}
              <span className="font-semibold">"{jar.name}"</span>?
            </>
          }
          warningText="All cookies in this jar will be lost."
          onCancel={() => setConfirmOpen(false)}
          onConfirm={confirmDelete}
          confirmLabel="Delete"
          confirmVariant="destructive"
        />
      )}
    </>
  )
}
