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
  notifyResultsChanged()
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
  // Total recorded RESPONSES. A group entry of 24 students adds 24 here from a
  // single tap, so this counts students represented — not independent evidence.
  attempts: number
  // Distinct recording EVENTS — how many times Record was pressed. One group
  // entry is one event no matter how many students it covers, so this is what
  // says how much independent evidence a number rests on. Absent on tallies
  // written before event tracking: treat missing as unknown, never as zero.
  events?: number
  byExpectation: Record<string, LevelCounts>
  // Per-code twin of `events`, same absence rule.
  eventsByExpectation?: Record<string, number>
  // Set when a tally carries responses recorded before event tracking existed.
  // Those responses can never be attributed to events, so every code in this
  // tally reports unknown evidence rather than a count that reads stronger
  // than it is.
  hasUntrackedResponses?: boolean
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
  notifyResultsChanged()
}

// ---- Change notification ----
// Components that read this store (e.g. resource cards' readiness pills) may
// stay mounted across tab switches — App.tsx keeps Resources as an "always-on"
// background layer — so a plain useMemo([data]) never learns that a sibling
// component (the dev-seed sandbox control, a Quick Check) just wrote new
// results. This lets useSyncExternalStore subscribers re-read storage on change.
let resultsVersion = 0
const resultsListeners = new Set<() => void>()

function notifyResultsChanged(): void {
  resultsVersion++
  for (const listener of resultsListeners) listener()
}

export function subscribeResultsChanged(listener: () => void): () => void {
  resultsListeners.add(listener)
  return () => resultsListeners.delete(listener)
}

export function getResultsVersion(): number {
  return resultsVersion
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
    events: 0,
    byExpectation: {},
    eventsByExpectation: {},
  }
  // A tally with responses but no event count predates this tracking. Its
  // history can't be reconstructed, so flag it once — permanently — rather
  // than letting new events imply the old responses were independent too.
  if (tally.events === undefined && tally.attempts > 0) tally.hasUntrackedResponses = true
  tally.title = lesson.title
  tally.grade = lesson.grade
  tally.subject = lesson.subject
  if (lesson.curriculumCodesCovered?.length) tally.codes = lesson.curriculumCodesCovered
  tally.updatedAt = Date.now()
  tally.attempts += count
  tally.events = (tally.events ?? 0) + 1
  const events = (tally.eventsByExpectation ??= {})
  for (const [code, level] of Object.entries(perCodeLevel)) {
    const counts = (tally.byExpectation[code] ??= emptyCounts())
    counts[level] += count
    events[code] = (events[code] ?? 0) + 1
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
  notifyResultsChanged()
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

// ---- Evidence strength ----
// How much a number can be leaned on, kept separate from what the number says.
// `responses` counts students represented; `events` counts distinct recording
// events. They diverge whenever group entry is used — one tap covering 24
// students is 24 responses but a single answer set, and a single answer set
// tells you one thing however many students it is attributed to. Ranking
// confidence on responses would read that as the strongest evidence in the
// class, so every confidence judgement here keys on events.
export interface Evidence {
  responses: number
  events: number
  // False when some contributing responses predate event tracking, making
  // `events` an undercount. Callers must show "unknown", not a weak reading.
  known: boolean
}

export type EvidenceStrength = "none" | "unknown" | "thin" | "medium" | "strong"

// Thresholds are in answer sets, not students: under 4 is a handful of
// voices, 10+ means a substantial share of a typical 20-30 student class
// answered separately. A class checked only through group entry stays "thin"
// however many students it covers — which is the honest reading, and the
// prompt to run one individual check before acting on it.
const MEDIUM_EVIDENCE = 4
const STRONG_EVIDENCE = 10

export function emptyEvidence(): Evidence {
  return { responses: 0, events: 0, known: true }
}

export function evidenceStrength(evidence: Evidence): EvidenceStrength {
  if (evidence.responses === 0) return "none"
  if (!evidence.known) return "unknown"
  if (evidence.events >= STRONG_EVIDENCE) return "strong"
  if (evidence.events >= MEDIUM_EVIDENCE) return "medium"
  return "thin"
}

function totalOfCounts(counts: LevelCounts): number {
  return counts.level1 + counts.level2 + counts.level3 + counts.level4
}

// Fold one tally's contribution for `code` into `target`.
function addEvidenceFrom(target: Evidence, tally: LessonTally, code: string, counts: LevelCounts): void {
  const responses = totalOfCounts(counts)
  if (responses === 0) return
  target.responses += responses
  const events = tally.eventsByExpectation?.[code]
  if (typeof events === "number" && !tally.hasUntrackedResponses) target.events += events
  else target.known = false
}

function addEvidenceInto(target: Evidence, src: Evidence): void {
  target.responses += src.responses
  target.events += src.events
  if (!src.known) target.known = false
}

// ---- Coverage tree (taught vs assessed) ----
export interface SpecificCoverage {
  code: string
  counts: LevelCounts // empty if not yet assessed
  assessed: boolean
  evidence: Evidence // how much independent evidence `counts` rests on
}

export interface CoverageNode {
  code: string // overall code (e.g. "D1") or strand code (e.g. "D")
  label: string
  specifics: SpecificCoverage[]
  bands: LevelCounts // sum of assessed specifics' counts
  coverageFraction: number // assessedCount / specifics.length, 0 when empty
  evidence: Evidence // sum of assessed specifics' evidence
}

// Build one node per overall expectation that appears in `tally.codes`
// (taught) or `tally.byExpectation` (assessed) across the given tallies.
// Each node's `specifics` lists every taught code under that overall, marking
// which ones have recorded assessment data — the basis for the orb
// dashboard's coverage-based fill.
export function buildOverallCoverage(tallies: LessonTally[], subject: string, grade?: string): CoverageNode[] {
  const taught = new Set<string>()
  const assessed: Record<string, LevelCounts> = {}
  const evidence: Record<string, Evidence> = {}
  for (const t of tallies) {
    for (const code of t.codes) if (isExpectationCode(code)) taught.add(code)
    for (const [code, counts] of Object.entries(t.byExpectation)) {
      if (!isExpectationCode(code)) continue
      taught.add(code)
      addInto((assessed[code] ??= emptyCounts()), counts)
      addEvidenceFrom((evidence[code] ??= emptyEvidence()), t, code, counts)
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
        evidence: evidence[code] ?? emptyEvidence(),
      }))
    const bands = emptyCounts()
    const nodeEvidence = emptyEvidence()
    let assessedCount = 0
    for (const spec of specifics) {
      if (spec.assessed) {
        addInto(bands, spec.counts)
        addEvidenceInto(nodeEvidence, spec.evidence)
        assessedCount++
      }
    }
    out.push({
      code: overall,
      label: overallTitle(subject, overall, grade),
      specifics,
      bands,
      coverageFraction: specifics.length > 0 ? assessedCount / specifics.length : 0,
      evidence: nodeEvidence,
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
    const nodeEvidence = emptyEvidence()
    let assessedCount = 0
    for (const spec of specifics) {
      if (spec.assessed) {
        addInto(bands, spec.counts)
        addEvidenceInto(nodeEvidence, spec.evidence)
        assessedCount++
      }
    }
    out.push({
      code: strand,
      label: strandLabel(subject, strand, grade),
      specifics,
      bands,
      coverageFraction: specifics.length > 0 ? assessedCount / specifics.length : 0,
      evidence: nodeEvidence,
    })
  }
  return out.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
}
