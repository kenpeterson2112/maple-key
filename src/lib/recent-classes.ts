// The teacher's classes (subject + grade) that have any lesson or Quick Check,
// most recently active first. Feeds the top nav's class chips when no subject
// is picked. Pure: takes tallies and lessons, reads no storage.

import type { LessonTally } from "./assessment-results"
import type { LessonMetadata } from "./lesson-metadata"
import { normalizeSubject } from "./subjects"
import { normalizeGrades } from "./utils"

export interface RecentClass {
  subject: string
  grade: string
  /** The latest lesson or Quick Check in this class. */
  lastActiveAt: number
}

export function recentClasses(tallies: LessonTally[], lessons: LessonMetadata[]): RecentClass[] {
  const latest = new Map<string, RecentClass>()
  const note = (s: string | undefined, g: string | undefined, at: number) => {
    const subject = normalizeSubject(s ?? "")
    const grade = normalizeGrades([g ?? ""])[0] ?? ""
    if (!subject || !grade) return
    const key = `${subject}|${grade}`
    const prev = latest.get(key)
    if (!prev || at > prev.lastActiveAt) latest.set(key, { subject, grade, lastActiveAt: at })
  }
  for (const l of lessons) note(l.subject, l.grade, l.timestamp)
  for (const t of tallies) note(t.subject, t.grade, t.updatedAt)
  return [...latest.values()].sort((a, b) => b.lastActiveAt - a.lastActiveAt)
}
