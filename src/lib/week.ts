// The teacher's current school week (Monday to Friday, local time): which
// lessons were planned and which Quick Checks were recorded each day, across
// every class. Feeds the landing page's "This week" widget.
//
// A lesson's only date is when it was saved, so this is a record of the week's
// work, not a schedule of what is coming. Pure: no storage, no curriculum.

import type { LessonTally } from "./assessment-results"
import type { LessonMetadata } from "./lesson-metadata"

export interface WeekDay {
  /** Local midnight at the start of the day. */
  start: number
  isToday: boolean
  lessons: LessonMetadata[]
  checks: LessonTally[]
}

/** Local midnight on the Monday of the week containing `now`. Weekends count
 *  toward the week that just ended, so Saturday still shows Mon–Fri. */
export function weekStart(now: number): number {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  const offset = (d.getDay() + 6) % 7 // Monday = 0 … Sunday = 6
  d.setDate(d.getDate() - offset)
  return d.getTime()
}

export function buildWeek(lessons: LessonMetadata[], tallies: LessonTally[], now = Date.now()): WeekDay[] {
  const monday = new Date(weekStart(now))
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const days: WeekDay[] = []
  for (let i = 0; i < 5; i++) {
    // setDate rather than adding 24h, so a daylight-saving change can't shift a day.
    const start = new Date(monday)
    start.setDate(monday.getDate() + i)
    const end = new Date(start)
    end.setDate(start.getDate() + 1)
    const s = start.getTime()
    const e = end.getTime()
    days.push({
      start: s,
      isToday: s === today.getTime(),
      lessons: lessons.filter((l) => l.timestamp >= s && l.timestamp < e).sort((a, b) => a.timestamp - b.timestamp),
      checks: tallies.filter((t) => t.updatedAt >= s && t.updatedAt < e).sort((a, b) => a.updatedAt - b.updatedAt),
    })
  }
  return days
}
