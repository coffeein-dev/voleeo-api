import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow"
import {
  currentMonitor,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window"

export const FLOW_WIDTH = 900
const MIN_HEIGHT = 280
const TOPBAR_HEIGHT = 44

export async function applyFlowWindowHeight(height: number) {
  try {
    const win = getCurrentWebviewWindow()
    const monitor = await currentMonitor()
    // Leave 80px margin for macOS menu bar + dock; fall back to 900 if no monitor info
    const maxH = monitor
      ? Math.floor(monitor.size.height / monitor.scaleFactor) - 80
      : 900
    const contentH = Math.max(
      MIN_HEIGHT,
      Math.min(height, maxH - TOPBAR_HEIGHT),
    )
    const windowH = contentH + TOPBAR_HEIGHT
    await win.setSize(new LogicalSize(FLOW_WIDTH, windowH))
    if (monitor) {
      const sf = monitor.scaleFactor
      const mw = monitor.size.width / sf
      const mh = monitor.size.height / sf
      const mx = monitor.position.x / sf
      const my = monitor.position.y / sf
      await win.setPosition(
        new LogicalPosition(
          Math.round(mx + (mw - FLOW_WIDTH) / 2),
          Math.round(my + (mh - windowH) / 2),
        ),
      )
    }
  } catch {}
}
