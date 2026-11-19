/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { expectationCodeProblems } from "../../shared/curriculum-check"
test("expectationCodeProblems: codes must exist for the subject and one of the grades", () => {
  assert.deepEqual(expectationCodeProblems("Math", ["6"], ["B2.12", "C2"]), [])
  assert.deepEqual(expectationCodeProblems("Math", [6, 7], ["B1.7"]), []) // valid in grade 7 only
  assert.equal(expectationCodeProblems("Math", ["6"], ["A1.1"]).length, 1)
  assert.equal(expectationCodeProblems("Math", ["9"], ["AA1", "C2.3"]).length, 0)
  assert.match(expectationCodeProblems("Social Studies", ["8"], ["B1.1"])[0], /no Social Studies curriculum/)
  assert.deepEqual(expectationCodeProblems("Social Studies", ["8"], []), [])
})
