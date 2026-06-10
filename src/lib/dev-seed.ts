// Synthesizes fake/sample assessment results so the dashboards can be populated
// for demos, building, testing, and training without running real Quick Checks.
//
// NOTE: this is intentionally shipped in production for now — surfaced via the
// "Dev data" control on the assessment dashboards. There are no real users yet and
// the team wants the seeding available everywhere. It writes only to the same
// localStorage the real Quick Check uses, through the `seedTallies` seam.

import { seedTallies, clearLessonTally, clearAllResults, type BandCounts, type LessonTally } from "./assessment-results"
import type { LessonMetadata } from "./lesson-metadata"
import { CURRICULUM_DESCRIPTIONS } from "./curriculum-codes"

export type CentralLevel = 1 | 2 | 3 | 4

// Per-student band probabilities chosen so a tight (spread≈0) sample lands on the
// matching dashboard badge — see `computeReadinessLevel` thresholds in
// assessment-results.ts (strong/total ≥.8 → great; ≥.5 → good; needs/total ≥.5 →
// poor; else okay). Levels: 1 Needs attention, 2 Developing, 3 Strong, 4 Excelling.
const CENTER: Record<CentralLevel, BandCounts> = {
  1: { strong: 0.05, developing: 0.25, needsSupport: 0.7 },
  2: { strong: 0.2, developing: 0.6, needsSupport: 0.2 },
  3: { strong: 0.65, developing: 0.3, needsSupport: 0.05 },
  4: { strong: 0.9, developing: 0.1, needsSupport: 0.0 },
}
const UNIFORM: BandCounts = { strong: 1 / 3, developing: 1 / 3, needsSupport: 1 / 3 }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1))

// Synthesize one expectation's band counts for `n` students at the given level and
// spread. spread 0 → tight around the level's center; spread 1 → ~uniform/random.
export function generateCounts(level: CentralLevel, spread: number, n: number): BandCounts {
  const s = clamp01(spread)
  const c = CENTER[level]
  const p: BandCounts = {
    strong: lerp(c.strong, UNIFORM.strong, s),
    developing: lerp(c.developing, UNIFORM.developing, s),
    needsSupport: lerp(c.needsSupport, UNIFORM.needsSupport, s),
  }
  // A little jitter that grows with spread keeps totals from looking too clean.
  const jitter = (v: number) => v + (Math.random() - 0.5) * 2 * s * (n / 6)
  const counts: BandCounts = {
    strong: Math.max(0, Math.round(jitter(p.strong * n))),
    developing: Math.max(0, Math.round(jitter(p.developing * n))),
    needsSupport: Math.max(0, Math.round(jitter(p.needsSupport * n))),
  }
  return fixSum(counts, n)
}

// Nudge band counts so they sum to exactly `n` after rounding/jitter.
function fixSum(c: BandCounts, n: number): BandCounts {
  const bands: (keyof BandCounts)[] = ["strong", "developing", "needsSupport"]
  const out = { ...c }
  let sum = out.strong + out.developing + out.needsSupport
  while (sum !== n) {
    if (sum < n) {
      const k = bands.reduce((a, b) => (out[a] >= out[b] ? a : b))
      out[k] += 1
      sum += 1
    } else {
      const positive = bands.filter((b) => out[b] > 0)
      const k = positive.reduce((a, b) => (out[a] >= out[b] ? a : b))
      out[k] -= 1
      sum -= 1
    }
  }
  return out
}

// --- Expectation pool -------------------------------------------------------
// Math uses the real curriculum codes (clean D1/D2/F1 rollups). Non-math subjects
// have no codes in the data, so we synthesize Parent.Child codes that still group
// via `overallCodeOf` (split on "."). They render their code as the label.
interface SubjectPool {
  subject: string
  codes: string[]
}

const POOL: SubjectPool[] = [
  { subject: "Mathematics", codes: Object.keys(CURRICULUM_DESCRIPTIONS) },
  { subject: "Language", codes: ["LR.1", "LR.2", "LW.1", "LW.2", "LO.1", "LM.1"] },
  { subject: "Science", codes: ["SL.1", "SL.2", "SE.1", "SM.1", "SS.1"] },
  { subject: "Social Studies", codes: ["SH.1", "SH.2", "SP.1", "SG.1"] },
  { subject: "FSL", codes: ["FA.1", "FA.2", "FB.1", "FC.1", "FC.2", "FD.1"] },
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

function buildCounts(codes: string[], level: CentralLevel, spread: number): { byExpectation: Record<string, BandCounts>; attempts: number } {
  const attempts = randInt(16, 28) // class size; every student answers every code
  const byExpectation: Record<string, BandCounts> = {}
  for (const code of codes) byExpectation[code] = generateCounts(level, spread, attempts)
  return { byExpectation, attempts }
}

// Class Insights (class-wide). Fabricates synthetic tallies spread across subjects
// and grades so the subject folder tabs AND grade sub-tabs populate. Idempotent:
// clears prior synthetic data first so re-generating replaces rather than piles up.
export function seedGlobal({ quantity, level, spread }: SeedOptions): void {
  resetGlobal()
  const wanted = Math.max(MIN_QUANTITY, Math.min(Math.round(quantity), POOL_SIZE))
  const pairs = interleavedPairs().slice(0, wanted)

  const seenPerSubject: Record<string, number> = {}
  const groups = new Map<string, { subject: string; grade: string; codes: string[] }>()
  for (const { subject, code } of pairs) {
    const idx = seenPerSubject[subject] ?? 0
    seenPerSubject[subject] = idx + 1
    const grade = GRADES[idx % GRADES.length] // fan a subject's codes across grades
    const key = `${subject}__${grade}`
    const g = groups.get(key) ?? { subject, grade, codes: [] }
    g.codes.push(code)
    groups.set(key, g)
  }

  const now = Date.now()
  const tallies: LessonTally[] = []
  let i = 0
  for (const { subject, grade, codes } of groups.values()) {
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
