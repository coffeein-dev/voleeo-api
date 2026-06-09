import { useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { useShallow } from "zustand/react/shallow"
import { Autocomplete } from "@/components/TemplateInput/Autocomplete"
import { useTemplateFunctions } from "@/plugins/hooks"
import { useEnvironmentStore } from "@/store/environment"
import { BinaryBody } from "./BinaryBody"
import {
  BodyEditor,
  beautifyHtml,
  beautifyJson,
  beautifyXml,
} from "./BodyEditor"
import { FieldsBody } from "./FieldsBody"
import type { UseBodyEditorResult } from "./useBodyEditor"
import { useBodyOverlay } from "./useBodyOverlay"

interface Props {
  body: UseBodyEditorResult
  onVarClick: (varName: string) => void
}

const RAW_KINDS = new Set(["json", "xml", "text", "html"])

export function BodyTab({ body, onVarClick }: Props) {
  const { bodyKind, bodyText, setBodyText } = body
  const { environments, activeEnvId } = useEnvironmentStore(
    useShallow((s) => ({
      environments: s.environments,
      activeEnvId: s.activeEnvId,
    })),
  )

  const activeVars = useMemo(() => {
    const globalVars =
      environments
        .find((e) => e.kind === "global")
        ?.variables.filter((v) => v.enabled) ?? []
    const personalVars =
      environments
        .find((e) => e.id === activeEnvId)
        ?.variables.filter((v) => v.enabled) ?? []
    const personalKeys = new Set(personalVars.map((v) => v.key))
    return [
      ...personalVars,
      ...globalVars.filter((v) => !personalKeys.has(v.key)),
    ]
  }, [environments, activeEnvId])

  const fns = useTemplateFunctions()
  const varKeys = useMemo(() => activeVars.map((v) => v.key), [activeVars])

  const overlay = useBodyOverlay(varKeys, fns)

  // Stable ref so the CM chip-click handler never captures a stale callback.
  const onVarClickRef = useRef<((name: string) => void) | null>(onVarClick)
  onVarClickRef.current = onVarClick

  function handleBeautify() {
    const view = overlay.editorViewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    const beautified =
      bodyKind === "json"
        ? beautifyJson(current)
        : bodyKind === "xml"
          ? beautifyXml(current)
          : beautifyHtml(current)
    if (beautified === current) return
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: beautified },
    })
    setBodyText(beautified)
  }

  const isRaw = RAW_KINDS.has(bodyKind)

  return (
    <div className="flex flex-col h-full min-h-0">
      {isRaw && (
        <div className="flex-1 min-h-0 relative">
          <BodyEditor
            bodyKind={bodyKind}
            bodyText={bodyText}
            onVarClickRef={onVarClickRef}
            overlay={overlay}
            onChange={setBodyText}
            onBeautify={handleBeautify}
          />
        </div>
      )}

      {(bodyKind === "form_url_encoded" || bodyKind === "multipart") && (
        <FieldsBody
          fields={body.bodyFields}
          allowFiles={bodyKind === "multipart"}
          onChange={body.setBodyFields}
          onVarClick={onVarClick}
        />
      )}

      {bodyKind === "binary" && (
        <BinaryBody
          path={body.binaryPath}
          contentType={body.binaryContentType}
          onChange={body.setBinary}
        />
      )}

      {bodyKind === "none" && (
        <div className="flex-1 flex items-center justify-center text-muted font-sans text-[0.929rem]">
          No request body
        </div>
      )}

      {/* Autocomplete overlay — same component as TemplateInput */}
      {overlay.overlayState.open &&
        overlay.overlayState.anchorRect &&
        overlay.overlayState.items.length > 0 &&
        createPortal(
          <Autocomplete
            items={overlay.overlayState.items}
            selectedIndex={overlay.overlayState.selectedIndex}
            anchorRect={overlay.overlayState.anchorRect}
            query={overlay.overlayState.query}
            onSelect={overlay.selectItem}
            onClose={overlay.close}
          />,
          document.body,
        )}
    </div>
  )
}
