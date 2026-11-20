/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { buildNextStep, type ScopeSequence } from "./next-step"
import type { LessonMetadata } from "./lesson-metadata"
import type { LessonTally, LevelCounts } from "./assessment-results"

const seq: ScopeSequence = { name: "test order", codes: ["B1.1", "B1.2", "C1.1", "C2.1", "C2.2", "C2.3", "D1.1"] }

function lesson(id: string, timestamp: number, codes: string[]): LessonMetadata {
  return { id, timestamp, title: id, grade: "6", subject: "Math", curriculumCodesCovered: codes, resourceIds: [] }
}
const L = (a: number, b: number, c: number, d: number): LevelCounts => ({ level1: a, level2: b, level3: c, level4: d })
function tally(updatedAt: number, byExpectation: Record<string, LevelCounts>): LessonTally {
  return { lessonId: `t${updatedAt}`, title: "", grade: "6", subject: "Math", codes: Object.keys(byExpectation), updatedAt, attempts: 1, byExpectation }
}

test("no lessons: start at the first untaught expectation", () => {
  assert.deepEqual(buildNextStep(seq, [], []), { kind: "start", code: "B1.1" })
})

test("next follows the furthest expectation of the most recent lesson", () => {
  const step = buildNextStep(seq, [lesson("old", 1, ["B1.1", "B1.2"]), lesson("last", 2, ["C2.1", "C2.2"])], [])
  assert.equal(step.kind, "next")
  if (step.kind !== "next") return
  assert.equal(step.code, "C2.3")
  assert.equal(step.after.id, "last")
  assert.deepEqual(step.builtOn, ["C2.1", "C2.2"])
  assert.equal(step.unchecked, true)
})

test("an overall code on a lesson covers its specifics", () => {
  const step = buildNextStep(seq, [lesson("last", 2, ["C2"])], [])
  assert.equal(step.kind === "next" && step.code, "D1.1")
})

test("a gap when the last lesson's check is mostly Level 1–2", () => {
  const step = buildNextStep(seq, [lesson("last", 2, ["C2.1", "C2.2"])], [tally(3, { "C2.1": L(5, 5, 4, 2), "C2.2": L(9, 6, 3, 2) })])
  assert.equal(step.kind, "gap")
  if (step.kind !== "gap") return
  assert.equal(step.code, "C2.2")
  assert.equal(step.lowShare, 0.75)
  assert.equal(step.low, 15)
  assert.equal(step.responses, 20)
  assert.equal(step.checkedAt, 3)
})

test("exactly half at Level 1–2 is not a gap (it still reads as on track)", () => {
  const step = buildNextStep(seq, [lesson("last", 2, ["C2.1"])], [tally(3, { "C2.1": L(3, 2, 3, 2) })])
  assert.equal(step.kind, "next")
})

test("a secure check moves on and is no longer unchecked", () => {
  const step = buildNextStep(seq, [lesson("last", 2, ["C2.1"])], [tally(3, { "C2.1": L(1, 2, 10, 7) })])
  assert.equal(step.kind, "next")
  if (step.kind !== "next") return
  assert.equal(step.code, "C2.2")
  assert.equal(step.unchecked, false)
})

test("past the end of the sequence, go back to the earliest gap; all taught is done", () => {
  const gap = buildNextStep(seq, [lesson("a", 1, ["B1.1", "B1.2", "C1.1"]), lesson("last", 2, ["D1.1"])], [])
  assert.equal(gap.kind === "next" && gap.code, "C2.1")
  const done = buildNextStep(seq, [lesson("all", 1, seq.codes)], [tally(2, { "D1.1": L(0, 0, 5, 5) })])
  assert.equal(done.kind, "done")
})

test("a check from before the last lesson doesn't count as a gap", () => {
  const step = buildNextStep(seq, [lesson("last", 5, ["C2.1"])], [tally(3, { "C2.1": L(9, 6, 3, 2) })])
  assert.equal(step.kind, "next")
  if (step.kind !== "next") return
  assert.equal(step.unchecked, true)
})

test("no lessons but Quick Checks: continue after the furthest checked expectation", () => {
  const step = buildNextStep(seq, [], [tally(1, { "B1.1": L(0, 1, 5, 5), "C1.1": L(0, 2, 6, 3) })])
  assert.deepEqual(step, { kind: "continue", code: "C2.1", furthest: "C1.1" })
})
