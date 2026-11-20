/// <reference types="node" />
import { test } from "node:test"
import assert from "node:assert/strict"
import { hasAddress, parseSpaceRoute, serializeSpaceRoute, type Space } from "./space-route"

const TABLE: [Space, string][] = [
  ["home", ""],
  ["lessonplanner", "#plan"],
  ["resources", "#search"],
  ["progress", "#progress"],
  ["lessons", "#lessons"],
  ["settings", "#settings"],
  ["classroom", "#classroom"],
]

test("every space with an address round-trips", () => {
  for (const [space, hash] of TABLE) {
    assert.equal(serializeSpaceRoute({ space }), hash, space)
    assert.deepEqual(parseSpaceRoute(hash), { space }, hash)
  }
})

test("an empty or bare hash is Home", () => {
  assert.deepEqual(parseSpaceRoute(""), { space: "home" })
  assert.deepEqual(parseSpaceRoute("#"), { space: "home" })
})

test("an unknown hash is Home", () => {
  assert.deepEqual(parseSpaceRoute("#nowhere"), { space: "home" })
  assert.deepEqual(parseSpaceRoute("#plan-ish"), { space: "home" })
  assert.deepEqual(parseSpaceRoute("#PLAN"), { space: "home" })
})

test("Quick Check has no address", () => {
  assert.equal(hasAddress("assessment"), false)
  assert.equal(serializeSpaceRoute({ space: "assessment" }), "")
  for (const [space] of TABLE) assert.equal(hasAddress(space), true, space)
})

test("Progress carries a strand, overall or specific anchor", () => {
  for (const anchor of ["B", "B2", "B2.3"]) {
    const hash = `#progress/${anchor}`
    assert.deepEqual(parseSpaceRoute(hash), { space: "progress", anchor })
    assert.equal(serializeSpaceRoute({ space: "progress", anchor }), hash)
  }
  assert.deepEqual(parseSpaceRoute("#progress/"), { space: "progress" })
  assert.deepEqual(parseSpaceRoute("#progress/%E0%A4%A"), { space: "progress" })
})

test("other spaces ignore an anchor", () => {
  assert.deepEqual(parseSpaceRoute("#plan/B2"), { space: "lessonplanner" })
  assert.equal(serializeSpaceRoute({ space: "lessons", anchor: "B2" }), "#lessons")
})

test("no address collides with main.tsx's standalone hashes", () => {
  const standalone = ["#account", "#district", "#admin", "#activity="]
  for (const [space] of TABLE) {
    const hash = serializeSpaceRoute({ space, anchor: "B2" })
    if (!hash) continue
    for (const prefix of standalone) {
      assert.ok(!hash.startsWith(prefix), `${hash} starts with ${prefix}`)
      assert.ok(!prefix.startsWith(hash), `${prefix} starts with ${hash}`)
    }
  }
  for (const prefix of standalone) assert.equal(parseSpaceRoute(prefix).space, "home", prefix)
})
