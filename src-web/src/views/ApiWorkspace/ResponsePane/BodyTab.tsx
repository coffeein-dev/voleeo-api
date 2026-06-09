import { useMemo } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useThemeStore } from "@/store/theme"
import type { HttpResponse } from "../../../../../packages/types/bindings"
import type { BodyLang } from "./bodyLang"
import { isHtmlResponse } from "./bodyLang"
import { CodeBody } from "./CodeBody"
import { HtmlBody, type HtmlView } from "./HtmlBody"
import { VirtualBody } from "./VirtualBody"

function headerValue(
  headers: { name: string; value: string }[],
  name: string,
): string | null {
  const h = headers.find((x) => x.name.toLowerCase() === name.toLowerCase())
  return h?.value ?? null
}

function detectLang(ct: string | null): BodyLang {
  if (!ct) return "plain"
  if (/json/i.test(ct)) return "json"
  if (/xml/i.test(ct)) return "xml"
  return "plain"
}

export function BodyTab({
  response,
  loading,
  htmlView,
}: {
  response: HttpResponse | null
  loading: boolean
  htmlView: HtmlView
}) {
  const activeTheme = useThemeStore((s) => s.activeTheme)
  const isDark = activeTheme?.kind !== "light"
  const isHtml = isHtmlResponse(response)

  const { rawText, lang, isBinary } = useMemo(() => {
    if (!response)
      return { rawText: "", lang: "plain" as BodyLang, isBinary: false }
    if (!response.bodyIsText) {
      return {
        rawText: response.body,
        lang: "plain" as BodyLang,
        isBinary: true,
      }
    }
    const detectedLang = detectLang(
      headerValue(response.headers, "content-type"),
    )
    if (detectedLang === "json") {
      try {
        const pretty = JSON.stringify(
          JSON.parse(response.body) as unknown,
          null,
          2,
        )
        return { rawText: pretty, lang: "json" as BodyLang, isBinary: false }
      } catch {
        return {
          rawText: response.body,
          lang: "plain" as BodyLang,
          isBinary: false,
        }
      }
    }
    return { rawText: response.body, lang: detectedLang, isBinary: false }
  }, [response])

  if (loading && !response) {
    return (
      <div className="px-3.5 py-6 flex flex-col items-center gap-3 text-muted">
        <Spinner className="size-6 text-fg" aria-label="Loading response" />
        <span className="font-mono text-[0.786rem]">
          Waiting for response...
        </span>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="px-3.5 py-3 text-xs text-muted font-sans">
        Send a request to see the response
      </div>
    )
  }

  // Large bodies live in Rust; render them windowed instead of loading the whole string into CodeMirror.
  if (response.bodyWindowed) return <VirtualBody response={response} />

  if (isHtml) {
    return <HtmlBody html={response.body} view={htmlView} isDark={isDark} />
  }

  if (isBinary) {
    return (
      <div className="px-3.5 py-3 space-y-2">
        <div className="font-mono text-[0.786rem] text-muted">
          Non-UTF-8 body (base64, truncated preview)
        </div>
        <div className="font-mono text-[0.714rem] text-fg break-all leading-relaxed max-h-[50vh] overflow-auto">
          {rawText.slice(0, 10_000)}
          {rawText.length > 10_000 ? "..." : null}
        </div>
      </div>
    )
  }

  return <CodeBody rawText={rawText} lang={lang} />
}
