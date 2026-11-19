/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { groupMaterials, listMyMaterials, suggestionsFor } from "./materials-for-subject"

const mine = listMyMaterials(
  ["base-ten-blocks", "projector", "levelled-readers", "science-lab", "graph-paper", "library-access", "science-equipment"],
  [{ label: "Bird feeder", category: "supplies" }, { label: "Hundred chart", category: "supplies", subjects: ["Math"] }],
)
const labels = (g: { items: { label: string }[] }) => g.items.map((m) => m.label)

test("Math: math materials first, manipulatives before supplies; then General; then the rest", () => {
  const groups = groupMaterials(mine, "Math")
  assert.deepEqual(groups.map((g) => g.label), ["For Math", "Every subject", "Other subjects"])
  assert.deepEqual(labels(groups[0]), ["Base Ten Blocks", "Graph Paper", "Hundred chart"])
  assert.deepEqual(labels(groups[1]), ["Bird feeder", "Projector"])
  assert.ok(labels(groups[2]).includes("Levelled Readers"))
})

test("Language: books first, then the reading spaces", () => {
  const [first] = groupMaterials(mine, "Language")
  assert.deepEqual(labels(first), ["Levelled Readers", "School Library Access"])
})

test("Science: the lab first, then equipment", () => {
  const [first] = groupMaterials(mine, "Science")
  assert.deepEqual(labels(first), ["Science Lab Access", "Basic Science Equipment"])
})

test("every material appears exactly once whatever the subject", () => {
  for (const subject of ["", "Math", "Language", "Science", "Geography"] as const) {
    const all = groupMaterials(mine, subject).flatMap((g) => g.items.map((m) => m.key))
    assert.equal(all.length, mine.length, subject || "no subject")
    assert.equal(new Set(all).size, mine.length)
  }
})

test("no subject: grouped by type, empty types left out", () => {
  const groups = groupMaterials(mine, "")
  assert.equal(groups[0].label, "Math Manipulatives")
  assert.ok(groups.every((g) => g.items.length > 0))
})

test("suggestions: unadded materials for the subject, manipulatives first for Math", () => {
  const s = suggestionsFor("Math", ["base-ten-blocks"], 3)
  assert.equal(s.length, 3)
  assert.ok(s.every((m) => m.category === "math-manipulatives" && m.key !== "base-ten-blocks"))
  assert.deepEqual(suggestionsFor("", []), [])
})
