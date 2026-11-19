/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { buildWeek, schoolDaysAgo, weekStart } from "./week"
import type { LessonMetadata } from "./lesson-metadata"
import type { LessonTally } from "./assessment-results"

const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime()

function lesson(id: string, timestamp: number): LessonMetadata {
  return { id, timestamp, title: id, grade: "6", subject: "Math", curriculumCodesCovered: [], resourceIds: [] }
}

function tally(id: string, updatedAt: number): LessonTally {
  return { lessonId: id, title: id, grade: "6", subject: "Math", codes: [], updatedAt, attempts: 1, byExpectation: {} }
}

test("weekStart: any weekday maps to that week's Monday at local midnight", () => {
  const monday = new Date(2026, 10, 16).getTime() // Mon 16 Nov 2026
  assert.equal(weekStart(at(2026, 11, 16, 0)), monday)
  assert.equal(weekStart(at(2026, 11, 19, 15)), monday) // Thursday
  assert.equal(weekStart(at(2026, 11, 20, 23)), monday) // Friday night
  assert.equal(weekStart(at(2026, 11, 23, 8)), new Date(2026, 10, 23).getTime()) // next Monday
})

test("weekStart: the weekend belongs to the week that just ended", () => {
  assert.equal(weekStart(at(2026, 11, 22, 12)), new Date(2026, 10, 16).getTime()) // Sunday 22 → Monday 16
  assert.equal(weekStart(at(2026, 11, 21, 12)), new Date(2026, 10, 16).getTime()) // Saturday 21 → Monday 16
})

test("buildWeek: buckets lessons and checks into Mon–Fri and marks today", () => {
  const now = at(2026, 11, 18, 14) // Wednesday
  const week = buildWeek(
    [lesson("mon", at(2026, 11, 16, 9)), lesson("wed", at(2026, 11, 18, 8)), lesson("lastFri", at(2026, 11, 13)), lesson("sat", at(2026, 11, 21))],
    [tally("thuCheck", at(2026, 11, 19, 11))],
    now,
  )
  assert.equal(week.length, 5)
  assert.deepEqual(week.map((d) => d.lessons.map((l) => l.id)), [["mon"], [], ["wed"], [], []])
  assert.deepEqual(week.map((d) => d.checks.map((c) => c.lessonId)), [[], [], [], ["thuCheck"], []])
  assert.deepEqual(week.map((d) => d.isToday), [false, false, true, false, false])
})

test("buildWeek: weekOffset steps whole weeks and still marks the real today", () => {
  const now = at(2026, 11, 18, 14) // Wednesday 18 Nov
  const lessons = [lesson("lastWed", at(2026, 11, 11, 9)), lesson("thisWed", at(2026, 11, 18, 9)), lesson("nextMon", at(2026, 11, 23, 9))]
  const last = buildWeek(lessons, [], now, -1)
  assert.equal(last[0].start, new Date(2026, 10, 9).getTime()) // Mon 9 Nov
  assert.deepEqual(last.map((d) => d.lessons.map((l) => l.id)), [[], [], ["lastWed"], [], []])
  assert.ok(last.every((d) => !d.isToday))
  const next = buildWeek(lessons, [], now, 1)
  assert.equal(next[0].start, new Date(2026, 10, 23).getTime())
  assert.deepEqual(next[0].lessons.map((l) => l.id), ["nextMon"])
})

const day = (t: number) => new Date(t).toDateString()

test("schoolDaysAgo: counts back school days, skipping weekends", () => {
  const thu = at(2026, 11, 19, 15)
  assert.equal(day(schoolDaysAgo(thu, 0)), day(thu))
  assert.equal(day(schoolDaysAgo(thu, 3)), day(at(2026, 11, 16))) // Monday
  assert.equal(day(schoolDaysAgo(thu, 4)), day(at(2026, 11, 13))) // the Friday before
  const sat = at(2026, 11, 21, 12)
  assert.equal(day(schoolDaysAgo(sat, 0)), day(at(2026, 11, 20))) // weekend → Friday
  assert.equal(day(schoolDaysAgo(sat, 1)), day(at(2026, 11, 19)))
})

test("schoolDaysAgo: never in the future, even early on a school day", () => {
  const early = at(2026, 11, 19, 7)
  for (let salt = 0; salt < 12; salt++) assert.ok(schoolDaysAgo(early, 0, salt) < early)
})

test("seeded checks spread across the week instead of piling onto today", () => {
  const now = at(2026, 11, 19, 15) // Thursday
  const tallies: LessonTally[] = Array.from({ length: 40 }, (_, i) => ({
    lessonId: `t${i}`, title: `t${i}`, grade: "6", subject: "Math", codes: [],
    updatedAt: schoolDaysAgo(now, i % 15, i), attempts: 1, byExpectation: {},
  }))
  const week = buildWeek([], tallies, now)
  const counts = week.map((d) => d.checks.length)
  assert.deepEqual(counts.slice(0, 4).map((c) => c > 0), [true, true, true, true])
  assert.equal(counts[4], 0) // Friday hasn't happened yet
  assert.ok(counts[3] < 40 / 2)
})
