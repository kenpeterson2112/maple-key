import type { LessonMetadata } from "./lesson-metadata"
import type { Band } from "./assessment-types"
import { overallCodeOf, groupByOverall } from "./curriculum-codes"

const STORAGE_KEY = "maplekey_assessment_results"
// Parallel "sandbox" store + on/off flag. When sandbox mode is on, every read/write
// below targets the sandbox key instead of the real one — so the sample-data
// generator can fill an imaginary dataset and you can flip back to your true data
// without ever mutating it.
const SANDBOX_KEY = "maplekey_assessment_results_sandbox"
const SANDBOX_FLAG = "maplekey_assessment_sandbox"

export function isSandboxMode(): boolean {
  try {
    return localStorage.getItem(SANDBOX_FLAG) === "1"
  } catch {
    return false
  }
}

export function setSandboxMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(SANDBOX_FLAG, "1")
    else localStorage.removeItem(SANDBOX_FLAG)
  } catch {
    // ignore
  }
}

function activeKey(): string {
  return isSandboxMode() ? SANDBOX_KEY : STORAGE_KEY
}

export interface BandCounts {
  strong: number
  developing: number
  needsSupport: number
}

// Whole-class aggregate for one lesson. Stores totals only — never individual
// student responses. The snapshot fields make the master dashboard independent
// of the lesson log's 20-entry cap.
export interface LessonTally {
  lessonId: string
  title: string
  grade: string
  subject: string
  codes: string[]
  updatedAt: number
  attempts: number
  byExpectation: Record<string, BandCounts>
}

type Store = Record<string, LessonTally>

function read(): Store {
  try {
    const raw = localStorage.getItem(activeKey())
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(activeKey(), JSON.stringify(store))
  } catch {
    // Storage quota exceeded — skip.
  }
}

function emptyCounts(): BandCounts {
  return { strong: 0, developing: 0, needsSupport: 0 }
}

export function getLessonTally(lessonId: string): LessonTally | null {
  return read()[lessonId] ?? null
}

export function getAllTallies(): LessonTally[] {
  return Object.values(read()).sort((a, b) => b.updatedAt - a.updatedAt)
}

// Record one completed quick check as anonymous class totals.
// Pass count > 1 for a group response (same answers, multiple students).
export function recordAttempt(lesson: LessonMetadata, perCodeBand: Record<string, Band>, count = 1): void {
  const store = read()
  const tally: LessonTally = store[lesson.id] ?? {
    lessonId: lesson.id,
    title: lesson.title,
    grade: lesson.grade,
    subject: lesson.subject,
    codes: lesson.curriculumCodesCovered ?? [],
    updatedAt: Date.now(),
    attempts: 0,
    byExpectation: {},
  }
  tally.title = lesson.title
  tally.grade = lesson.grade
  tally.subject = lesson.subject
  if (lesson.curriculumCodesCovered?.length) tally.codes = lesson.curriculumCodesCovered
  tally.updatedAt = Date.now()
  tally.attempts += count
  for (const [code, band] of Object.entries(perCodeBand)) {
    const counts = (tally.byExpectation[code] ??= emptyCounts())
    counts[band] += count
  }
  store[lesson.id] = tally
  write(store)
}

export function clearLessonTally(lessonId: string): void {
  const store = read()
  if (!(lessonId in store)) return
  delete store[lessonId]
  write(store)
}

// Write precomputed tallies straight into the store, overwriting by lessonId.
// Used by the sample-data generator (see src/lib/dev-seed.ts), which is currently
// enabled in all builds. Not part of the normal Quick Check recording path.
export function seedTallies(tallies: LessonTally[]): void {
  const store = read()
  for (const t of tallies) store[t.lessonId] = t
  write(store)
}

// Remove every tally in the active store. In sandbox mode this clears only the
// sandbox — the real data is in a different key and stays untouched.
export function clearAllResults(): void {
  try {
    localStorage.removeItem(activeKey())
  } catch {
    // ignore
  }
}

// ---- Aggregation for dashboards ----
export interface OverallAggregate {
  overall: string
  bands: BandCounts
  specifics: Record<string, BandCounts>
}

export interface AggregatedResults {
  overall: Record<string, OverallAggregate>
  attempts: number
  hasData: boolean
}

function addInto(target: BandCounts, src: BandCounts): void {
  target.strong += src.strong
  target.developing += (src.developing ?? 0)
  target.needsSupport += src.needsSupport
}

function rollUp(byExpectation: Record<string, BandCounts>): Record<string, OverallAggregate> {
  const overall: Record<string, OverallAggregate> = {}
  for (const [code, counts] of Object.entries(byExpectation)) {
    const oc = overallCodeOf(code)
    const agg = (overall[oc] ??= { overall: oc, bands: emptyCounts(), specifics: {} })
    addInto(agg.bands, counts)
    const spec = (agg.specifics[code] ??= emptyCounts())
    addInto(spec, counts)
  }
  return overall
}

export function aggregateLesson(tally: LessonTally | null): AggregatedResults {
  if (!tally) return { overall: {}, attempts: 0, hasData: false }
  const overall = rollUp(tally.byExpectation)
  return { overall, attempts: tally.attempts, hasData: Object.keys(overall).length > 0 && tally.attempts > 0 }
}

export function aggregateAll(tallies: LessonTally[]): AggregatedResults {
  const merged: Record<string, BandCounts> = {}
  let attempts = 0
  for (const t of tallies) {
    attempts += t.attempts
    for (const [code, counts] of Object.entries(t.byExpectation)) {
      addInto((merged[code] ??= emptyCounts()), counts)
    }
  }
  return { overall: rollUp(merged), attempts, hasData: Object.keys(merged).length > 0 }
}

// Sum recorded band counts per code for the given expectation codes.
// Returned object only contains entries for codes with at least one recorded response.
export function getProgressForCodes(codes: string[]): Record<string, BandCounts> {
  if (codes.length === 0) return {}
  const wanted = new Set(codes)
  const out: Record<string, BandCounts> = {}
  for (const t of Object.values(read())) {
    for (const [code, counts] of Object.entries(t.byExpectation)) {
      if (!wanted.has(code)) continue
      addInto((out[code] ??= emptyCounts()), counts)
    }
  }
  return out
}

// ---- Readiness levels ----
export type ReadinessLevel = "poor" | "okay" | "good" | "great"

export function computeReadinessLevel(counts: BandCounts): ReadinessLevel {
  const total = counts.strong + counts.developing + counts.needsSupport
  if (total === 0) return "okay" // fallback; callers should gate on hasData first
  if (counts.strong / total >= 0.8) return "great"
  if (counts.strong / total >= 0.5) return "good"
  if (counts.needsSupport / total >= 0.5) return "poor"
  return "okay"
}

// Returns a readiness level for each code that has recorded data.
// Codes with no data are omitted from the result.
export function getReadinessForCodes(codes: string[]): Record<string, ReadinessLevel> {
  const progress = getProgressForCodes(codes)
  const out: Record<string, ReadinessLevel> = {}
  for (const [code, counts] of Object.entries(progress)) {
    const total = counts.strong + counts.developing + counts.needsSupport
    if (total > 0) out[code] = computeReadinessLevel(counts)
  }
  return out
}

export interface OverallReadiness {
  overall: string // e.g. "D1"
  level: ReadinessLevel // count-weighted rollup of the children below
  children: { code: string; level: ReadinessLevel | null }[] // level === null → not assessed
}

// Group `codes` by their overall expectation (D1.1 → D1) and roll each overall's
// recorded band counts up into a single count-weighted readiness level — the same
// semantics as the dashboard rollUp. Pure: reads no storage, only the provided
// code → counts map. Overalls with no recorded data are omitted.
export function summarizeReadiness(
  codes: string[],
  progress: Record<string, BandCounts>,
): OverallReadiness[] {
  const out: OverallReadiness[] = []
  for (const [overall, childCodes] of Object.entries(groupByOverall(codes))) {
    const summed = emptyCounts()
    const children = childCodes.map((code) => {
      const counts = progress[code]
      const total = counts ? counts.strong + counts.developing + counts.needsSupport : 0
      if (total > 0) addInto(summed, counts)
      return { code, level: total > 0 ? computeReadinessLevel(counts) : null }
    })
    const total = summed.strong + summed.developing + summed.needsSupport
    if (total === 0) continue
    out.push({ overall, level: computeReadinessLevel(summed), children })
  }
  return out
}
