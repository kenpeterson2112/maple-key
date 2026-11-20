/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { describeExpectation, gapRank, isGap } from "./expectation-status"
import type { Evidence, LevelCounts } from "./assessment-results"

const L = (a: number, b: number, c: number, d: number): LevelCounts => ({ level1: a, level2: b, level3: c, level4: d })
const ev = (responses: number, events: number, known = true): Evidence => ({ responses, events, known })
const none = L(0, 0, 0, 0)

test("three states: not taught, taught, checked", () => {
  assert.equal(describeExpectation({ taught: false, counts: none, evidence: ev(0, 0) }).state, "not-taught")
  assert.equal(describeExpectation({ taught: true, counts: none, evidence: ev(0, 0) }).state, "taught")
  const checked = describeExpectation({ taught: true, counts: L(1, 1, 4, 4), evidence: ev(10, 10) })
  assert.equal(checked.state, "checked")
  assert.equal(checked.level, "good")
})

test("unchecked rows carry no level, share, gap or hedge", () => {
  const s = describeExpectation({ taught: true, counts: none, evidence: ev(0, 0) })
  assert.deepEqual([s.level, s.lowShare, s.gap, s.hedge, s.evidence], [null, null, false, undefined, "none"])
})

test("a gap is more than half at Level 1–2, and agrees with the readiness colour", () => {
  assert.equal(isGap(L(3, 3, 2, 2)), true)
  assert.equal(isGap(L(2, 3, 3, 2)), false) // exactly half: still "good"
  assert.equal(isGap(none), false)
  for (const counts of [L(3, 3, 2, 2), L(2, 3, 3, 2), L(6, 0, 0, 4), L(0, 1, 0, 9), L(5, 0, 5, 0)]) {
    const s = describeExpectation({ taught: true, counts, evidence: ev(10, 10) })
    const onTrack = s.level === "good" || s.level === "great"
    assert.equal(s.gap, !onTrack, JSON.stringify(counts))
  }
})

test("it counts the gap in words: low and total responses", () => {
  const s = describeExpectation({ taught: true, counts: L(4, 2, 3, 1), evidence: ev(10, 10) })
  assert.deepEqual([s.low, s.responses, s.lowShare], [6, 10, 0.6])
})

test("thin and unknown evidence carry a hedge; strong evidence doesn't", () => {
  const counts = L(4, 2, 3, 1)
  assert.equal(describeExpectation({ taught: true, counts, evidence: ev(10, 10) }).hedge, undefined)
  assert.match(describeExpectation({ taught: true, counts, evidence: ev(10, 1) }).hedge ?? "", /one answer set/)
  assert.match(describeExpectation({ taught: true, counts, evidence: ev(10, 2) }).hedge ?? "", /2 answer sets/)
  assert.match(describeExpectation({ taught: true, counts, evidence: ev(10, 0, false) }).hedge ?? "", /unknown/)
})

test("a thin gap doesn't outrank an equal, well-evidenced one", () => {
  const counts = L(6, 2, 1, 1)
  const thin = describeExpectation({ taught: true, counts, evidence: ev(10, 1) })
  const strong = describeExpectation({ taught: true, counts, evidence: ev(10, 10) })
  assert.ok(gapRank(strong) > gapRank(thin))
})

test("no wording prescribes a move", () => {
  const hedges = [ev(10, 1), ev(10, 2), ev(10, 0, false)].map(
    (e) => describeExpectation({ taught: true, counts: L(6, 2, 1, 1), evidence: e }).hedge ?? "",
  )
  for (const h of hedges) assert.doesNotMatch(h, /re-?teach|small group|move on/i)
})
