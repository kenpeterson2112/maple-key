import { test } from "node:test"
import assert from "node:assert/strict"
import { joinLessonLines, normalizeLessonLines, splitLessonLines } from "../../shared/lesson-lines"

test("splitLessonLines: one step per line, list markers stripped", () => {
  assert.deepEqual(splitLessonLines("- Show the photo\n2. Pairs sort cards\n\n• Share out"), [
    "Show the photo",
    "Pairs sort cards",
    "Share out",
  ])
})

test("splitLessonLines: an old paragraph lesson stays one item", () => {
  assert.deepEqual(splitLessonLines("Begin by showing. Then ask."), ["Begin by showing. Then ask."])
  assert.deepEqual(splitLessonLines(undefined), [])
})

test("splitLessonLines: keeps a leading number that is content, not a marker", () => {
  assert.deepEqual(splitLessonLines("3 students share"), ["3 students share"])
})

test("joinLessonLines: arrays become lines, strings pass through", () => {
  assert.equal(joinLessonLines(["a ", "", "b"]), "a\nb")
  assert.equal(joinLessonLines("already text"), "already text")
  assert.equal(joinLessonLines(null), "")
})

test("normalizeLessonLines: three-part fields and template sections", () => {
  const lesson: Record<string, unknown> = {
    title: "T",
    mindsOnContent: ["a", "b"],
    consolidationAssessment: "Look for: x",
    sections: [{ id: "engage", content: ["c", "d"], callout: ["Support: e"] }, { id: "explore", content: "f" }],
  }
  normalizeLessonLines(lesson)
  assert.equal(lesson.mindsOnContent, "a\nb")
  assert.equal(lesson.consolidationAssessment, "Look for: x")
  assert.equal(lesson.title, "T")
  assert.ok(!("actionContent" in lesson))
  assert.deepEqual(lesson.sections, [
    { id: "engage", content: "c\nd", callout: "Support: e" },
    { id: "explore", content: "f" },
  ])
})
