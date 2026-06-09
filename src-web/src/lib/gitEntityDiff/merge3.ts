// Field-level 3-way merge primitives. Git already decided the *file* conflicts;
// within a file we re-derive which *fields* truly clash (both sides changed them
// vs. base) so non-conflicting edits merge silently and only real clashes ask the
// user to choose.

export interface ScalarMerge {
  /** Auto-merged value, or the `ours` value when it's a real conflict. */
  value: string
  conflict: boolean
  yours: string
  theirs: string
}

export function merge3Scalar(
  base: string | undefined,
  ours: string,
  theirs: string,
): ScalarMerge {
  const b = base ?? ""
  if (ours === theirs)
    return { value: ours, conflict: false, yours: ours, theirs }
  if (ours === b) return { value: theirs, conflict: false, yours: ours, theirs }
  if (theirs === b) return { value: ours, conflict: false, yours: ours, theirs }
  return { value: ours, conflict: true, yours: ours, theirs }
}

export interface ListMerge<T> {
  /** Items resolved without a choice (unchanged, or changed on one side only). */
  resolved: T[]
  /** Keys where both sides diverged — surfaced to the chooser. */
  conflicts: { key: string; ours?: T; theirs?: T }[]
}

/** Three-way merge of a keyed list (params/headers/variables/cookies). */
export function merge3List<T>(
  base: T[] | undefined,
  ours: T[],
  theirs: T[],
  idOf: (t: T) => string,
  equal: (a: T, b: T) => boolean,
): ListMerge<T> {
  const b = new Map((base ?? []).map((t) => [idOf(t), t]))
  const o = new Map(ours.map((t) => [idOf(t), t]))
  const t = new Map(theirs.map((t) => [idOf(t), t]))
  const eq = (x?: T, y?: T) =>
    (x === undefined && y === undefined) ||
    (x !== undefined && y !== undefined && equal(x, y))

  const resolved: T[] = []
  const conflicts: { key: string; ours?: T; theirs?: T }[] = []
  for (const key of new Set([...o.keys(), ...t.keys(), ...b.keys()])) {
    const ov = o.get(key)
    const tv = t.get(key)
    const bv = b.get(key)
    if (eq(ov, tv)) {
      if (ov) resolved.push(ov)
    } else if (eq(ov, bv)) {
      if (tv) resolved.push(tv) // only theirs changed
    } else if (eq(tv, bv)) {
      if (ov) resolved.push(ov) // only ours changed
    } else {
      conflicts.push({ key, ours: ov, theirs: tv })
    }
  }
  return { resolved, conflicts }
}
