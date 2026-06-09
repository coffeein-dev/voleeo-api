// A tiny declarative engine: each entity is described as a list of fields, and
// these three functions derive the Review-changes detail, the conflict chooser,
// and the merged result — so the per-entity modules stay pure data.

import { diffList, listToFields, scalarField } from "./helpers"
import { merge3List, merge3Scalar } from "./merge3"
import type { Choice, ConflictField, FieldChange, FieldGroup } from "./types"

interface Common {
  id: string
  group: FieldGroup
  label?: string
  secret?: boolean
}

/** A plain string field (url, name, method, …). */
export interface ScalarField<E> extends Common {
  kind: "scalar"
  get: (e: E) => string
  set: (e: E, v: string) => void
}

/** A keyed list field (params, headers, variables, cookies). */
export interface ListField<E> extends Common {
  kind: "list"
  canBoth?: boolean
  get: (e: E) => unknown[]
  set: (e: E, items: unknown[]) => void
  idOf: (i: unknown) => string
  equal: (a: unknown, b: unknown) => boolean
  labelOf: (i: unknown) => string
  valueOf: (i: unknown) => string
  secretOf: (i: unknown) => boolean
}

/** A labeled sub-part of a blob (e.g. one auth field). */
export interface BlobEntry {
  label: string
  value: string
  secret?: boolean
}

/** An opaque object field merged atomically (auth, body) — diffed via `compare`.
 * `entries` lets the review expand it into per-part rows for readability. */
export interface BlobField<E> extends Common {
  kind: "blob"
  compare: (e: E) => string
  summary: (e: E) => string
  copy: (from: E, to: E) => void
  entries?: (e: E) => BlobEntry[]
}

export type Field<E> = ScalarField<E> | ListField<E> | BlobField<E>

export function scalar<E>(
  id: string,
  group: FieldGroup,
  get: (e: E) => string,
  set: (e: E, v: string) => void,
  opts: { label?: string; secret?: boolean } = {},
): Field<E> {
  return { kind: "scalar", id, group, get, set, ...opts }
}

export function listField<E, I>(args: {
  id: string
  group: FieldGroup
  canBoth?: boolean
  get: (e: E) => I[]
  set: (e: E, items: I[]) => void
  idOf: (i: I) => string
  equal: (a: I, b: I) => boolean
  labelOf: (i: I) => string
  valueOf: (i: I) => string
  secretOf?: (i: I) => boolean
}): Field<E> {
  return {
    kind: "list",
    id: args.id,
    group: args.group,
    canBoth: args.canBoth,
    get: args.get as (e: E) => unknown[],
    set: args.set as (e: E, items: unknown[]) => void,
    idOf: args.idOf as (i: unknown) => string,
    equal: args.equal as (a: unknown, b: unknown) => boolean,
    labelOf: args.labelOf as (i: unknown) => string,
    valueOf: args.valueOf as (i: unknown) => string,
    secretOf: (args.secretOf ?? (() => false)) as (i: unknown) => boolean,
  }
}

export function blob<E>(
  id: string,
  group: FieldGroup,
  compare: (e: E) => string,
  summary: (e: E) => string,
  copy: (from: E, to: E) => void,
  opts: {
    label?: string
    secret?: boolean
    entries?: (e: E) => BlobEntry[]
  } = {},
): Field<E> {
  return { kind: "blob", id, group, compare, summary, copy, ...opts }
}

/** Diff a blob's labeled entries into per-part field changes (secrets masked).
 * All entries share the blob's `key` since the blob reverts atomically. */
function entryFields(
  group: FieldGroup,
  key: string,
  oldEntries: BlobEntry[],
  newEntries: BlobEntry[],
): FieldChange[] {
  const show = (e: BlobEntry) => (e.secret ? "••••" : e.value)
  const oMap = new Map(oldEntries.map((e) => [e.label, e]))
  const nMap = new Map(newEntries.map((e) => [e.label, e]))
  const out: FieldChange[] = []
  for (const [label, ne] of nMap) {
    const oe = oMap.get(label)
    if (!oe) out.push({ group, label, kind: "added", after: show(ne), key })
    else if (oe.value !== ne.value)
      out.push({
        group,
        label,
        kind: "changed",
        before: show(oe),
        after: show(ne),
        key,
      })
  }
  for (const [label, oe] of oMap) {
    if (!nMap.has(label))
      out.push({ group, label, kind: "removed", before: show(oe), key })
  }
  return out
}

export function buildFields<E>(
  specs: Field<E>[],
  oldE: E | null,
  newE: E | null,
): FieldChange[] {
  const out: FieldChange[] = []
  for (const f of specs) {
    if (f.kind === "list") {
      const d = diffList(
        oldE ? f.get(oldE) : [],
        newE ? f.get(newE) : [],
        f.idOf,
        f.equal,
      )
      out.push(
        ...listToFields(f.group, d, f.labelOf, f.valueOf, f.secretOf, f.id),
      )
    } else if (f.kind === "blob") {
      if (f.entries) {
        out.push(
          ...entryFields(
            f.group,
            f.id,
            oldE ? f.entries(oldE) : [],
            newE ? f.entries(newE) : [],
          ),
        )
        continue
      }
      const bc = oldE ? f.compare(oldE) : ""
      const ac = newE ? f.compare(newE) : ""
      if (bc === ac) continue
      out.push({
        group: f.group,
        label: f.label,
        kind: !bc ? "added" : !ac ? "removed" : "changed",
        before: bc && oldE ? f.summary(oldE) : undefined,
        after: ac && newE ? f.summary(newE) : undefined,
        secret: f.secret,
        key: f.id,
      })
    } else {
      const c = scalarField(
        f.group,
        oldE ? f.get(oldE) : undefined,
        newE ? f.get(newE) : undefined,
        { label: f.label, secret: f.secret },
      )
      if (c) out.push({ ...c, key: f.id })
    }
  }
  return out
}

export function buildConflicts<E>(
  specs: Field<E>[],
  base: E | null,
  ours: E,
  theirs: E,
): ConflictField[] {
  const out: ConflictField[] = []
  for (const f of specs) {
    if (f.kind === "list") {
      const m = merge3List(
        base ? f.get(base) : [],
        f.get(ours),
        f.get(theirs),
        f.idOf,
        f.equal,
      )
      for (const c of m.conflicts) {
        const ref = c.ours ?? c.theirs
        out.push({
          id: `${f.id}:${c.key}`,
          group: f.group,
          label: ref ? f.labelOf(ref) : c.key,
          yours: c.ours ? f.valueOf(c.ours) : "(removed)",
          theirs: c.theirs ? f.valueOf(c.theirs) : "(removed)",
          secret: ref ? f.secretOf(ref) : false,
          canBoth: f.canBoth,
        })
      }
      continue
    }
    const cmp = f.kind === "blob" ? f.compare : f.get
    const display = f.kind === "blob" ? f.summary : f.get
    const m = merge3Scalar(base ? cmp(base) : undefined, cmp(ours), cmp(theirs))
    if (m.conflict) {
      out.push({
        id: f.id,
        group: f.group,
        label: f.label,
        yours: display(ours),
        theirs: display(theirs),
        secret: f.secret,
      })
    }
  }
  return out
}

export function mergeEntity<E>(
  specs: Field<E>[],
  base: E | null,
  ours: E,
  theirs: E,
  choice: Record<string, Choice>,
): E {
  const out: E = JSON.parse(JSON.stringify(ours))
  for (const f of specs) {
    if (f.kind === "list") {
      const m = merge3List(
        base ? f.get(base) : [],
        f.get(ours),
        f.get(theirs),
        f.idOf,
        f.equal,
      )
      const items = [...m.resolved]
      for (const c of m.conflicts) {
        const ch = choice[`${f.id}:${c.key}`]
        if (ch === "theirs") {
          if (c.theirs) items.push(c.theirs)
        } else if (ch === "both") {
          if (c.ours) items.push(c.ours)
          if (c.theirs) items.push(c.theirs)
        } else if (c.ours) {
          items.push(c.ours)
        }
      }
      f.set(out, items)
      continue
    }
    const cmp = f.kind === "blob" ? f.compare : f.get
    const m = merge3Scalar(base ? cmp(base) : undefined, cmp(ours), cmp(theirs))
    let source = ours
    if (!m.conflict) {
      if (cmp(ours) !== cmp(theirs) && base && cmp(ours) === cmp(base))
        source = theirs
    } else if (choice[f.id] === "theirs") {
      source = theirs
    }
    if (f.kind === "blob") f.copy(source, out)
    else f.set(out, f.get(source))
  }
  return out
}

/** Return a clone of `working` with the single field `key` restored to its
 * committed (`oldE`) value — the engine behind per-field discard. */
export function revertField<E>(
  specs: Field<E>[],
  oldE: E | null,
  working: E,
  key: string,
): E {
  const out: E = JSON.parse(JSON.stringify(working))
  const idx = key.indexOf(":")
  const specId = idx >= 0 ? key.slice(0, idx) : key
  const itemId = idx >= 0 ? key.slice(idx + 1) : undefined

  const f = specs.find((s) => s.id === specId)
  if (!f) return out
  if (f.kind === "list" && itemId !== undefined) {
    const oldItem = (oldE ? f.get(oldE) : []).find((i) => f.idOf(i) === itemId)
    const without = f.get(out).filter((i) => f.idOf(i) !== itemId)
    f.set(out, oldItem ? [...without, oldItem] : without)
  } else if (f.kind === "blob") {
    if (oldE) f.copy(oldE, out)
  } else if (f.kind === "scalar") {
    f.set(out, oldE ? f.get(oldE) : "")
  }
  return out
}
