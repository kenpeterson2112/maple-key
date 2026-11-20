/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { buildClassProgress, buildNeedsAttention, type OverallProgress } from "./class-progress"
import type { LessonMetadata } from "./lesson-metadata"
import type { LessonTally, LevelCounts } from "./assessment-results"

// Math Grade 6 from the bundled outline: B1 has B1.1–B1.6, B2 has B2.1–B2.12.
const L = (a: number, b: number, c: number, d: number): LevelCounts => ({ level1: a, level2: b, level3: c, level4: d })
function lesson(id: string, timestamp: number, codes: string[], grade = "6"): LessonMetadata {
  return { id, timestamp, title: `Lesson ${id}`, grade, subject: "Math", curriculumCodesCovered: codes, resourceIds: [] }
}
function tally(
  lessonId: string,
  updatedAt: number,
  byExpectation: Record<string, LevelCounts>,
  eventsByExpectation?: Record<string, number>,
): LessonTally {
  return {
    lessonId,
    title: `Snapshot ${lessonId}`,
    grade: "6",
    subject: "Math",
    codes: Object.keys(byExpectation),
    updatedAt,
    attempts: 0,
    byExpectation,
    eventsByExpectation,
  }
}
function overall(p: ReturnType<typeof buildClassProgress>, code: string): OverallProgress {
  const o = p?.strands.flatMap((s) => s.overalls).find((x) => x.code === code)
  assert.ok(o, code)
  return o
}

test("each specific carries its state: not taught, taught, checked", () => {
  const p = buildClassProgress("Math", "6", [tally("a", 5, { "B1.2": L(1, 1, 4, 4) })], [lesson("a", 1, ["B1.1", "B1.2"])])
  const b1 = overall(p, "B1")
  assert.deepEqual(
    b1.specifics.slice(0, 3).map((s) => s.status.state),
    ["taught", "checked", "not-taught"],
  )
  assert.equal(b1.status.state, "checked")
  assert.equal(overall(p, "B2").status.state, "not-taught")
})

test("existing numbers are unchanged", () => {
  const p = buildClassProgress("Math", "6", [tally("a", 5, { "B1.2": L(1, 1, 4, 4) })], [lesson("a", 1, ["B1.1", "B1.2"])])
  const b1 = overall(p, "B1")
  assert.deepEqual([b1.total, b1.taught, b1.checked, b1.level, b1.lowShare], [6, 2, 1, "good", 0.2])
  assert.deepEqual([b1.specifics[1].responses, b1.specifics[1].level, b1.specifics[1].taught], [10, "good", true])
  assert.equal(p?.taught, 2)
})

test("counts, evidence and last checked are folded across Quick Checks", () => {
  const p = buildClassProgress(
    "Math",
    "6",
    [tally("a", 5, { "B1.1": L(2, 0, 1, 1) }, { "B1.1": 1 }), tally("b", 9, { "B1.1": L(1, 1, 1, 1) }, { "B1.1": 3 })],
    [],
  )
  const s = overall(p, "B1").specifics[0]
  assert.deepEqual(s.counts, L(3, 1, 2, 2))
  assert.deepEqual(s.evidence, { responses: 8, events: 4, known: true })
  assert.equal(s.lastCheckedAt, 9)
  assert.equal(s.status.evidence, "medium")
  assert.equal(overall(p, "B1").lastCheckedAt, 9)
})

test("missing event counts read as unknown evidence, not weak", () => {
  const p = buildClassProgress("Math", "6", [tally("a", 5, { "B1.1": L(2, 0, 1, 1) })], [])
  assert.equal(overall(p, "B1").specifics[0].status.evidence, "unknown")
})

test("covering lessons: newest first, and a tally remembers a lesson that left the log", () => {
  const p = buildClassProgress(
    "Math",
    "6",
    [tally("gone", 3, { "B1.1": L(0, 0, 2, 2) }), tally("new", 8, { "B1.1": L(0, 0, 1, 1) })],
    [lesson("old", 2, ["B1.1"]), lesson("new", 7, ["B1.1", "B1.2"])],
  )
  const lessons = overall(p, "B1").specifics[0].lessons
  assert.deepEqual(
    lessons.map((l) => [l.id, l.inLog]),
    [["new", true], ["gone", false], ["old", true]],
  )
  assert.equal(lessons[0].title, "Lesson new") // the log's title wins over the snapshot
  assert.deepEqual(
    overall(p, "B1").lessons.map((l) => l.id),
    ["new", "gone", "old"],
  )
})

test("a lesson tagged with an overall code is listed on the overall", () => {
  const p = buildClassProgress("Math", "6", [], [lesson("x", 4, ["B2"])])
  assert.deepEqual(overall(p, "B2").lessons.map((l) => l.id), ["x"])
  assert.equal(overall(p, "B2").specifics[0].lessons.length, 0)
})

test("needs work and Needs attention use the shared gap rule", () => {
  const tallies = [
    tally("a", 5, { "B1.1": L(6, 2, 1, 1) }, { "B1.1": 1 }), // 80% low, one answer set
    tally("b", 6, { "B2.1": L(5, 2, 2, 1) }, { "B2.1": 12 }), // 70% low, strong
    tally("c", 7, { "C1.1": L(2, 3, 3, 2) }, { "C1.1": 12 }), // exactly half: no gap
  ]
  const p = buildClassProgress("Math", "6", tallies, [])
  assert.equal(p?.needsWork?.code, "B2") // better evidence outranks a thin, larger share
  assert.equal(overall(p, "C1").status.gap, false)
  assert.deepEqual(
    buildNeedsAttention(tallies, []).map((i) => i.overall.code),
    ["B2", "B1"],
  )
})

test("other classes' data stays out", () => {
  const p = buildClassProgress("Math", "6", [], [lesson("g7", 1, ["B1.1"], "7")])
  assert.equal(p?.taught, 0)
  assert.equal(overall(p, "B1").lessons.length, 0)
})
