// Where a class stands in one subject and grade: which expectations have been
// taught (a saved lesson covered them, or a Quick Check recorded them), which
// have been checked, and how the class did. The top nav's context strip draws
// from this; the curriculum itself comes from curriculum-codes.ts, so the
// denominator is the real Ontario curriculum, not just what has been taught.
//
// Pure: takes tallies and lessons, reads no storage. `useClassProgress` in
// context-nav.tsx feeds it.

import { curriculumOutline, overallCodeOf } from "./curriculum-codes"
import {
  addEvidenceFrom,
  computeReadinessLevel,
  emptyEvidence,
  type Evidence,
  type LessonTally,
  type LevelCounts,
  type ReadinessLevel,
} from "./assessment-results"
import { describeExpectation, gapRank, type ExpectationStatus } from "./expectation-status"
import type { LessonMetadata } from "./lesson-metadata"
import { normalizeSubject } from "./subjects"
import { normalizeGrades } from "./utils"

/** A lesson that covered an expectation, from the lesson log or a Quick Check. */
export interface CoveringLesson {
  id: string
  title: string
  timestamp: number
  /** False when only a Quick Check tally remembers it (the lesson log keeps 20): not openable. */
  inLog: boolean
}

export interface SpecificProgress {
  code: string
  /** A saved lesson covered it, or a Quick Check recorded it. */
  taught: boolean
  /** Readiness over this expectation's recorded responses; null when none. */
  level: ReadinessLevel | null
  /** Quick Check responses recorded against it. */
  responses: number
  /** Responses by level, summed across Quick Checks; zeros when unchecked. */
  counts: LevelCounts
  /** How many answer sets those responses rest on. */
  evidence: Evidence
  /** When a Quick Check last recorded it; null when never. */
  lastCheckedAt: number | null
  /** Lessons that covered it, newest first. */
  lessons: CoveringLesson[]
  /** State, gap and hedge, from the shared rules (expectation-status.ts). */
  status: ExpectationStatus
}

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
  /** Each specific expectation under it, in curriculum order. */
  specifics: SpecificProgress[]
  /** Responses by level across its specifics. */
  counts: LevelCounts
  evidence: Evidence
  lastCheckedAt: number | null
  /** Lessons that covered it or any of its specifics, newest first. */
  lessons: CoveringLesson[]
  status: ExpectationStatus
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
  /** The overall with the largest gap (expectation-status.ts), if any has one. */
  needsWork: OverallProgress | null
  lessonCount: number
  lastCheckAt: number | null
}

function gradeOf(grade: string | undefined): string {
  return normalizeGrades([grade ?? ""])[0] ?? ""
}

/** Does a lesson or tally fall inside a selection? An empty subject or grade
 *  means "all", so the landing page's widgets can follow the top nav's pickers. */
export function inSelection(selSubject: string, selGrade: string, s: string, g: string): boolean {
  if (selSubject && normalizeSubject(s ?? "") !== normalizeSubject(selSubject)) return false
  if (selGrade && gradeOf(g) !== gradeOf(selGrade)) return false
  return true
}

/** Is a lesson or tally (subject `s`, grade `g`) for this class? Normalises both. */
export function isSameClass(subject: string, grade: string, s: string, g: string): boolean {
  return sameClass(subject, gradeOf(grade), s, g)
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
const zero = (): LevelCounts => ({ level1: 0, level2: 0, level3: 0, level4: 0 })

function mergeEvidence(target: Evidence, src: Evidence): void {
  target.responses += src.responses
  target.events += src.events
  if (!src.known) target.known = false
}

function newestFirst(list: Iterable<CoveringLesson>): CoveringLesson[] {
  return [...list].sort((a, b) => b.timestamp - a.timestamp)
}

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
  const evidence: Record<string, Evidence> = {}
  const lastChecked: Record<string, number> = {}
  // Covering lessons by code. A lesson in the log wins over a tally's snapshot.
  const covering: Record<string, Map<string, CoveringLesson>> = {}
  const cover = (code: string, l: CoveringLesson) => {
    const m = (covering[code] ??= new Map())
    if (!m.get(l.id)?.inLog) m.set(l.id, l)
  }
  const inLog = new Set(myLessons.map((l) => l.id))
  for (const l of myLessons) {
    for (const c of l.curriculumCodesCovered ?? []) {
      taught.add(c)
      cover(c, { id: l.id, title: l.title, timestamp: l.timestamp, inLog: true })
    }
  }
  for (const t of myTallies) {
    const snapshot: CoveringLesson = { id: t.lessonId, title: t.title, timestamp: t.updatedAt, inLog: inLog.has(t.lessonId) }
    for (const c of t.codes) {
      taught.add(c)
      if (!snapshot.inLog) cover(c, snapshot)
    }
    for (const [c, lc] of Object.entries(t.byExpectation)) {
      if (total(lc) === 0) continue
      taught.add(c)
      add((counts[c] ??= zero()), lc)
      addEvidenceFrom((evidence[c] ??= emptyEvidence()), t, c, lc)
      lastChecked[c] = Math.max(lastChecked[c] ?? 0, t.updatedAt)
      if (!snapshot.inLog) cover(c, snapshot)
    }
  }

  const strands: StrandProgress[] = []
  const ongoingStrands: { code: string; label: string }[] = []
  for (const s of outline) {
    const overalls: OverallProgress[] = s.overalls
      .filter((o) => o.specifics.length > 0)
      .map((o): OverallProgress => {
        const sum = zero()
        const ev = emptyEvidence()
        let checked = 0
        for (const code of o.specifics) {
          if (counts[code]) {
            add(sum, counts[code])
            mergeEvidence(ev, evidence[code])
            checked++
          }
        }
        const n = total(sum)
        const specifics = o.specifics.map((code): SpecificProgress => {
          const c = counts[code] ?? zero()
          const e = evidence[code] ?? emptyEvidence()
          const r = total(c)
          return {
            code,
            taught: taught.has(code),
            level: r > 0 ? computeReadinessLevel(c) : null,
            responses: r,
            counts: c,
            evidence: e,
            lastCheckedAt: lastChecked[code] ?? null,
            lessons: newestFirst(covering[code]?.values() ?? []),
            status: describeExpectation({ taught: taught.has(code), counts: c, evidence: e }),
          }
        })
        const lessonsById = new Map<string, CoveringLesson>()
        for (const l of [...(covering[o.code]?.values() ?? []), ...specifics.flatMap((sp) => sp.lessons)]) {
          if (!lessonsById.get(l.id)?.inLog) lessonsById.set(l.id, l)
        }
        const taughtCount = o.specifics.filter((c) => taught.has(c)).length
        const lastCheckedAt = specifics.reduce<number | null>(
          (max, sp) => (sp.lastCheckedAt !== null && (max === null || sp.lastCheckedAt > max) ? sp.lastCheckedAt : max),
          null,
        )
        return {
          code: o.code,
          title: o.title,
          total: o.specifics.length,
          taught: taughtCount,
          checked,
          level: n > 0 ? computeReadinessLevel(sum) : null,
          lowShare: n > 0 ? (sum.level1 + sum.level2) / n : null,
          specifics,
          counts: sum,
          evidence: ev,
          lastCheckedAt,
          lessons: newestFirst(lessonsById.values()),
          status: describeExpectation({ taught: taughtCount > 0, counts: sum, evidence: ev }),
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
  // Where the class is: the furthest overall the most recent lesson reached
  // (the same point the next-step suggestion works from).
  const lastLesson = [...myLessons].sort((a, b) => b.timestamp - a.timestamp)[0]
  const lastOveralls = new Set((lastLesson?.curriculumCodesCovered ?? []).map((c) => overallCodeOf(c)))
  const reached = all.filter((o) => lastOveralls.has(o.code)).pop()
  // With no lessons, the furthest overall anything has been taught in: checks
  // happen as teaching goes, with gaps, so the first gap isn't where the class is.
  const furthestTaught = all.filter((o) => o.taught > 0).pop()
  const frontier = reached?.code ?? furthestTaught?.code ?? all[0]?.code ?? null
  const struggling = all.filter((o) => o.status.gap).sort((a, b) => gapRank(b.status) - gapRank(a.status))

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
 * The overall expectations with the largest gaps, across every class: more
 * than half the responses at Level 1–2 (expectation-status.ts), ranked by that
 * share, discounted for thin evidence. Feeds the landing page's "Needs attention".
 */
export function buildNeedsAttention(tallies: LessonTally[], lessons: LessonMetadata[], limit = 5): AttentionItem[] {
  const items: AttentionItem[] = []
  for (const { subject, grade } of buildOverallSummary(tallies, lessons).classes) {
    const progress = buildClassProgress(subject, grade, tallies, lessons)
    if (!progress) continue
    for (const s of progress.strands) {
      for (const o of s.overalls) {
        if (o.status.gap) items.push({ subject, grade, overall: o })
      }
    }
  }
  return items.sort((a, b) => gapRank(b.overall.status) - gapRank(a.overall.status)).slice(0, limit)
}
