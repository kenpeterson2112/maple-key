// Synthesizes fake/sample assessment results so the dashboards can be populated
// for demos, building, testing, and training without running real Quick Checks.
//
// NOTE: this is intentionally shipped in production for now — surfaced via the
// "Dev data" control on the assessment dashboards. There are no real users yet and
// the team wants the seeding available everywhere. It writes only to the same
// localStorage the real Quick Check uses, through the `seedTallies` seam.

import { seedTallies, clearLessonTally, clearAllResults, type LevelCounts, type LessonTally } from "./assessment-results"
import { LEVEL_ORDER } from "./assessment-types"
import type { LessonMetadata } from "./lesson-metadata"
import { describedCodes } from "./curriculum-codes"

export type CentralLevel = 1 | 2 | 3 | 4

// Per-student level probabilities chosen so a tight (spread≈0) sample lands on the
// matching dashboard badge — see `computeReadinessLevel` thresholds in
// assessment-results.ts (level4/total ≥.8 → great; (level3+level4)/total ≥.5 →
// good; level1/total ≥.5 → poor; else okay). CentralLevel 1-4 maps directly onto
// proficiency Level 1-4.
const CENTER: Record<CentralLevel, LevelCounts> = {
  1: { level1: 0.6, level2: 0.25, level3: 0.1, level4: 0.05 },
  2: { level1: 0.15, level2: 0.5, level3: 0.25, level4: 0.1 },
  3: { level1: 0.05, level2: 0.2, level3: 0.5, level4: 0.25 },
  4: { level1: 0.0, level2: 0.05, level3: 0.25, level4: 0.7 },
}
const UNIFORM: LevelCounts = { level1: 0.25, level2: 0.25, level3: 0.25, level4: 0.25 }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))

// Synthesize one expectation's level counts for `n` students at the given level and
// spread. spread 0 → tight around the level's center; spread 1 → ~uniform/random.
export function generateCounts(level: CentralLevel, spread: number, n: number): LevelCounts {
  const s = clamp01(spread)
  const c = CENTER[level]
  const p: LevelCounts = {
    level1: lerp(c.level1, UNIFORM.level1, s),
    level2: lerp(c.level2, UNIFORM.level2, s),
    level3: lerp(c.level3, UNIFORM.level3, s),
    level4: lerp(c.level4, UNIFORM.level4, s),
  }
  // A little jitter that grows with spread keeps totals from looking too clean.
  const jitter = (v: number) => v + (Math.random() - 0.5) * 2 * s * (n / 6)
  const counts: LevelCounts = {
    level1: Math.max(0, Math.round(jitter(p.level1 * n))),
    level2: Math.max(0, Math.round(jitter(p.level2 * n))),
    level3: Math.max(0, Math.round(jitter(p.level3 * n))),
    level4: Math.max(0, Math.round(jitter(p.level4 * n))),
  }
  return fixSum(counts, n)
}

// Nudge level counts so they sum to exactly `n` after rounding/jitter.
function fixSum(c: LevelCounts, n: number): LevelCounts {
  const out = { ...c }
  let sum = out.level1 + out.level2 + out.level3 + out.level4
  while (sum !== n) {
    if (sum < n) {
      const k = LEVEL_ORDER.reduce((a, b) => (out[a] >= out[b] ? a : b))
      out[k] += 1
      sum += 1
    } else {
      const positive = LEVEL_ORDER.filter((b) => out[b] > 0)
      const k = positive.reduce((a, b) => (out[a] >= out[b] ? a : b))
      out[k] -= 1
      sum -= 1
    }
  }
  return out
}

// --- Expectation pool -------------------------------------------------------
// Real Ontario curriculum codes per subject, drawn from the same code space the
// resource data uses. Codes group via `overallCodeOf` (split on ".") into clean
// overall expectations (e.g. B1.1/B1.2 → B1) and strands (first letter), so demo
// data renders exactly the structure real Quick Check results produce. Math also
// carries specific-expectation descriptions; the others degrade to code + strand.
interface SubjectPool {
  subject: string
  codes: string[]
}

const POOL: SubjectPool[] = [
  { subject: "Math", codes: describedCodes("Math") },
  { subject: "Language", codes: ["A1.1", "B1.1", "B2.1", "C1.1", "D1.1", "D2.1"] },
  { subject: "Science", codes: ["B1.1", "B1.2", "B2.1", "C1.1", "C2.1", "E1.1"] },
  { subject: "Social Studies", codes: ["A1.1", "A1.2", "A2.1", "B1.1", "B2.1", "B3.1"] },
  { subject: "FSL", codes: ["A1.1", "A2.1", "B1.1", "C1.1", "D1.1"] },
]

export const POOL_SIZE = POOL.reduce((sum, p) => sum + p.codes.length, 0)
export const MIN_QUANTITY = 5

const GRADES = ["4", "5", "6", "7", "8", "9"]
const DEV_PREFIX = "dev-seed:"

export interface SeedOptions {
  quantity: number
  level: CentralLevel
  spread: number
}
export type LevelSpread = Omit<SeedOptions, "quantity">

// Round-robin across subjects so even a small `quantity` spans several subject tabs.
function interleavedPairs(): { subject: string; code: string }[] {
  const out: { subject: string; code: string }[] = []
  const max = Math.max(...POOL.map((p) => p.codes.length))
  for (let i = 0; i < max; i++) {
    for (const p of POOL) if (i < p.codes.length) out.push({ subject: p.subject, code: p.codes[i] })
  }
  return out
}

function buildCounts(codes: string[], level: CentralLevel, spread: number): { byExpectation: Record<string, LevelCounts>; attempts: number } {
  const attempts = randInt(16, 28) // class size; every student answers every code
  const byExpectation: Record<string, LevelCounts> = {}
  for (const code of codes) byExpectation[code] = generateCounts(level, spread, attempts)
  return { byExpectation, attempts }
}

// Class Insights (class-wide). Fabricates synthetic tallies spread across subjects
// so the subject folder tabs populate, and replicated across every grade so each
// grade sub-tab shows the same full strand coverage rather than a sliver of it.
// Idempotent: clears prior synthetic data first so re-generating replaces rather
// than piles up.
export function seedGlobal({ quantity, level, spread }: SeedOptions): void {
  resetGlobal()
  const wanted = Math.max(MIN_QUANTITY, Math.min(Math.round(quantity), POOL_SIZE))
  const pairs = interleavedPairs().slice(0, wanted)

  const codesBySubject = new Map<string, string[]>()
  for (const { subject, code } of pairs) {
    const codes = codesBySubject.get(subject) ?? []
    codes.push(code)
    codesBySubject.set(subject, codes)
  }

  const now = Date.now()
  const tallies: LessonTally[] = []
  let i = 0
  for (const [subject, codes] of codesBySubject) {
    for (const grade of GRADES) {
      const { byExpectation, attempts } = buildCounts(codes, level, spread)
      tallies.push({
        lessonId: `${DEV_PREFIX}${subject.toLowerCase().replace(/\s+/g, "-")}-g${grade}`,
        title: `Synthetic ${subject} · Grade ${grade}`,
        grade,
        subject,
        codes,
        updatedAt: now - i * 60_000,
        attempts,
        byExpectation,
      })
      i++
    }
  }
  seedTallies(tallies)
}

// The sandbox is entirely synthetic, so a global reset clears the whole active store.
export function resetGlobal(): void {
  clearAllResults()
}

// Quick Check modal — seed the one open lesson's expectations.
export function seedForLesson(lesson: LessonMetadata, { level, spread }: LevelSpread): void {
  const codes = (lesson.curriculumCodesCovered ?? []).filter(Boolean)
  if (codes.length === 0) return
  const { byExpectation, attempts } = buildCounts(codes, level, spread)
  seedTallies([
    {
      lessonId: lesson.id,
      title: lesson.title,
      grade: lesson.grade,
      subject: lesson.subject,
      codes,
      updatedAt: Date.now(),
      attempts,
      byExpectation,
    },
  ])
}

export function resetLesson(id: string): void {
  clearLessonTally(id)
}

// Lessons Library — seed every logged lesson that has codes.
export function seedForLessons(lessons: LessonMetadata[], opts: LevelSpread): void {
  for (const l of lessons) seedForLesson(l, opts)
}

export function resetLessons(lessons: LessonMetadata[]): void {
  for (const l of lessons) clearLessonTally(l.id)
}
