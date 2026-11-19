// Where a class stands in one subject and grade: which expectations have been
// taught (a saved lesson covered them, or a Quick Check recorded them), which
// have been checked, and how the class did. The top nav's context strip draws
// from this; the curriculum itself comes from curriculum-codes.ts, so the
// denominator is the real Ontario curriculum, not just what has been taught.
//
// Pure: takes tallies and lessons, reads no storage. `useClassProgress` in
// context-nav.tsx feeds it.

import { curriculumOutline } from "./curriculum-codes"
import {
  computeReadinessLevel,
  type LessonTally,
  type LevelCounts,
  type ReadinessLevel,
} from "./assessment-results"
import type { LessonMetadata } from "./lesson-metadata"
import { normalizeSubject } from "./subjects"
import { normalizeGrades } from "./utils"

export interface OverallProgress {
  code: string
  title: string
  total: number
  taught: number
  checked: number
  /** Rolled-up readiness over the checked specifics; null when none checked. */
  level: ReadinessLevel | null
  /** Share of recorded responses at Level 1 or 2, 0–1; null when none checked. */
  lowShare: number | null
}

export interface StrandProgress {
  code: string
  label: string
  total: number
  taught: number
  overalls: OverallProgress[]
}

export interface ClassProgress {
  strands: StrandProgress[]
  /** Strands with no specific expectations (Math's A: SEL and the processes). */
  ongoingStrands: { code: string; label: string }[]
  total: number
  taught: number
  checked: number
  /** The overall the class is working on: the first one started but not yet secure. */
  frontier: string | null
  /** The checked overall with the largest share at Level 1–2, if any is struggling. */
  needsWork: OverallProgress | null
  lessonCount: number
  lastCheckAt: number | null
}

function gradeOf(grade: string | undefined): string {
  return normalizeGrades([grade ?? ""])[0] ?? ""
}

function sameClass(subject: string, grade: string, s: string, g: string): boolean {
  return normalizeSubject(s) === normalizeSubject(subject) && gradeOf(g) === grade
}

function add(a: LevelCounts, b: LevelCounts): void {
  a.level1 += b.level1
  a.level2 += b.level2
  a.level3 += b.level3
  a.level4 += b.level4
}

const total = (c: LevelCounts) => c.level1 + c.level2 + c.level3 + c.level4

export function buildClassProgress(
  subject: string,
  gradeInput: string,
  tallies: LessonTally[],
  lessons: LessonMetadata[],
): ClassProgress | null {
  const grade = gradeOf(gradeInput)
  const outline = curriculumOutline(subject, grade)
  if (!subject || !grade || outline.length === 0) return null

  const myTallies = tallies.filter((t) => sameClass(subject, grade, t.subject, t.grade))
  const myLessons = lessons.filter((l) => sameClass(subject, grade, l.subject, l.grade))

  const taught = new Set<string>()
  const counts: Record<string, LevelCounts> = {}
  for (const l of myLessons) for (const c of l.curriculumCodesCovered ?? []) taught.add(c)
  for (const t of myTallies) {
    for (const c of t.codes) taught.add(c)
    for (const [c, lc] of Object.entries(t.byExpectation)) {
      if (total(lc) === 0) continue
      taught.add(c)
      add((counts[c] ??= { level1: 0, level2: 0, level3: 0, level4: 0 }), lc)
    }
  }

  const strands: StrandProgress[] = []
  const ongoingStrands: { code: string; label: string }[] = []
  for (const s of outline) {
    const overalls: OverallProgress[] = s.overalls
      .filter((o) => o.specifics.length > 0)
      .map((o) => {
        const sum = { level1: 0, level2: 0, level3: 0, level4: 0 }
        let checked = 0
        for (const code of o.specifics) {
          if (counts[code]) {
            add(sum, counts[code])
            checked++
          }
        }
        const n = total(sum)
        return {
          code: o.code,
          title: o.title,
          total: o.specifics.length,
          taught: o.specifics.filter((c) => taught.has(c)).length,
          checked,
          level: n > 0 ? computeReadinessLevel(sum) : null,
          lowShare: n > 0 ? (sum.level1 + sum.level2) / n : null,
        }
      })
    if (overalls.length === 0) {
      ongoingStrands.push({ code: s.code, label: s.label })
      continue
    }
    strands.push({
      code: s.code,
      label: s.label,
      total: overalls.reduce((n, o) => n + o.total, 0),
      taught: overalls.reduce((n, o) => n + o.taught, 0),
      overalls,
    })
  }

  const all = strands.flatMap((s) => s.overalls)
  const started = all.filter((o) => o.taught > 0)
  const frontier =
    started.find((o) => o.taught < o.total || o.level === "poor" || o.level === "okay")?.code ??
    all.find((o) => o.taught === 0)?.code ??
    null
  const struggling = all
    .filter((o) => o.lowShare !== null && (o.level === "poor" || o.level === "okay"))
    .sort((a, b) => (b.lowShare ?? 0) - (a.lowShare ?? 0))

  return {
    strands,
    ongoingStrands,
    total: all.reduce((n, o) => n + o.total, 0),
    taught: all.reduce((n, o) => n + o.taught, 0),
    checked: all.reduce((n, o) => n + o.checked, 0),
    frontier,
    needsWork: struggling[0] ?? null,
    lessonCount: myLessons.length,
    lastCheckAt: myTallies.reduce<number | null>((max, t) => (max === null || t.updatedAt > max ? t.updatedAt : max), null),
  }
}

export interface OverallSummary {
  /** Distinct subject + grade pairs with any lesson or Quick Check. */
  classes: { subject: string; grade: string }[]
  lessonsThisWeek: number
  lastCheckAt: number | null
}

export function buildOverallSummary(tallies: LessonTally[], lessons: LessonMetadata[], now = Date.now()): OverallSummary {
  const seen = new Map<string, { subject: string; grade: string }>()
  for (const x of [...lessons, ...tallies]) {
    const subject = normalizeSubject(x.subject ?? "")
    const grade = gradeOf(x.grade)
    if (subject && grade) seen.set(`${subject}|${grade}`, { subject, grade })
  }
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  return {
    classes: [...seen.values()],
    lessonsThisWeek: lessons.filter((l) => l.timestamp >= weekAgo).length,
    lastCheckAt: tallies.reduce<number | null>((max, t) => (max === null || t.updatedAt > max ? t.updatedAt : max), null),
  }
}

export interface AttentionItem {
  subject: string
  grade: string
  overall: OverallProgress
}

/**
 * The overall expectations classes are struggling with most, across every
 * class: checked, rolled up to "Needs Support" or "Developing", ranked by the
 * share of responses at Level 1–2. Feeds the landing page's "Needs attention".
 */
export function buildNeedsAttention(tallies: LessonTally[], lessons: LessonMetadata[], limit = 5): AttentionItem[] {
  const items: AttentionItem[] = []
  for (const { subject, grade } of buildOverallSummary(tallies, lessons).classes) {
    const progress = buildClassProgress(subject, grade, tallies, lessons)
    if (!progress) continue
    for (const s of progress.strands) {
      for (const o of s.overalls) {
        if (o.lowShare !== null && (o.level === "poor" || o.level === "okay")) items.push({ subject, grade, overall: o })
      }
    }
  }
  return items.sort((a, b) => (b.overall.lowShare ?? 0) - (a.overall.lowShare ?? 0)).slice(0, limit)
}
