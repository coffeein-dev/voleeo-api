import type { Theme } from "@voleeo/plugin-api"

/** base16 port of Light Owl by Sarah Drasner. https://github.com/sdras/night-owl-vscode-theme */
export const lightOwl: Theme = {
  id: "light-owl",
  name: "Light Owl",
  author: "Sarah Drasner",
  kind: "light",
  version: "1.0.0",
  palette: {
    base00: "#fbfbfb", // editor background
    base01: "#f6f6f6", // active tab / surface
    base02: "#e0e0e0", // selection
    base03: "#989fb1", // comments
    base04: "#5f7e97", // muted text / line numbers
    base05: "#403f53", // foreground
    base06: "#403f53", // foreground
    base07: "#111111", // darkest text
    base08: "#bc5454", // red — errors, booleans, null
    base09: "#aa0982", // orange/magenta — numbers
    base0A: "#c96765", // yellow-red — string quotes, vars
    base0B: "#4876d6", // green/blue — variables, strings
    base0C: "#0c969b", // cyan — operators, properties
    base0D: "#4876d6", // blue — functions, constants
    base0E: "#994cc3", // purple — keywords, storage
    base0F: "#0c969b", // brown — alternate cyan
  },
}
