/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { buildWeek, weekStart } from "./week"
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
