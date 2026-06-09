# `@voleeo/plugin-api`

Public contract for Voleeo plugins. Import types from here; never import from `src-web/` internals.

```ts
import type { VoleeoPlugin, Context } from "@voleeo/plugin-api"
```

---

## What a plugin is

A plugin is a plain TypeScript object that satisfies `VoleeoPlugin`. It declares metadata, optional lifecycle hooks, and any number of *contributions* — themed UI, template functions, menu actions, importers, or extra workspace tabs.

Plugins are in-process TypeScript modules loaded at startup. There is no sandboxing yet; a future version may move plugins to web workers. The `Context` interface is designed so that transition requires zero changes to plugin code.

---

## Minimal plugin

```ts
import type { VoleeoPlugin } from "@voleeo/plugin-api"

export const plugin: VoleeoPlugin = {
  meta: {
    id: "@acme/my-plugin",   // globally unique — use npm package name convention
    name: "My Plugin",
    version: "1.0.0",
    author: "Acme Corp",
  },
}
```

The host calls `registry.register(plugin.plugin)` after importing the module. The named export must be `plugin`.

---

## `VoleeoPlugin` — full shape

```ts
interface VoleeoPlugin {
  meta: PluginMeta                           // required

  init?:    (ctx: Context) => void | Promise<void>   // called once on registration
  dispose?: ()             => void | Promise<void>   // called on teardown / hot-reload

  // Contributions — all optional, mix-and-match freely:
  themes?:            Theme[]
  templateFunctions?: TemplateFunctionContribution[]
}
```

**`scope`** is a coarse gate. If you set `scope: ["api"]`, none of the plugin's contributions will ever surface inside the SQL workspace, even if an individual contribution omits its own `appliesTo`. Fine-grained overrides live on the contribution itself.

---

## `Context` — host capabilities

`Context` is the only channel plugins have to the host. Do not `import` from `src-web/` or call `invoke()` directly — that breaks the worker-migration path.

```ts
interface Context {
  toast:     { show(opts: { message: string; kind?: "info"|"success"|"error"|"warning" }): void }
  clipboard: { copyText(text: string): Promise<void> }
  prompt:    { text(opts: { title: string; label?: string; defaultValue?: string }): Promise<string | null> }
  store:     { get<T>(key: string): Promise<T | undefined>
               set<T>(key: string, value: T): Promise<void>
               delete(key: string): Promise<void> }
  workspace: { currentId(): string | null }
  templates: { render<T>(value: T): Promise<T> }
  log:       { debug(...args): void; info(...args): void; warn(...args): void; error(...args): void }
}
```

| Capability | Purpose |
|---|---|
| `toast` | Transient notification banner (info / success / warning / error) |
| `clipboard` | Write text to the OS clipboard |
| `prompt.text` | Show a modal text input; returns `null` if the user cancels |
| `store` | Namespaced key/value storage, persisted per-plugin across sessions |
| `workspace.currentId` | ID of the currently open workspace (`null` if none) |
| `templates.render` | Resolve `{{ }}` expressions in a string or object |
| `log` | Structured logging tagged with the plugin id |

---

## Contributions

### `themes` — visual themes

Add entries to the theme switcher (**Settings → Appearance**).

```ts
import type { Theme, VoleeoPlugin } from "@voleeo/plugin-api"

const myTheme: Theme = {
  id: "acme-midnight",       // must be globally unique
  name: "Midnight",
  author: "Acme Corp",
  kind: "dark",              // "dark" | "light" — controls OS match logic
  version: "1.0.0",
  colors: {
    base: {
      bg:         "#0d0e14",   // main window background
      bgElevated: "#13141e",   // cards, panels, dropdowns
      bgSubtle:   "#0a0b10",   // hover states, zebra rows
      fg:         "#c8ccd8",   // primary text
      fgMuted:    "#9da1b8",   // secondary / placeholder text
      border:     "#1c1e2c",   // all borders
    },
    accent: {
      primary: "#7b8cde",      // brand color, active states, links
      success: "#4ec994",
      warning: "#e5c07b",
      error:   "#e06c75",
      info:    "#56b6c2",
    },
    syntax: {
      keyword:     "#c678dd",
      string:      "#98c379",
      number:      "#d19a66",
      comment:     "#5c6370",
      punctuation: "#abb2bf",
    },
    editor: {
      cursor:          "#c8ccd8",
      selection:       "#2d3250",
      lineHighlightBg: "#13141e",
    },
    dnd: {
      dropLine: "#7b8cde",   // drag-and-drop insertion line
      dropInto: "#7b8cde",   // "drop into folder" outline
    },
  },
}

export const plugin: VoleeoPlugin = {
  meta: { id: "@acme/midnight", name: "Midnight Theme", version: "1.0.0" },
  themes: [myTheme],
}
```

All hex values must be 6-digit `#RRGGBB`. The host maps every color to a CSS custom property (`--bg`, `--fg-muted`, `--accent-primary`, etc.) and applies them to `:root` when the theme is activated.

---

### `templateFunctions` — inline dynamic values

Template functions appear in the `{{ }}` autocomplete inside URL, param, header, and body fields. When a request is sent the host calls `onRender` and substitutes the result.

```ts
import type { TemplateFunctionContribution, VoleeoPlugin } from "@voleeo/plugin-api"

const timestamp: TemplateFunctionContribution = {
  name: "timestamp",           // used in templates: {{ timestamp() }}
  label: "Unix timestamp",
  description: "Current time as seconds since epoch",
  args: [],                    // no user-configurable args
  onRender: (_ctx, _args) => String(Math.floor(Date.now() / 1000)),
}

const base64encode: TemplateFunctionContribution = {
  name: "base64.encode",       // dot notation → "base64" namespace in autocomplete
  label: "Base64 encode",
  args: [
    {
      name: "value",
      label: "Value to encode",
      type: "text",            // "text" | "secret" | "select" | "checkbox"
      required: true,
    },
  ],
  onRender: (_ctx, args) => btoa(args.value ?? ""),
}

export const plugin: VoleeoPlugin = {
  meta: { id: "@acme/utils", name: "Utilities", version: "1.0.0" },
  templateFunctions: [timestamp, base64encode],
}
```

**Arg types:**

| `type` | UI rendered | Notes |
|---|---|---|
| `"text"` | Plain text input | Default |
| `"secret"` | Masked password field | Shown as dots until focused |
| `"select"` | Dropdown | Requires `options: [{label, value}]` |
| `"checkbox"` | Toggle | `args.name` is `"true"` or `"false"` as a string |

**Naming convention:** Use dot notation (`"namespace.functionName"`) to group related functions. The UI collapses `uuid.v4`, `uuid.v3` etc. under a `uuid` namespace item in the autocomplete list.

**Return value:** `string | null` (or a Promise of either). Return `null` to leave the expression unresolved (the raw `{{ … }}` is kept as-is in the sent value).

---

## File map

```
packages/plugin-api/
├── src/
│   ├── index.ts                          ← all public exports (types only)
│   ├── plugin.ts                         ← VoleeoPlugin, PluginMeta
│   ├── context.ts                        ← Context (host capabilities)
│   └── contributions/
│       ├── theme.ts                      ← Theme
│       └── template-function.ts          ← TemplateFunctionContribution, TemplateFunctionArg
└── package.json                          ← name: "@voleeo/plugin-api", private: true
```

The package exports only TypeScript types — there is no runtime code. It is resolved directly from source (`"exports": { ".": "./src/index.ts" }`) so no build step is required.

---

## Contribution status

| Contribution | Collected by registry | Rendered in UI |
|---|---|---|
| `themes` | ✅ | ✅ Settings → Appearance |
| `templateFunctions` | ✅ | ✅ `{{ }}` autocomplete + resolver |

---

## How the host loads plugins

```
plugins/themes/src/index.ts   →   export const plugin: VoleeoPlugin
        ↓
src-web/src/plugins/load.ts   →   imports, calls registry.register(plugin)
        ↓
src-web/src/plugins/registry.ts  →  caches contributions by type + workspace
        ↓
src-web/src/plugins/hooks.ts  →  useThemes(workspace)
                                  useTemplateFunctions(workspace)
                                  (React hooks that subscribe to the registry)
```

The registry caches results keyed by `"<type>:<workspace>"` so hooks only recompute when a plugin is registered or removed. `init()` is awaited before the first contribution is served. Template-function `onRender` callbacks are adapted at access time so each function keeps its own plugin's `Context` — host call sites use the bound `BoundTemplateFunction` shape and don't pass `ctx`.

---

## Design notes for AI agents

- **Only `@voleeo/plugin-api` is the stable surface.** Everything in `src-web/src/` is internal and subject to change without notice.
- **No side effects at module load.** Do all async setup in `init(ctx)`.
- **`Context` is the sole IPC channel.** Importing Tauri APIs or Zustand stores from a plugin will work today but breaks the eventual worker-sandbox path.
- **`component` on `ToolPanelContribution` is `unknown` intentionally.** The host casts it to `React.ComponentType` at mount time, keeping this package free of a React peer dependency.
- **Template function names are the stored identifier.** Once shipped, renaming a function name is a breaking change because stored request values contain the literal `{{ old.name() }}` string.
- **Return `null` from `onImport` / `onRender` to signal "not handled"**, not a thrown error. Errors should only be thrown for unexpected failures.
- **`scope` on the plugin + `appliesTo` on a contribution are both filters.** A contribution only surfaces if *both* pass. If you set `scope: ["api"]` on the plugin but `appliesTo: ["sql"]` on a contribution, that contribution will never appear.
