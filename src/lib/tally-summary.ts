// One lesson's Quick Checks in a line: when, how many responses, how many
// answer sets they came from, and how the class did. Lessons shows it on each
// card, and lists the checks whose lesson has left the 20-entry log under
// "Earlier Quick Checks" (PROGRESS_SPEC.md §6).
//
// Pure: works off tallies and lessons, reads no storage.

import { computeReadinessLevel, type LessonTally, type LevelCounts, type ReadinessLevel } from "./assessment-results"
import type { LessonMetadata } from "./lesson-metadata"

export interface TallySummary {
  lessonId: string
  /** The title when the check was recorded (the lesson may be gone). */
  title: string
  subject: string
  grade: string
  lastCheckedAt: number
  /** Students' responses. A group entry of 24 adds 24 from one tap. */
  responses: number
  /** Separate entries (Record presses); null when some predate tracking. */
  answerSets: number | null
  /** Levels across every expectation it checked. */
  counts: LevelCounts
  level: ReadinessLevel | null
}

export function summarizeTally(t: LessonTally): TallySummary {
  const counts: LevelCounts = { level1: 0, level2: 0, level3: 0, level4: 0 }
  for (const c of Object.values(t.byExpectation)) {
    counts.level1 += c.level1
    counts.level2 += c.level2
    counts.level3 += c.level3
    counts.level4 += c.level4
  }
  const n = counts.level1 + counts.level2 + counts.level3 + counts.level4
  return {
    lessonId: t.lessonId,
    title: t.title,
    subject: t.subject,
    grade: t.grade,
    lastCheckedAt: t.updatedAt,
    responses: t.attempts,
    answerSets: typeof t.events === "number" && !t.hasUntrackedResponses ? t.events : null,
    counts,
    level: n > 0 ? computeReadinessLevel(counts) : null,
  }
}

/** "10 responses · 8 answer sets", or just the responses when sets are unknown
 *  or the same number (every response entered on its own). */
export function describeTallyCounts(s: TallySummary): string {
  const responses = `${s.responses} ${s.responses === 1 ? "response" : "responses"}`
  if (s.answerSets === null || s.answerSets === s.responses) return responses
  return `${responses} · ${s.answerSets} answer ${s.answerSets === 1 ? "set" : "sets"}`
}

/** Quick Checks whose lesson is no longer in the log, newest first. */
export function earlierQuickChecks(tallies: LessonTally[], lessons: LessonMetadata[]): TallySummary[] {
  const inLog = new Set(lessons.map((l) => l.id))
  return tallies
    .filter((t) => t.attempts > 0 && !inLog.has(t.lessonId))
    .map(summarizeTally)
    .sort((a, b) => b.lastCheckedAt - a.lastCheckedAt)
}
