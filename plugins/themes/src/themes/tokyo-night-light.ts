import type { Theme } from "@voleeo/plugin-api"

/** base16 port of Tokyo Night Light. https://github.com/tokyo-night/tokyo-night-vscode-theme */
export const tokyoNightLight: Theme = {
  id: "tokyo-night-light",
  name: "Tokyo Night Light",
  author: "tokyo-night",
  kind: "light",
  version: "1.0.0",
  palette: {
    base00: "#e6e7ed", // background
    base01: "#d6d8df", // sidebar / surface
    base02: "#acb0bf", // selection
    base03: "#888b94", // comments
    base04: "#484c61", // muted text
    base05: "#343b59", // foreground
    base06: "#343b59", // foreground
    base07: "#40434f", // dark text
    base08: "#942f2f", // red — errors
    base09: "#965027", // orange — constants
    base0A: "#8f5e15", // yellow — attributes
    base0B: "#385f0d", // green — strings
    base0C: "#006c86", // cyan — operators
    base0D: "#2959aa", // blue — functions
    base0E: "#7b43ba", // purple — keywords, storage
    base0F: "#33635c", // teal — object keys
  },
}
