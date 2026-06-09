import type { Tool } from "@/store/workspace"
import { ApiWorkspace } from "@/views/ApiWorkspace"
import { GitSync } from "@/views/GitSync"
import { WelcomeScreen } from "@/views/WelcomeScreen"

interface Props {
  activeTool: Tool
}

export function ToolViewport({ activeTool }: Props) {
  return (
    <main className="block overflow-hidden h-full">
      {activeTool === "welcome" && <WelcomeScreen />}
      {activeTool === "api" && <ApiWorkspace />}
      {activeTool === "git" && <GitSync />}
    </main>
  )
}
