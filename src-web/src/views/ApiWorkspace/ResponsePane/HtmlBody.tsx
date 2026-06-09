import { xml as xmlLang } from "@codemirror/lang-xml"
import CodeMirror, {
  defaultLightThemeOption,
  oneDark,
} from "@uiw/react-codemirror"
import { html as beautifyHtml } from "js-beautify"
import { useMemo } from "react"
import { cmEditorTheme } from "../cmEditorTheme"

export type HtmlView = "preview" | "raw"

export function HtmlBody({
  html,
  view,
  isDark,
}: {
  html: string
  view: HtmlView
  isDark: boolean
}) {
  const pretty = useMemo(
    () =>
      view === "raw"
        ? beautifyHtml(html, { indent_size: 2, wrap_line_length: 0 })
        : "",
    [html, view],
  )
  const extensions = useMemo(
    () => [
      isDark ? oneDark : defaultLightThemeOption,
      cmEditorTheme,
      xmlLang(),
    ],
    [isDark],
  )

  if (view === "preview") {
    return (
      <iframe
        title="HTML response preview"
        // Empty sandbox: render markup + styles, but no script execution,
        // form submission, or navigation — the response can't affect the app.
        sandbox=""
        srcDoc={html}
        className="flex-1 min-h-0 w-full border-0 bg-white"
      />
    )
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <CodeMirror
        value={pretty}
        readOnly
        theme="none"
        extensions={extensions}
        height="100%"
        style={{ height: "100%" }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          autocompletion: false,
        }}
      />
    </div>
  )
}
