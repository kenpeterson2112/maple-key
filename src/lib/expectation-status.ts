// One description of where a class stands on an expectation (specific or
// overall), shared by every surface: the header bar's "needs work", Needs
// attention, What's next and Progress. So their numbers always agree.
//
// It describes; it never prescribes (PROGRESS_SPEC.md, decision 8). There is
// no "re-teach", "small group" or "move on" here: a teacher reads the gap and
// decides what to do about it.
//
// Pure: works off counts and evidence, reads no storage.

import {
  computeReadinessLevel,
  evidenceStrength,
  type Evidence,
  type EvidenceStrength,
  type LevelCounts,
  type ReadinessLevel,
} from "./assessment-results"

export type ExpectationState = "not-taught" | "taught" | "checked"

export interface ExpectationStatus {
  state: ExpectationState
  /** Readiness colour (signal-*); null until checked. */
  level: ReadinessLevel | null
  /** Checked, and more than half the responses sit at Level 1–2. */
  gap: boolean
  /** Share of responses at Level 1–2, 0–1; null until checked. */
  lowShare: number | null
  /** Level 1–2 responses and all responses, for "6 of 10 at Level 1–2". */
  low: number
  responses: number
  evidence: EvidenceStrength
  /** Present when the result rests on too little to lean on. */
  hedge?: string
}

/** A gap is more than half the responses at Level 1–2. "More than half" (not
 *  "at least half") is where the readiness colour stops reading "good"
 *  (computeReadinessLevel), so a gap is never drawn in an on-track colour. */
export const GAP_SHARE = 0.5

const totalOf = (c: LevelCounts) => c.level1 + c.level2 + c.level3 + c.level4

/** Share of responses at Level 1–2, or null with none. */
export function lowShareOf(counts: LevelCounts): number | null {
  const n = totalOf(counts)
  return n > 0 ? (counts.level1 + counts.level2) / n : null
}

export function isGap(counts: LevelCounts): boolean {
  const share = lowShareOf(counts)
  return share !== null && share > GAP_SHARE
}

function hedgeFor(evidence: Evidence): string | undefined {
  const strength = evidenceStrength(evidence)
  if (strength === "unknown") return "Recorded before answer sets were tracked, so how much it rests on is unknown."
  if (strength !== "thin") return undefined
  if (evidence.events === 1 && evidence.responses > 1) {
    return `All ${evidence.responses} responses came from one answer set.`
  }
  return `Based on ${evidence.events} answer ${evidence.events === 1 ? "set" : "sets"}.`
}

export function describeExpectation(input: { taught: boolean; counts: LevelCounts; evidence: Evidence }): ExpectationStatus {
  const { taught, counts, evidence } = input
  const responses = totalOf(counts)
  const low = counts.level1 + counts.level2
  const checked = responses > 0
  return {
    state: checked ? "checked" : taught ? "taught" : "not-taught",
    level: checked ? computeReadinessLevel(counts) : null,
    gap: isGap(counts),
    lowShare: lowShareOf(counts),
    low,
    responses,
    evidence: evidenceStrength(evidence),
    hedge: checked ? hedgeFor(evidence) : undefined,
  }
}

// How far a gap's ranking is discounted for resting on few answer sets. A thin
// result still shows (a whole class struggling in one group check is worth
// seeing), but it doesn't outrank one the class answered individually.
const CONFIDENCE_WEIGHT: Record<EvidenceStrength, number> = {
  strong: 1,
  medium: 0.85,
  thin: 0.6,
  unknown: 0.6,
  none: 0,
}

/** Orders gaps, largest and best-evidenced first. Higher sorts first. */
export function gapRank(status: ExpectationStatus): number {
  return (status.lowShare ?? 0) * CONFIDENCE_WEIGHT[status.evidence]
}
