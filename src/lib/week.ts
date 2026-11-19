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

/** Build a Mon–Fri week. `weekOffset` steps whole weeks from the one holding
 *  `now` (-1 is last week); `isToday` still marks the real today. */
export function buildWeek(lessons: LessonMetadata[], tallies: LessonTally[], now = Date.now(), weekOffset = 0): WeekDay[] {
  const monday = new Date(weekStart(now))
  // setDate rather than adding 7×24h, so a daylight-saving change can't shift the week.
  monday.setDate(monday.getDate() + weekOffset * 7)
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

/** A time during the school day (9:00–14:00), `days` school days before `now`
 *  (weekends skipped). Today's slot is never later than `now`. `salt` varies
 *  the hour so a day's checks don't all share one timestamp. */
export function schoolDaysAgo(now: number, days: number, salt = 0): number {
  const d = new Date(now)
  const weekend = () => d.getDay() === 0 || d.getDay() === 6
  while (weekend()) d.setDate(d.getDate() - 1) // a weekend counts from Friday
  for (let left = days; left > 0; ) {
    d.setDate(d.getDate() - 1)
    if (!weekend()) left--
  }
  d.setHours(9 + (salt % 6), (salt * 7) % 60, 0, 0)
  return Math.min(d.getTime(), now - (salt + 1) * 60_000)
}
