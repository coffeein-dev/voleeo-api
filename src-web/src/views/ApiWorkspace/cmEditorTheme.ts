import { EditorView } from "@uiw/react-codemirror"

/** CodeMirror chrome (gutters, selection, tooltips, search panel, fold/lint
 *  markers) mapped onto Voleeo's base16 tokens. */
export const cmEditorTheme = EditorView.theme({
  "&": { backgroundColor: "var(--base00) !important" },
  ".cm-scroller": { fontFamily: "var(--mono-font, ui-monospace, monospace)" },
  ".cm-gutters": {
    backgroundColor: "var(--base00) !important",
    borderRight: "1px solid var(--base03)",
    color: "var(--base04)",
  },
  ".cm-activeLineGutter": { backgroundColor: "var(--base01) !important" },
  ".cm-foldGutter .cm-gutterElement": {
    color: "var(--base04)",
    cursor: "pointer",
  },
  ".cm-foldGutter .cm-gutterElement:hover": { color: "var(--base05)" },
  ".cm-fold-chevron": { display: "inline-flex", alignItems: "center" },
  // Compact red/amber dot in place of CodeMirror's default marker SVG.
  ".cm-gutter-lint": { width: "0.9em" },
  ".cm-gutter-lint .cm-gutterElement": {
    padding: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  ".cm-lint-marker svg": { display: "none" },
  ".cm-lint-marker": {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    cursor: "pointer",
  },
  ".cm-lint-marker-error": { backgroundColor: "var(--base08)" },
  ".cm-lint-marker-warning": { backgroundColor: "var(--base0A)" },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--base02)",
    border: "1px solid var(--base03)",
    color: "var(--base04)",
    borderRadius: "3px",
    padding: "0 4px",
    margin: "0 2px",
  },
  ".cm-activeLine": {
    backgroundColor:
      "color-mix(in srgb, var(--base01) 60%, transparent) !important",
  },
  // Accent tint — the base02 selection slot is often too low-contrast to see.
  ".cm-selectionBackground": {
    backgroundColor:
      "color-mix(in srgb, var(--base0D) 32%, transparent) !important",
  },
  "& *::selection": {
    backgroundColor:
      "color-mix(in srgb, var(--base0D) 32%, transparent) !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--base0D)" },
  ".cm-placeholder": { color: "var(--base04)" },
  ".cm-tooltip": {
    zIndex: "9999",
    backgroundColor: "var(--base01) !important",
    border: "1px solid var(--base03) !important",
    borderRadius: "6px",
    color: "var(--base05)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
    overflow: "hidden",
  },
  ".cm-tooltip-lint": { maxWidth: "min(560px, 80vw)" },
  ".cm-diagnostic": {
    fontFamily: "var(--mono-font, ui-monospace, monospace)",
    fontSize: "11.5px",
    lineHeight: "1.5",
    padding: "7px 11px",
    whiteSpace: "pre-wrap",
    borderLeft: "3px solid transparent",
  },
  ".cm-diagnostic-error": { borderLeftColor: "var(--base08)" },
  ".cm-diagnostic-warning": { borderLeftColor: "var(--base0A)" },

  // Search / replace panel
  ".cm-panels": {
    backgroundColor: "var(--base01) !important",
    borderTop: "1px solid var(--base03)",
    color: "var(--base05)",
  },
  ".cm-panels-bottom": { borderTop: "1px solid var(--base03)" },
  ".cm-search": {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "4px",
    padding: "6px 10px",
    fontFamily: "var(--interface-font, sans-serif)",
    fontSize: "12px",
    color: "var(--base05)",
  },
  ".cm-textfield": {
    backgroundColor: "var(--base00) !important",
    border: "1px solid var(--base03) !important",
    borderRadius: "4px",
    color: "var(--base05) !important",
    fontFamily: "var(--mono-font, ui-monospace, monospace)",
    fontSize: "11px",
    padding: "3px 7px",
    outline: "none",
    minWidth: "140px",
  },
  ".cm-textfield:focus": {
    borderColor: "var(--base0D) !important",
  },
  ".cm-button": {
    backgroundColor: "var(--base00) !important",
    border: "1px solid var(--base03) !important",
    borderRadius: "4px",
    color: "var(--base05) !important",
    fontFamily: "var(--interface-font, sans-serif)",
    fontSize: "11px",
    padding: "3px 8px",
    cursor: "pointer",
    backgroundImage: "none !important",
  },
  ".cm-button:hover": {
    backgroundColor: "var(--base02) !important",
    borderColor:
      "color-mix(in srgb, var(--base03) 80%, var(--base05)) !important",
  },
  ".cm-button:active": {
    backgroundColor: "var(--base01) !important",
  },
  ".cm-search label": {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    color: "var(--base04)",
    cursor: "pointer",
    userSelect: "none",
    fontFamily: "var(--interface-font, sans-serif)",
  },
  ".cm-search label:hover": { color: "var(--base05)" },
  ".cm-search .cm-button[name='close']": {
    border: "none !important",
    backgroundColor: "transparent !important",
    color: "var(--base04) !important",
    padding: "2px 4px",
  },
  ".cm-search .cm-button[name='close']:hover": {
    color: "var(--base05) !important",
    backgroundColor: "var(--base02) !important",
  },
})
