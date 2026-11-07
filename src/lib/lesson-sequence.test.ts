/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { buildContinuationContext, groupLessonsBySequence } from "./lesson-sequence"
import type { LessonMetadata } from "./lesson-metadata"
import { CONTINUATION_CAPS, clampContinuation, formatContinuationBlock } from "../../shared/lesson-continuation"

function lesson(id: string, extra: Partial<LessonMetadata> = {}): LessonMetadata {
  return {
    id,
    timestamp: 0,
    title: `Lesson ${id}`,
    grade: "6",
    subject: "Science",
    curriculumCodesCovered: [],
    resourceIds: [],
    ...extra,
  }
}

test("buildContinuationContext: older lesson with no fullContent degrades cleanly", () => {
  const old = lesson("old", {
    curriculumCodesCovered: undefined as unknown as string[],
    lessonContent: { mindsOn: "Hook with a video", action: "", consolidation: "Exit ticket on habitats" },
  })
  const ctx = buildContinuationContext(old)
  assert.equal(ctx.title, "Lesson old")
  assert.equal(ctx.consolidation, "Exit ticket on habitats")
  assert.deepEqual(ctx.activities, ["Minds On: Hook with a video"])
  assert.equal(ctx.learningGoal, undefined)
  assert.equal(ctx.curriculumCodes, undefined)
  assert.equal(ctx.quickCheck, undefined)
  assert.ok(!("successCriteria" in ctx))
})

test("buildContinuationContext: bare minimum lesson still has a title", () => {
  const ctx = buildContinuationContext({ id: "x", timestamp: 0 } as LessonMetadata)
  assert.equal(ctx.title, "Untitled lesson")
})

test("buildContinuationContext: caps long consolidation per field", () => {
  const long = "word ".repeat(2000)
  const ctx = buildContinuationContext(
    lesson("a", {
      fullContent: {
        mindsOnContent: long,
        mindsOnDifferentiation: "",
        actionContent: "",
        actionDifferentiation: "",
        consolidationContent: long,
        consolidationAssessment: "",
        learningGoal: "Explain food chains",
      },
    }),
    { "B1.1": { level1: 3, level2: 1, level3: 0, level4: 0 }, "B1.2": { level1: 0, level2: 0, level3: 0, level4: 0 } },
  )
  assert.ok(ctx.consolidation!.length <= CONTINUATION_CAPS.consolidation)
  assert.ok(ctx.activities![0].length <= CONTINUATION_CAPS.activity)
  assert.equal(ctx.learningGoal, "Explain food chains")
  assert.deepEqual(Object.keys(ctx.quickCheck!), ["B1.1"])
})

test("buildContinuationContext: template lessons end on their last section", () => {
  const ctx = buildContinuationContext(
    lesson("t", {
      fullContent: {
        mindsOnContent: "", mindsOnDifferentiation: "", actionContent: "", actionDifferentiation: "",
        consolidationContent: "", consolidationAssessment: "",
        sections: [
          { id: "engage", label: "Engage", subtitle: "", content: "Mystery object" },
          { id: "evaluate", label: "Evaluate", subtitle: "", content: "Exit card", callout: "Look for vocab" },
        ],
      },
    }),
  )
  assert.deepEqual(ctx.activities, ["Engage: Mystery object"])
  assert.equal(ctx.consolidation, "Exit card")
  assert.equal(ctx.consolidationAssessment, "Look for vocab")
})

test("clampContinuation rejects junk and formatContinuationBlock frames it as context", () => {
  assert.equal(clampContinuation(null), null)
  assert.equal(clampContinuation({ title: "" }), null)
  const block = formatContinuationBlock(clampContinuation({ title: "Food chains", successCriteria: "nope" }))
  assert.match(block, /teacher's notes and choices take priority/)
  assert.match(block, /Title: Food chains/)
  assert.doesNotMatch(block, /must/i)
  assert.equal(formatContinuationBlock(null), "")
})

const ids = (rows: { lesson: LessonMetadata; depth: number }[]) => rows.map((r) => `${r.lesson.id}@${r.depth}`)
const follows = (id: string, parent: string) => lesson(id, { continuesFrom: { id: parent, title: `Lesson ${parent}` } })

test("groupLessonsBySequence: chain nests beneath its source", () => {
  // Newest-first input, as the library sorts it.
  const rows = groupLessonsBySequence([follows("c", "b"), lesson("z"), follows("b", "a"), lesson("a")])
  assert.deepEqual(ids(rows), ["z@0", "a@0", "b@1", "c@2"])
})

test("groupLessonsBySequence: branches sit together under one source", () => {
  const rows = groupLessonsBySequence([lesson("a"), follows("b1", "a"), follows("b2", "a"), follows("c", "b1")])
  assert.deepEqual(ids(rows), ["a@0", "b1@1", "c@2", "b2@1"])
})

test("groupLessonsBySequence: evicted parent makes the follow-up a root", () => {
  const rows = groupLessonsBySequence([follows("b", "gone"), lesson("a")])
  assert.deepEqual(ids(rows), ["b@0", "a@0"])
})

test("groupLessonsBySequence: indent is capped", () => {
  const chain = [lesson("l0"), ...Array.from({ length: 6 }, (_, i) => follows(`l${i + 1}`, `l${i}`))]
  const rows = groupLessonsBySequence(chain, 3)
  assert.deepEqual(rows.map((r) => r.depth), [0, 1, 2, 3, 3, 3, 3])
  assert.equal(rows.length, 7)
})
