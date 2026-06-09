import type { Theme } from "@voleeo/plugin-api"

/** base16 port of Tokyo Night. https://github.com/tokyo-night/tokyo-night-vscode-theme */
export const tokyoNight: Theme = {
  id: "tokyo-night",
  name: "Tokyo Night",
  author: "tokyo-night",
  kind: "dark",
  version: "1.0.0",
  palette: {
    base00: "#1a1b26", // background
    base01: "#16161e", // dark background / sidebar
    base02: "#292e42", // selection / highlight
    base03: "#51597d", // comments
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
