/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { describeTallyCounts, earlierQuickChecks, summarizeTally } from "./tally-summary"
import type { LessonTally, LevelCounts } from "./assessment-results"
import type { LessonMetadata } from "./lesson-metadata"

const L = (a: number, b: number, c: number, d: number): LevelCounts => ({ level1: a, level2: b, level3: c, level4: d })
function tally(lessonId: string, updatedAt: number, extra: Partial<LessonTally> = {}): LessonTally {
  return {
    lessonId,
    title: `Snapshot ${lessonId}`,
    grade: "6",
    subject: "Math",
    codes: ["B1.1"],
    updatedAt,
    attempts: 10,
    events: 4,
    byExpectation: { "B1.1": L(1, 1, 4, 4) },
    ...extra,
  }
}
const lesson = (id: string): LessonMetadata => ({ id, timestamp: 1, title: id, grade: "6", subject: "Math", curriculumCodesCovered: [], resourceIds: [] })

test("responses are attempts and answer sets are events, never confused", () => {
  const s = summarizeTally(tally("a", 5))
  assert.equal(s.responses, 10)
  assert.equal(s.answerSets, 4)
  assert.equal(describeTallyCounts(s), "10 responses · 4 answer sets")
})

test("levels are summed across every expectation checked", () => {
  const s = summarizeTally(tally("a", 5, { byExpectation: { "B1.1": L(1, 1, 4, 4), "B1.2": L(5, 4, 1, 1) } }))
  assert.deepEqual(s.counts, L(6, 5, 5, 5))
  assert.equal(s.level, "okay")
})

test("answer sets are unknown for tallies that predate tracking", () => {
  assert.equal(summarizeTally(tally("a", 5, { events: undefined })).answerSets, null)
  assert.equal(summarizeTally(tally("a", 5, { hasUntrackedResponses: true })).answerSets, null)
  assert.equal(describeTallyCounts(summarizeTally(tally("a", 5, { events: undefined }))), "10 responses")
})

test("one response per answer set reads as responses alone; singulars read right", () => {
  assert.equal(describeTallyCounts(summarizeTally(tally("a", 5, { attempts: 4 }))), "4 responses")
  assert.equal(describeTallyCounts(summarizeTally(tally("a", 5, { attempts: 24, events: 1 }))), "24 responses · 1 answer set")
  assert.equal(describeTallyCounts(summarizeTally(tally("a", 5, { attempts: 1, events: 1 }))), "1 response")
})

test("earlier Quick Checks: only lessons gone from the log, with results, newest first", () => {
  const out = earlierQuickChecks(
    [tally("kept", 9), tally("gone-old", 2), tally("gone-new", 7), tally("empty", 8, { attempts: 0 })],
    [lesson("kept")],
  )
  assert.deepEqual(out.map((s) => s.lessonId), ["gone-new", "gone-old"])
  assert.equal(out[0].title, "Snapshot gone-new")
})
