import type { LessonMetadata } from "./lesson-metadata"
import type { ProficiencyLevel } from "./assessment-types"
import { overallCodeOf, overallTitle, groupByOverall, groupByStrand, strandLabel, isExpectationCode } from "./curriculum-codes"

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

export interface LevelCounts {
  level1: number
  level2: number
  level3: number
  level4: number
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
  byExpectation: Record<string, LevelCounts>
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

function emptyCounts(): LevelCounts {
  return { level1: 0, level2: 0, level3: 0, level4: 0 }
}

export function getLessonTally(lessonId: string): LessonTally | null {
  return read()[lessonId] ?? null
}

export function getAllTallies(): LessonTally[] {
  return Object.values(read()).sort((a, b) => b.updatedAt - a.updatedAt)
}

// Record one completed quick check as anonymous class totals.
// Pass count > 1 for a group response (same answers, multiple students).
export function recordAttempt(lesson: LessonMetadata, perCodeLevel: Record<string, ProficiencyLevel>, count = 1): void {
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
  for (const [code, level] of Object.entries(perCodeLevel)) {
    const counts = (tally.byExpectation[code] ??= emptyCounts())
    counts[level] += count
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
  bands: LevelCounts
  specifics: Record<string, LevelCounts>
}

export interface AggregatedResults {
  overall: Record<string, OverallAggregate>
  attempts: number
  hasData: boolean
}

function addInto(target: LevelCounts, src: LevelCounts): void {
  target.level1 += src.level1
  target.level2 += src.level2
  target.level3 += src.level3
  target.level4 += src.level4
}

function rollUp(byExpectation: Record<string, LevelCounts>): Record<string, OverallAggregate> {
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
  const merged: Record<string, LevelCounts> = {}
  let attempts = 0
  for (const t of tallies) {
    attempts += t.attempts
    for (const [code, counts] of Object.entries(t.byExpectation)) {
      addInto((merged[code] ??= emptyCounts()), counts)
    }
  }
  return { overall: rollUp(merged), attempts, hasData: Object.keys(merged).length > 0 }
}

// Sum recorded level counts per code for the given expectation codes.
// Returned object only contains entries for codes with at least one recorded response.
export function getProgressForCodes(codes: string[]): Record<string, LevelCounts> {
  if (codes.length === 0) return {}
  const wanted = new Set(codes)
  const out: Record<string, LevelCounts> = {}
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

export function computeReadinessLevel(counts: LevelCounts): ReadinessLevel {
  const total = counts.level1 + counts.level2 + counts.level3 + counts.level4
  if (total === 0) return "okay" // fallback; callers should gate on hasData first
  if (counts.level4 / total >= 0.8) return "great"
  if ((counts.level3 + counts.level4) / total >= 0.5) return "good"
  if (counts.level1 / total >= 0.5) return "poor"
  return "okay"
}

// Returns a readiness level for each code that has recorded data.
// Codes with no data are omitted from the result.
export function getReadinessForCodes(codes: string[]): Record<string, ReadinessLevel> {
  const progress = getProgressForCodes(codes)
  const out: Record<string, ReadinessLevel> = {}
  for (const [code, counts] of Object.entries(progress)) {
    const total = counts.level1 + counts.level2 + counts.level3 + counts.level4
    if (total > 0) out[code] = computeReadinessLevel(counts)
  }
  return out
}

// `orderedCodes` must already be in curriculum sequence. Returns the index of
// the class's current frontier — the first code with no recorded data, or the
// first code whose readiness is still "poor"/"okay" — i.e. where the class's
// real progress currently sits. Returns `orderedCodes.length` when every code
// reads "good"/"great" (nothing left to recommend next in this sequence).
export function frontierIndex(orderedCodes: string[], progress: Record<string, LevelCounts>): number {
  for (let i = 0; i < orderedCodes.length; i++) {
    const counts = progress[orderedCodes[i]]
    const total = counts ? counts.level1 + counts.level2 + counts.level3 + counts.level4 : 0
    if (total === 0) return i
    const readiness = computeReadinessLevel(counts)
    if (readiness === "poor" || readiness === "okay") return i
  }
  return orderedCodes.length
}

export interface OverallCoverage {
  overall: string // e.g. "D1"
  // Count-weighted rollup of the children below, or null when the class has no
  // recorded data for this overall yet (caller should render a neutral pill).
  level: ReadinessLevel | null
  children: { code: string; level: ReadinessLevel | null }[] // level === null → not assessed
}

// Group `codes` by their overall expectation (D1.1 → D1), returning one entry
// per overall the resource covers, in curriculum order (A1, A2, B1 … — numeric
// so C2 precedes C10). Each overall's recorded level counts roll up into a single
// count-weighted readiness level using the same semantics as the dashboard;
// overalls the class hasn't assessed yet carry level: null rather than being
// dropped, so a card can always show every expectation a resource targets.
// Pure: reads no storage, only the provided code → counts map.
export function coverageForResource(
  codes: string[],
  progress: Record<string, LevelCounts>,
): OverallCoverage[] {
  const out: OverallCoverage[] = []
  for (const [overall, childCodes] of Object.entries(groupByOverall(codes))) {
    const summed = emptyCounts()
    const children = [...childCodes]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((code) => {
        const counts = progress[code]
        const total = counts ? counts.level1 + counts.level2 + counts.level3 + counts.level4 : 0
        if (total > 0) addInto(summed, counts)
        return { code, level: total > 0 ? computeReadinessLevel(counts) : null }
      })
    const total = summed.level1 + summed.level2 + summed.level3 + summed.level4
    out.push({ overall, level: total > 0 ? computeReadinessLevel(summed) : null, children })
  }
  return out.sort((a, b) => a.overall.localeCompare(b.overall, undefined, { numeric: true }))
}

// ---- Coverage tree (taught vs assessed) ----
export interface SpecificCoverage {
  code: string
  counts: LevelCounts // empty if not yet assessed
  assessed: boolean
}

export interface CoverageNode {
  code: string // overall code (e.g. "D1") or strand code (e.g. "D")
  label: string
  specifics: SpecificCoverage[]
  bands: LevelCounts // sum of assessed specifics' counts
  coverageFraction: number // assessedCount / specifics.length, 0 when empty
}

// Build one node per overall expectation that appears in `tally.codes`
// (taught) or `tally.byExpectation` (assessed) across the given tallies.
// Each node's `specifics` lists every taught code under that overall, marking
// which ones have recorded assessment data — the basis for the orb
// dashboard's coverage-based fill.
export function buildOverallCoverage(tallies: LessonTally[], subject: string, grade?: string): CoverageNode[] {
  const taught = new Set<string>()
  const assessed: Record<string, LevelCounts> = {}
  for (const t of tallies) {
    for (const code of t.codes) if (isExpectationCode(code)) taught.add(code)
    for (const [code, counts] of Object.entries(t.byExpectation)) {
      if (!isExpectationCode(code)) continue
      taught.add(code)
      addInto((assessed[code] ??= emptyCounts()), counts)
    }
  }

  const out: CoverageNode[] = []
  for (const [overall, codes] of Object.entries(groupByOverall([...taught]))) {
    const specifics: SpecificCoverage[] = [...codes]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((code) => ({
        code,
        counts: assessed[code] ?? emptyCounts(),
        assessed: code in assessed,
      }))
    const bands = emptyCounts()
    let assessedCount = 0
    for (const spec of specifics) {
      if (spec.assessed) {
        addInto(bands, spec.counts)
        assessedCount++
      }
    }
    out.push({
      code: overall,
      label: overallTitle(subject, overall, grade),
      specifics,
      bands,
      coverageFraction: specifics.length > 0 ? assessedCount / specifics.length : 0,
    })
  }
  return out.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
}

// Groups overall coverage nodes into strand-level nodes via groupByStrand.
export function buildStrandCoverage(overallNodes: CoverageNode[], subject: string, grade?: string): CoverageNode[] {
  const groups = groupByStrand(overallNodes.map((n) => n.code))
  const byCode = new Map(overallNodes.map((n) => [n.code, n]))

  const out: CoverageNode[] = []
  for (const [strand, overalls] of Object.entries(groups)) {
    const children = overalls.map((code) => byCode.get(code)).filter((n): n is CoverageNode => !!n)
    const specifics = children.flatMap((n) => n.specifics)
    const bands = emptyCounts()
    let assessedCount = 0
    for (const spec of specifics) {
      if (spec.assessed) {
        addInto(bands, spec.counts)
        assessedCount++
      }
    }
    out.push({
      code: strand,
      label: strandLabel(subject, strand, grade),
      specifics,
      bands,
      coverageFraction: specifics.length > 0 ? assessedCount / specifics.length : 0,
    })
  }
  return out.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
}
