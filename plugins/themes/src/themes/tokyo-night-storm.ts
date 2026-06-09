import type { Theme } from "@voleeo/plugin-api"

/** base16 port of Tokyo Night Storm. https://github.com/tokyo-night/tokyo-night-vscode-theme */
export const tokyoNightStorm: Theme = {
  id: "tokyo-night-storm",
  name: "Tokyo Night Storm",
  author: "tokyo-night",
  kind: "dark",
  version: "1.0.0",
  palette: {
    base00: "#24283b", // background
    base01: "#1f2335", // dark background / sidebar
    base02: "#2f3549", // selection / highlight
    base03: "#5f6996", // comments
    base04: "#a9b1d6", // dark foreground / line numbers
    base05: "#c0caf5", // foreground
    base06: "#c0caf5", // foreground
    base07: "#cfc9c2", // bright foreground
    base08: "#f7768e", // red
    base09: "#ff9e64", // orange — numbers, constants
    base0A: "#e0af68", // yellow — classes, attributes
    base0B: "#9ece6a", // green — strings
    base0C: "#7dcfff", // cyan — template expressions
    base0D: "#7aa2f7", // blue — functions
    base0E: "#bb9af7", // purple — keywords, storage
    base0F: "#73daca", // teal — object keys
  },
}
