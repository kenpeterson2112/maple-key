// Turns coverage data into the one decision a teacher makes between periods:
// re-teach it, work it in a small group, check it, or move on.
//
// Every threshold here is a judgement call about teaching, not a statistic, so
// they live together as named constants rather than scattered through the UI.
// Nothing in this file reads storage — it works off the coverage tree, which
// keeps it pure and lets the same rules serve any surface.

import type { CoverageNode, Evidence, EvidenceStrength, LevelCounts } from "./assessment-results"
import { evidenceStrength } from "./assessment-results"
import { levelProportions, totalOf } from "./orb-math"

export type TriageMove = "reteach" | "small-group" | "advance" | "check"

export const MOVE_META: Record<TriageMove, { label: string; blurb: string }> = {
  reteach: { label: "Re-teach", blurb: "Most of the class is not there yet — plan whole-class time." },
  "small-group": { label: "Small group", blurb: "Some students are stuck — pull a guided group, extend the rest." },
  advance: { label: "Move on", blurb: "The class is solid here." },
  check: { label: "Check it", blurb: "Taught, but never checked — no evidence either way." },
}

// Share of responses at level 1 that tips an expectation from "some students
// are stuck" to "the lesson did not land". Level 3+4 is the standard-met share
// that clears an expectation to move on.
const RETEACH_SHARE = 0.5
const SMALL_GROUP_SHARE = 0.2
const ADVANCE_SHARE = 0.75

// How far a result's ranking is discounted for resting on few answer sets. A
// thin result is not ignored — a whole class failing one group check is still
// worth a teacher's attention — but it should not outrank a problem the class
// answered individually.
const CONFIDENCE_WEIGHT: Record<EvidenceStrength, number> = {
  strong: 1,
  medium: 0.85,
  thin: 0.6,
  unknown: 0.6,
  none: 0,
}

export interface TriageItem {
  code: string
  counts: LevelCounts
  evidence: Evidence
  move: TriageMove
  // Ranking score: level-1 share minus level-4 share, discounted by how much
  // independent evidence it rests on. Higher is more urgent.
  score: number
  // Present when the evidence is too thin to act on without a second look.
  hedge?: string
}

export function classifyMove(counts: LevelCounts): TriageMove {
  if (totalOf(counts) === 0) return "check"
  const p = levelProportions(counts)
  if (p.level1 >= RETEACH_SHARE) return "reteach"
  if (p.level1 >= SMALL_GROUP_SHARE) return "small-group"
  if (p.level3 + p.level4 >= ADVANCE_SHARE) return "advance"
  return "small-group"
}

function hedgeFor(evidence: Evidence): string | undefined {
  const strength = evidenceStrength(evidence)
  if (strength === "unknown") return "Recorded before entries were tracked — confirm before acting on it."
  if (strength !== "thin") return undefined
  if (evidence.events === 1 && evidence.responses > 1) {
    return `All ${evidence.responses} responses came from one entry — one answer set, not ${evidence.responses} opinions.`
  }
  return `Rests on ${evidence.events} ${evidence.events === 1 ? "entry" : "entries"} — worth a second check.`
}

export interface TriageResult {
  // Expectations needing a teaching move, most urgent first.
  attention: TriageItem[]
  // Taught but never assessed — no score to rank on, so kept in curriculum order.
  unchecked: TriageItem[]
  // Assessed and clear; surfaced as a count, not a list.
  onTrack: TriageItem[]
}

const byCode = (a: TriageItem, b: TriageItem) => a.code.localeCompare(b.code, undefined, { numeric: true })

export function buildTriage(nodes: CoverageNode[]): TriageResult {
  const seen = new Set<string>()
  const attention: TriageItem[] = []
  const unchecked: TriageItem[] = []
  const onTrack: TriageItem[] = []

  for (const node of nodes) {
    for (const spec of node.specifics) {
      // Strand nodes re-list their overalls' specifics, so the same code can
      // arrive twice when both levels are passed in.
      if (seen.has(spec.code)) continue
      seen.add(spec.code)

      const move = classifyMove(spec.counts)
      const p = levelProportions(spec.counts)
      const item: TriageItem = {
        code: spec.code,
        counts: spec.counts,
        evidence: spec.evidence,
        move,
        score: (p.level1 - p.level4) * CONFIDENCE_WEIGHT[evidenceStrength(spec.evidence)],
        hedge: hedgeFor(spec.evidence),
      }

      if (move === "check") unchecked.push(item)
      else if (move === "advance") onTrack.push(item)
      else attention.push(item)
    }
  }

  attention.sort((a, b) => b.score - a.score || byCode(a, b))
  unchecked.sort(byCode)
  onTrack.sort(byCode)
  return { attention, unchecked, onTrack }
}
