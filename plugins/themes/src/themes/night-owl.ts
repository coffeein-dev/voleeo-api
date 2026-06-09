import type { Theme } from "@voleeo/plugin-api"

/** base16 port of Night Owl by Sarah Drasner. https://github.com/sdras/night-owl-vscode-theme */
export const nightOwl: Theme = {
  id: "night-owl",
  name: "Night Owl",
  author: "Sarah Drasner",
  kind: "dark",
  version: "1.0.0",
  palette: {
    base00: "#011627", // editor background
    base01: "#01111d", // inactive tab / darker surface
    base02: "#0b2942", // active tab / selection
    base03: "#637777", // comments
    base04: "#5f7e97", // muted text / line numbers
    base05: "#d6deeb", // foreground
    base06: "#d2dee7", // lighter foreground
    base07: "#ffffff", // bright text
    base08: "#ff5874", // red — booleans, null, errors
    base09: "#f78c6c", // orange — numbers, escape chars
    base0A: "#ffcb8b", // yellow — classes, attributes
    base0B: "#c5e478", // green — variables, strings
    base0C: "#7fdbca", // cyan — operators, properties
    base0D: "#82aaff", // blue — constants, support functions
    base0E: "#c792ea", // purple — keywords, storage
    base0F: "#ecc48d", // brown — string literals
  },
}
