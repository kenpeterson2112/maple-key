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
import { curriculumGrades, expectationCodes } from "./curriculum-codes"
import { schoolDaysAgo } from "./week"

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

// Synthetic data models every student answering every code individually, so
// each response is its own recording event — the strongest evidence the real
// app can produce. Sample data should read that way rather than inheriting the
// "unknown evidence" state reserved for tallies predating event tracking.
function eventsFrom(byExpectation: Record<string, LevelCounts>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [code, c] of Object.entries(byExpectation)) {
    out[code] = c.level1 + c.level2 + c.level3 + c.level4
  }
  return out
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
// Every specific expectation of the real Ontario curriculum, per subject and
// grade (curriculum-codes.ts, from scripts/fetch-curriculum.py), so demo data
// renders exactly the structure, labels and wording real Quick Check results
// produce. One pool entry per subject/grade, in curriculum order.

interface SubjectPool {
  subject: string
  grades: string[]
  codes: string[]
}

const SEED_SUBJECTS = ["Math", "Language", "Science", "Social Studies", "FSL", "History", "Geography"]

const POOL: SubjectPool[] = SEED_SUBJECTS.flatMap((subject) =>
  curriculumGrades(subject).map((grade) => ({ subject, grades: [grade], codes: expectationCodes(subject, grade) })),
)

export const SANDBOX_SUBJECTS: string[] = Array.from(new Set(POOL.map((p) => p.subject)))

export const MIN_POSITION = 0.05
export const MAX_POSITION = 1

const DEV_PREFIX = "dev-seed:"

export interface SeedOptions {
  // 0..1 — how far through this subject's curriculum sequence the class has
  // progressed. Drives a frontier (covered → partial → not covered), not a
  // random sample, so generated data mirrors real sequential teaching.
  position: number
  level: CentralLevel
  spread: number
  // Omit to seed every subject in POOL; pass a subject to seed only its entries.
  scope?: { subject: string }
}
export type LevelSpread = Pick<SeedOptions, "level" | "spread">

// Splits an ordered code list at `position`: everything before the cut is
// "full" (fully covered), the single code at the cut is "partial" (in
// progress), everything after is "none" (not yet covered). Codes must already
// be in real curriculum sequence (POOL entries are).
function frontierSplit(codes: string[], position: number): { full: string[]; partial: string | null; none: string[] } {
  const fullCount = Math.min(codes.length, Math.floor(clamp01(position) * codes.length))
  return { full: codes.slice(0, fullCount), partial: codes[fullCount] ?? null, none: codes.slice(fullCount + 1) }
}

// What a real class looks like partway through the year: the expectations up
// to the frontier are taught, the rest aren't yet. Teachers check as they go,
// not after teaching everything, so most taught expectations have results but
// some are skipped (GAP_RATE), scattered through the taught stretch. The
// frontier code itself trails: one level down and fewer responses, so it reads
// as "in progress".
const GAP_RATE = 0.2

function buildFrontierCounts(
  codes: string[],
  position: number,
  level: CentralLevel,
  spread: number,
): { byExpectation: Record<string, LevelCounts>; attempts: number; taught: string[] } {
  const { full, partial } = frontierSplit(codes, position)
  const attempts = randInt(16, 28) // class size; every student answers every code
  const byExpectation: Record<string, LevelCounts> = {}
  for (const code of full) {
    if (Math.random() < GAP_RATE) continue // taught, not checked yet
    byExpectation[code] = generateCounts(level, spread, attempts)
  }
  if (partial) {
    const partialLevel = Math.max(1, level - 1) as CentralLevel
    byExpectation[partial] = generateCounts(partialLevel, spread, Math.max(4, Math.round(attempts * 0.4)))
  }
  return { byExpectation, attempts, taught: partial ? [...full, partial] : full }
}

// How many school days back the synthetic checks are spread over (three weeks).
const SPREAD_SCHOOL_DAYS = 15

// Class Insights (class-wide). Fabricates synthetic tallies so the subject folder
// tabs populate, each subject seeded as its own sequential frontier (covered →
// partial → not covered) through its ordered code list, for every grade the
// curriculum covers, so each grade tab shows the same frontier.
// `scope` narrows generation to one subject; omitted, every subject gets seeded
// independently at the same `position`. Idempotent: clears prior synthetic data
// first so re-generating replaces rather than piles up.
export function seedGlobal({ position, level, spread, scope }: SeedOptions): void {
  resetGlobal()
  const pools = scope ? POOL.filter((pool) => pool.subject === scope.subject) : POOL

  const now = Date.now()
  const tallies: LessonTally[] = []
  let i = 0
  for (const pool of pools) {
    for (const grade of pool.grades) {
      const { byExpectation, attempts, taught } = buildFrontierCounts(pool.codes, position, level, spread)
      tallies.push({
        lessonId: `${DEV_PREFIX}${pool.subject.toLowerCase().replace(/\s+/g, "-")}-g${grade}`,
        title: `Synthetic ${pool.subject} · Grade ${grade}`,
        grade,
        subject: pool.subject,
        // Only what's been taught so far: the rest of the year is still ahead.
        codes: taught,
        // Spread over the last few school weeks, as real checks would be.
        // Stamping them all "now" piled every class's check onto today in the
        // landing page's This week.
        updatedAt: schoolDaysAgo(now, i % SPREAD_SCHOOL_DAYS, i),
        attempts,
        events: attempts,
        byExpectation,
        eventsByExpectation: eventsFrom(byExpectation),
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

// A lesson's own codes are all "taught" together (not a curriculum span), so
// every code lands at the same level — no frontier here, unlike seedGlobal.
function buildCounts(codes: string[], level: CentralLevel, spread: number): { byExpectation: Record<string, LevelCounts>; attempts: number } {
  const attempts = randInt(16, 28)
  const byExpectation: Record<string, LevelCounts> = {}
  for (const code of codes) byExpectation[code] = generateCounts(level, spread, attempts)
  return { byExpectation, attempts }
}

// Quick Check modal — seed the one open lesson's expectations.
export function seedForLesson(lesson: LessonMetadata, { level, spread }: LevelSpread): void {
  const codes = (lesson.curriculumCodesCovered ?? []).filter(Boolean)
  if (codes.length === 0) return
  const { byExpectation, attempts } = buildCounts(codes, level, spread)
  // A check follows its lesson (an hour on), not the moment of seeding, so
  // seeding a whole library doesn't stack every check on today.
  const updatedAt = Math.min(Date.now(), Math.max(lesson.timestamp, 0) + 60 * 60_000)
  seedTallies([
    {
      lessonId: lesson.id,
      title: lesson.title,
      grade: lesson.grade,
      subject: lesson.subject,
      codes,
      updatedAt,
      attempts,
      events: attempts,
      byExpectation,
      eventsByExpectation: eventsFrom(byExpectation),
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
