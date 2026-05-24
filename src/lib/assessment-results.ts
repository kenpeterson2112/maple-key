import type { LessonMetadata } from "./lesson-metadata"
import type { Band } from "./assessment-types"
import { overallCodeOf } from "./curriculum-codes"

const STORAGE_KEY = "maplekey_assessment_results"

export interface BandCounts {
  strong: number
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
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage quota exceeded — skip.
  }
}

function emptyCounts(): BandCounts {
  return { strong: 0, needsSupport: 0 }
}

export function getLessonTally(lessonId: string): LessonTally | null {
  return read()[lessonId] ?? null
}

export function getAllTallies(): LessonTally[] {
  return Object.values(read()).sort((a, b) => b.updatedAt - a.updatedAt)
}

// Record one completed quick check as anonymous class totals.
export function recordAttempt(lesson: LessonMetadata, perCodeBand: Record<string, Band>): void {
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
  tally.attempts += 1
  for (const [code, band] of Object.entries(perCodeBand)) {
    const counts = (tally.byExpectation[code] ??= emptyCounts())
    counts[band] += 1
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
