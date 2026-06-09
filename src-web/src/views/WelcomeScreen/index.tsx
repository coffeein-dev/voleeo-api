import { useCallback, useEffect, useState } from "react"
import { applyWelcomeWindowSize, useUiStore } from "@/store/workspace"
import { ApiClientFlow } from "./ApiClientFlow"
import { HomeView } from "./HomeView"
import { ImportFlow } from "./ImportFlow"

type Mode = "home" | "api" | "import"

export function WelcomeScreen() {
  const loadWorkspaces = useUiStore((s) => s.loadWorkspaces)
  const [mode, setMode] = useState<Mode>("home")

  useEffect(() => {
    loadWorkspaces()
  }, [loadWorkspaces])

  const goHome = useCallback(() => {
    setMode("home")
    applyWelcomeWindowSize()
  }, [])

  // Flow modes use a plain div (no h-full, no flex) so FlowShell sizes to
  // its own content height and ResizeObserver reads the correct value.
  if (mode !== "home") {
    return (
      <div className="bg-bg">
        {mode === "api" && <ApiClientFlow onCancel={goHome} />}
        {mode === "import" && <ImportFlow onCancel={goHome} />}
      </div>
    )
  }

  return (
    <div className="h-full flex bg-bg">
      <HomeView onSelect={setMode} />
    </div>
  )
}
