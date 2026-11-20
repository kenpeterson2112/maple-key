// The "next step" for a class: the next logical lesson after what the teacher
// most recently planned, read against a scope and sequence, unless that
// lesson's Quick Check shows a gap, which comes first. It describes the gap and
// leaves the teacher to decide what to do (PROGRESS_SPEC.md, decision 8). The
// gap rule is the shared one (expectation-status.ts). Rules only, no model call: it
// runs on every render, costs nothing, and every claim in the rationale points
// at data the teacher can see.
//
// Pure (types only): the caller passes this class's lessons and Quick Check
// tallies and the sequence. Feeds layer 3 of the top nav.

import type { LessonTally, LevelCounts } from "./assessment-results"
import { isGap } from "./expectation-status"
import type { LessonMetadata } from "./lesson-metadata"

/** An ordered teaching sequence for one subject and grade. */
export interface ScopeSequence {
  /** Shown in the rationale: "in Peel DSB's scope and sequence". */
  name: string
  /** Specific-expectation codes in the order they are taught. */
  codes: string[]
}

export type NextStep =
  | {
      kind: "start"
      code: string
    }
  | {
      /** No lessons in Maple Key, but Quick Checks show where the class is. */
      kind: "continue"
      code: string
      /** The furthest expectation with results, in the sequence. */
      furthest: string
    }
  | {
      kind: "next"
      code: string
      /** The lesson it follows. */
      after: LessonMetadata
      /** The last lesson's codes that sit before `code` in the sequence. */
      builtOn: string[]
      /** True when no Quick Check since the last lesson has results on its expectations. */
      unchecked: boolean
    }
  | {
      /** A Quick Check since the last lesson shows a gap on one of its expectations. */
      kind: "gap"
      code: string
      after: LessonMetadata
      /** Share of responses at Level 1–2 on `code`, 0–1. */
      lowShare: number
      /** Responses at Level 1–2, and all responses, on `code`. */
      low: number
      responses: number
      /** When those results were last recorded. */
      checkedAt: number
    }
  | { kind: "done" }

const total = (c: LevelCounts) => c.level1 + c.level2 + c.level3 + c.level4

/** Does `code` (a specific like "C2.1" or an overall like "C2") cover `specific`? */
function covers(code: string, specific: string): boolean {
  return code === specific || specific.startsWith(`${code}.`)
}

export function buildNextStep(sequence: ScopeSequence, lessons: LessonMetadata[], tallies: LessonTally[]): NextStep {
  const order = sequence.codes
  if (order.length === 0) return { kind: "done" }

  const taught = new Set<string>()
  for (const l of lessons) for (const c of l.curriculumCodesCovered ?? []) for (const s of order) if (covers(c, s)) taught.add(s)
  for (const t of tallies) {
    for (const c of [...t.codes, ...Object.keys(t.byExpectation)]) for (const s of order) if (covers(c, s)) taught.add(s)
  }

  const last = [...lessons].sort((a, b) => b.timestamp - a.timestamp)[0]
  if (!last) {
    // No lessons, but checks may still show how far the class has come.
    const furthestIdx = Math.max(-1, ...[...taught].map((c) => order.indexOf(c)))
    if (furthestIdx >= 0) {
      const next = order.slice(furthestIdx + 1).find((c) => !taught.has(c)) ?? order.find((c) => !taught.has(c))
      return next ? { kind: "continue", code: next, furthest: order[furthestIdx] } : { kind: "done" }
    }
    return { kind: "start", code: order[0] }
  }

  const lastSpecifics = order.filter((s) => (last.curriculumCodesCovered ?? []).some((c) => covers(c, s)))
  // Only checks recorded after that lesson was planned speak to it: an older
  // poor result may be exactly why the teacher planned it.
  const since = tallies.filter((t) => t.updatedAt >= last.timestamp)

  // A gap: the last lesson's own expectations, as checked since.
  let worst: { code: string; lowShare: number; low: number; responses: number; checkedAt: number } | null = null
  for (const code of lastSpecifics) {
    const sum = { level1: 0, level2: 0, level3: 0, level4: 0 }
    let checkedAt = 0
    for (const t of since) {
      const c = t.byExpectation[code]
      if (!c || total(c) === 0) continue
      sum.level1 += c.level1
      sum.level2 += c.level2
      sum.level3 += c.level3
      sum.level4 += c.level4
      checkedAt = Math.max(checkedAt, t.updatedAt)
    }
    const n = total(sum)
    if (n === 0 || !isGap(sum)) continue
    const low = sum.level1 + sum.level2
    const lowShare = low / n
    if (!worst || lowShare > worst.lowShare) worst = { code, lowShare, low, responses: n, checkedAt }
  }
  if (worst) return { kind: "gap", after: last, ...worst }

  // Next: the first untaught expectation after the furthest one the last
  // lesson reached; if the sequence is finished past that point, the earliest
  // gap before it.
  const furthest = Math.max(-1, ...lastSpecifics.map((c) => order.indexOf(c)))
  const next = order.slice(furthest + 1).find((c) => !taught.has(c)) ?? order.find((c) => !taught.has(c))
  if (!next) return { kind: "done" }

  const checked = lastSpecifics.some((code) => since.some((t) => t.byExpectation[code] && total(t.byExpectation[code]) > 0))
  return {
    kind: "next",
    code: next,
    after: last,
    builtOn: lastSpecifics.filter((c) => order.indexOf(c) < order.indexOf(next)),
    unchecked: lastSpecifics.length > 0 && !checked,
  }
}
