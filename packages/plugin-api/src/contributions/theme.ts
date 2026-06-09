/**
 * A theme is a base16 palette plus metadata.
 * Base16 defines 16 canonical color slots (base00–base0F) with documented roles;
 * community schemes can be dropped in without translation.
 *
 * See https://github.com/chriskempson/base16/blob/main/styling.md
 */
export interface Theme {
  id: string
  name: string
  author: string
  kind: "dark" | "light"
  version: string
  palette: Base16Palette
}

/** Base16 16-slot palette. Hex strings ("#rrggbb"). */
export interface Base16Palette {
  /** Default Background */
  base00: string
  /** Lighter Background (status bars, line numbers, current-line highlight) */
  base01: string
  /** Selection Background (also used for hover surfaces and drop-into hint) */
  base02: string
  /** Comments, Invisibles, borders */
  base03: string
  /** Dark Foreground (secondary / muted text) */
  base04: string
  /** Default Foreground, Caret, Delimiters, Operators */
  base05: string
  /** Light Foreground — reserved, rarely used */
  base06: string
  /** Light Background — reserved, rarely used */
  base07: string
  /** Variables, Errors, Diff Deleted (typically red) */
  base08: string
  /** Integers, Booleans, Constants (typically orange) */
  base09: string
  /** Classes, Search highlight, Warnings (typically yellow) */
  base0A: string
  /** Strings, Inherited Class, Diff Inserted (typically green) */
  base0B: string
  /** Support, Regex, Escape Chars, Info (typically cyan) */
  base0C: string
  /** Functions, Methods, Headings, Primary brand (typically blue) */
  base0D: string
  /** Keywords, Storage, Selector, Diff Changed (typically purple) */
  base0E: string
  /** Deprecated, Embedded language tags (typically brown) */
  base0F: string
}
