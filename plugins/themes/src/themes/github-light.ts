import type { Theme } from "@voleeo/plugin-api"

/**
 * GitHub Light — accent colors are GitHub's Primer palette so syntax highlights
 * match what users see on github.com. Background layers come from the design's
 * "Painted" preview for the Theme settings screen.
 */
export const githubLight: Theme = {
  id: "github-light",
  name: "GitHub Light",
  author: "GitHub",
  kind: "light",
  version: "1.0.0",
  palette: {
    base00: "#ffffff",
    base01: "#f5f5f5",
    base02: "#e8e8e8",
    base03: "#bcbcbc",
    base04: "#969896",
    base05: "#333333",
    base06: "#1a1a1a",
    base07: "#ffffff",
    base08: "#d73a49",
    base09: "#e36209",
    base0A: "#d4a72c",
    base0B: "#22863a",
    base0C: "#1b7c83",
    base0D: "#0366d6",
    base0E: "#6f42c1",
    base0F: "#b31d28",
  },
}
