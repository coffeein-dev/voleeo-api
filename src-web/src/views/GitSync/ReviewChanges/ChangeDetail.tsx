import { methodColor } from "@/components/tokens"
import { type EntityChange, GROUP_ORDER } from "@/lib/gitEntityDiff"
import { discardField, revealEntity } from "@/store/gitReview"
import { EntityIcon } from "../EntityIcon"
import { RV } from "../reviewClasses"
import { FieldGroup } from "./FieldGroups"

const STATUS_META = {
  modified: { word: "Edited", color: "var(--accent)" },
  added: { word: "New", color: "var(--c-add)" },
  removed: { word: "Deleted", color: "var(--c-del)" },
} as const

export function ChangeDetail({
  entity,
  readOnly,
}: {
  entity: EntityChange | null
  readOnly?: boolean
}) {
  if (!entity) {
    return <div className={RV.detailEmpty}>Select a change to review it.</div>
  }

  const sm = STATUS_META[entity.status]
  const groups = GROUP_ORDER.map((g) => ({
    g,
    items: entity.fields.filter((f) => f.group === g),
  })).filter((x) => x.items.length > 0)

  return (
    <>
      <div className={RV.detailHead}>
        <div className={RV.dhMain}>
          <div className={RV.dhTop}>
            {entity.type === "request" && entity.method ? (
              <span
                className={RV.methodLg}
                style={{ color: methodColor(entity.method) }}
              >
                {entity.method}
              </span>
            ) : (
              <EntityIcon type={entity.type} size={16} />
            )}
            <button
              type="button"
              className={RV.dhName}
              title="Open in the main window"
              onClick={() => revealEntity(entity.type, entity.nodeId)}
            >
              {entity.name}
            </button>
          </div>
        </div>
        <span className={RV.dhStatus} style={{ color: sm.color }}>
          {sm.word}
        </span>
      </div>

      <div className={RV.detailBody}>
        {groups.length === 0 ? (
          <div className={RV.detailEmpty}>No field-level changes.</div>
        ) : (
          groups.map(({ g, items }) => (
            <FieldGroup
              key={g}
              group={g}
              items={items}
              onDiscard={
                readOnly || entity.status === "removed"
                  ? undefined
                  : (key) => discardField(entity, key)
              }
            />
          ))
        )}
      </div>
    </>
  )
}
