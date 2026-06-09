import type { Theme } from "@voleeo/plugin-api"

/** base16 port of Catppuccin Frappé. https://catppuccin.com */
export const catppuccinFrappe: Theme = {
  id: "catppuccin-frappe",
  name: "Catppuccin Frappé",
  author: "Catppuccin",
  kind: "dark",
  version: "1.0.0",
  palette: {
    base00: "#303446", // base
    base01: "#292c3c", // mantle
    base02: "#414559", // surface0
    base03: "#51576d", // surface1
    base04: "#626880", // surface2
    base05: "#c6d0f5", // text
    base06: "#b5bfe2", // subtext1
    base07: "#babbf1", // lavender
    base08: "#e78284", // red
    base09: "#ef9f76", // peach
    base0A: "#e5c890", // yellow
    base0B: "#a6d189", // green
    base0C: "#81c8be", // teal
    base0D: "#8caaee", // blue
    base0E: "#ca9ee6", // mauve
    base0F: "#eebebe", // flamingo
  },
}
