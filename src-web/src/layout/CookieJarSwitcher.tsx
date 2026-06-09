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
import { useCookiesStore } from "@/store/cookies"
import { useUiStore } from "@/store/workspace"
import { CookiesModal } from "@/views/CookiesModal"
import { ITEM } from "./gitMenu"

interface Props {
  workspaceId: string
}

export function CookieJarSwitcher({ workspaceId }: Props) {
  const { jars, activeJarId, setActive } = useCookiesStore(
    useShallow((s) => ({
      jars: s.jars,
      activeJarId: s.activeJarId,
      setActive: s.setActive,
    })),
  )

  const [manageOpen, setManageOpen] = useState(false)
  const pendingCookies = useUiStore((s) => s.pendingCookies)
  const clearPendingCookies = useUiStore((s) => s.clearPendingCookies)

  useEffect(() => {
    if (!pendingCookies) return
    if (pendingCookies.jarId) setActive(workspaceId, pendingCookies.jarId)
    setManageOpen(true)
    clearPendingCookies()
  }, [pendingCookies, clearPendingCookies, setActive, workspaceId])

  if (jars.length === 0) return null

  const activeJar = jars.find((j) => j.id === activeJarId) ?? jars[0]

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 px-2 py-1 rounded-[5px] cursor-pointer bg-transparent border-0 outline-none hover:bg-subtle data-[popup-open]:bg-subtle">
          <Glyph kind="cookie" size={13} color="var(--base04)" />
          <span className="font-sans text-[0.929rem] text-muted truncate max-w-[140px]">
            {activeJar.name}
          </span>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-[200px]">
          {jars.map((jar) => (
            <DropdownMenuItem
              key={jar.id}
              className={ITEM}
              onClick={() => setActive(workspaceId, jar.id)}
            >
              <Glyph kind="cookie" size={13} color="var(--base04)" />
              <span className="min-w-0 truncate">{jar.name}</span>
              {jar.id === activeJarId && (
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
            Manage Cookies
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {manageOpen && (
        <CookiesModal
          workspaceId={workspaceId}
          onClose={() => setManageOpen(false)}
        />
      )}
    </>
  )
}
