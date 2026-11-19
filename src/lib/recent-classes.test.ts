/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { recentClasses } from "./recent-classes"
import type { LessonMetadata } from "./lesson-metadata"
import type { LessonTally } from "./assessment-results"

function lesson(timestamp: number, subject: string, grade: string): LessonMetadata {
  return { id: `l${timestamp}`, timestamp, title: "", grade, subject, curriculumCodesCovered: [], resourceIds: [] }
}
function tally(updatedAt: number, subject: string, grade: string): LessonTally {
  return { lessonId: `t${updatedAt}`, title: "", grade, subject, codes: [], updatedAt, attempts: 1, byExpectation: {} }
}

test("no lessons or checks: no classes", () => {
  assert.deepEqual(recentClasses([], []), [])
})

test("one entry per subject and grade, most recently active first", () => {
  const out = recentClasses(
    [tally(50, "Math", "5")],
    [lesson(10, "Math", "5"), lesson(30, "Science", "6"), lesson(20, "Math", "5")],
  )
  assert.deepEqual(out, [
    { subject: "Math", grade: "5", lastActiveAt: 50 },
    { subject: "Science", grade: "6", lastActiveAt: 30 },
  ])
})

test("skips records with no subject or grade", () => {
  assert.deepEqual(recentClasses([], [lesson(1, "", "5"), lesson(2, "Math", "")]), [])
})
