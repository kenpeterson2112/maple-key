/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  CLASSROOM_RESOURCE_CATEGORIES,
  CLASSROOM_RESOURCE_OPTIONS,
  customMaterialSubjects,
  isMaterialSubject,
  materialSubjects,
} from "./classroom-resources"

test("every built-in material has at least one valid subject tag", () => {
  for (const o of CLASSROOM_RESOURCE_OPTIONS) {
    assert.ok(o.subjects.length > 0, `${o.id} has no subjects`)
    for (const s of o.subjects) assert.ok(isMaterialSubject(s), `${o.id}: "${s}" isn't a schema subject or General`)
  }
})

test("General is never mixed with a subject, and no tag repeats", () => {
  for (const o of CLASSROOM_RESOURCE_OPTIONS) {
    if (o.subjects.includes("General")) assert.deepEqual(o.subjects, ["General"], `${o.id} mixes General with a subject`)
    assert.equal(new Set(o.subjects).size, o.subjects.length, `${o.id} repeats a tag`)
  }
})

test("ids are unique and every category exists", () => {
  const ids = CLASSROOM_RESOURCE_OPTIONS.map((o) => o.id)
  assert.equal(new Set(ids).size, ids.length)
  const cats = new Set(CLASSROOM_RESOURCE_CATEGORIES.map((c) => c.id))
  for (const o of CLASSROOM_RESOURCE_OPTIONS) assert.ok(cats.has(o.category), `${o.id}: no category ${o.category}`)
})

test("lookups: built-in by id, custom falls back to General", () => {
  assert.deepEqual(materialSubjects("base-ten-blocks"), ["Math"])
  assert.deepEqual(materialSubjects("not-a-material"), ["General"])
  assert.deepEqual(customMaterialSubjects({ label: "Bird feeder", category: "supplies" }), ["General"])
  assert.deepEqual(customMaterialSubjects({ label: "Hundred chart", category: "supplies", subjects: ["Math"] }), ["Math"])
  assert.equal(isMaterialSubject("Arts"), false)
})
