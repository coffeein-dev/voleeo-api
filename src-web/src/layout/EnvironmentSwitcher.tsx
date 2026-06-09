import { useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { Glyph } from "@/components/Glyph"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEnvironmentStore } from "@/store/environment"
import { useUiStore } from "@/store/workspace"
import { EnvironmentsModal } from "@/views/EnvironmentsModal"
import { ITEM } from "./gitMenu"

interface Props {
  workspaceId: string
}

export function EnvironmentSwitcher({ workspaceId }: Props) {
  const { environments, activeEnvId, setActive } = useEnvironmentStore(
    useShallow((s) => ({
      environments: s.environments,
      activeEnvId: s.activeEnvId,
      setActive: s.setActive,
    })),
  )

  const [manageOpen, setManageOpen] = useState(false)
  const pendingEnv = useUiStore((s) => s.pendingEnv)
  const clearPendingEnv = useUiStore((s) => s.clearPendingEnv)

  useEffect(() => {
    if (!pendingEnv) return
    if (pendingEnv.envId) setActive(workspaceId, pendingEnv.envId)
    setManageOpen(true)
    clearPendingEnv()
  }, [pendingEnv, clearPendingEnv, setActive, workspaceId])

  const activeEnv = environments.find((e) => e.id === activeEnvId) ?? null
  const personalEnvs = environments.filter((e) => e.kind !== "global")

  const triggerContent = (
    <>
      {activeEnv && <ColorDot color={activeEnv.color} size={10} />}
      <span className="font-sans text-[0.929rem] text-muted truncate max-w-[120px]">
        {activeEnv?.name ?? "No Environment"}
      </span>
    </>
  )

  return (
    <>
      {personalEnvs.length === 0 ? (
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-[5px] cursor-pointer bg-transparent border-0 outline-none hover:bg-subtle"
        >
          {triggerContent}
        </button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-[5px] cursor-pointer bg-transparent border-0 outline-none hover:bg-subtle data-[popup-open]:bg-subtle">
            {triggerContent}
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="min-w-[200px]">
            {personalEnvs.map((env) => (
              <DropdownMenuItem
                key={env.id}
                className={ITEM}
                onClick={() =>
                  setActive(workspaceId, env.id === activeEnvId ? null : env.id)
                }
              >
                <ColorDot color={env.color} size={10} />
                <span className="min-w-0 truncate">{env.name}</span>
                {env.id === activeEnvId && (
                  <span className="ml-auto inline-flex">
                    <Glyph kind="check" size={13} color="var(--base0B)" />
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className={ITEM}
              onClick={() => setManageOpen(true)}
            >
              <Glyph kind="settings" size={13} color="var(--base04)" />
              Manage Environments
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {manageOpen && (
        <EnvironmentsModal
          workspaceId={workspaceId}
          onClose={() => setManageOpen(false)}
        />
      )}
    </>
  )
}

function ColorDot({ color, size }: { color: string; size: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  )
}
