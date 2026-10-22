#!/usr/bin/env node
/**
 * export-resources.mjs
 * Writes the published resource snapshot from Supabase in resources.json's shape.
 *
 *   node scripts/export-resources.mjs                     # write public/resources.json
 *   node scripts/export-resources.mjs --out path.json     # write elsewhere
 *   node scripts/export-resources.mjs --check public/resources.json
 *   node scripts/export-resources.mjs --if-configured     # the build step: skip quietly without env
 *
 * `pnpm build` runs this after vite with --if-configured --out dist/resources.json,
 * so a build with SUPABASE_URL and SUPABASE_ANON_KEY set (Vercel production, the
 * Pages workflow) ships the database's snapshot over the copy vite took from
 * public/, and one without them (local dev, ci.yml, PR previews) ships the
 * committed public/resources.json. Writing into dist/ means a build never dirties
 * the tracked file. When the env is set, any failure fails the build, so
 * Vercel keeps serving the last good deploy instead of a stale or empty file.
 *
 * --check writes nothing: it exits 1 unless the database and the file hold the
 * same records in the same order (key order and meta.generated_at aside). That
 * is the parity gate for moving the read path off the committed JSON.
 *
 * Reads through the public API with the publishable (anon) key, so it only ever
 * sees what RLS publishes: live rows. The row -> record mapping itself lives in
 * the database (public.resource_json, generated from schema/resource-schema.json).
 *
 * Env: SUPABASE_URL, SUPABASE_ANON_KEY (publishable; safe to expose).
 * No dependencies beyond Node 18+.
 */

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SCHEMA = JSON.parse(readFileSync(join(ROOT, "schema", "resource-schema.json"), "utf8"))

// Fields go out in schema order. jsonb returns keys in its own canonical order,
// so this is what keeps the file readable rather than anything load-bearing.
const FIELD_ORDER = [...SCHEMA.fields.required, ...SCHEMA.fields.optional]
const METADATA_ORDER = [...SCHEMA.metadata_fields.required, ...SCHEMA.metadata_fields.optional]

function ordered(obj, order) {
  const out = {}
  for (const key of order) if (key in obj) out[key] = obj[key]
  for (const key of Object.keys(obj).sort()) if (!(key in out)) out[key] = obj[key]
  return out
}

function shape(doc) {
  return {
    meta: ordered(doc.meta, ["generated_at", "total_count", "schema_version"]),
    resources: doc.resources.map((r) =>
      ordered({ ...r, metadata: ordered(r.metadata ?? {}, METADATA_ORDER) }, FIELD_ORDER),
    ),
  }
}

async function fetchSnapshot() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/export_published_resources`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: "{}",
  })
  if (!res.ok) throw new Error(`export_published_resources: HTTP ${res.status} ${await res.text()}`)
  const doc = await res.json()
  if (!Array.isArray(doc?.resources)) throw new Error("export_published_resources: no resources array")
  return doc
}

// Key-order-insensitive structural equality.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical(value[k])]))
  }
  return value
}

function check(db, file) {
  const problems = []
  const dbIds = db.resources.map((r) => r.id)
  const fileIds = file.resources.map((r) => r.id)
  const inDb = new Set(dbIds)
  const inFile = new Set(fileIds)
  const missing = fileIds.filter((id) => !inDb.has(id))
  const extra = dbIds.filter((id) => !inFile.has(id))
  if (missing.length) problems.push(`${missing.length} in the file but not the database: ${missing.slice(0, 10).join(", ")}`)
  if (extra.length) problems.push(`${extra.length} in the database but not the file: ${extra.slice(0, 10).join(", ")}`)

  const byId = new Map(db.resources.map((r) => [r.id, r]))
  const differing = []
  for (const rec of file.resources) {
    const other = byId.get(rec.id)
    if (other && JSON.stringify(canonical(other)) !== JSON.stringify(canonical(rec))) differing.push(rec.id)
  }
  if (differing.length) problems.push(`${differing.length} records differ: ${differing.slice(0, 10).join(", ")}`)

  const shared = fileIds.filter((id) => inDb.has(id))
  const dbOrder = dbIds.filter((id) => inFile.has(id))
  if (!problems.length && shared.join() !== dbOrder.join()) problems.push("same records, different order")

  for (const key of ["total_count", "schema_version"]) {
    if (db.meta?.[key] !== file.meta?.[key]) problems.push(`meta.${key}: database ${db.meta?.[key]}, file ${file.meta?.[key]}`)
  }
  return problems
}

async function main() {
  const args = process.argv.slice(2)
  const flag = (name) => {
    const i = args.indexOf(name)
    return i === -1 ? undefined : args[i + 1]
  }
  if (args.includes("--if-configured") && !(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)) {
    console.log("skip export: SUPABASE_URL / SUPABASE_ANON_KEY not set, building from the committed public/resources.json")
    return
  }
  const db = shape(await fetchSnapshot())

  const checkPath = flag("--check")
  if (checkPath) {
    const file = JSON.parse(readFileSync(checkPath, "utf8"))
    const problems = check(db, file)
    if (problems.length) {
      console.log(`FAIL database snapshot and ${checkPath} disagree:`)
      for (const p of problems) console.log(`  ${p}`)
      process.exit(1)
    }
    console.log(`OK   database snapshot matches ${checkPath} (${db.resources.length} records)`)
    return
  }

  // An empty snapshot is never a real library; it means RLS, the view or the
  // seed went wrong. Shipping it would blank the site.
  if (db.resources.length === 0) throw new Error("export_published_resources returned no resources; refusing to write")

  const out = flag("--out") ?? join(ROOT, "public", "resources.json")
  writeFileSync(out, JSON.stringify(db, null, 2) + "\n")
  console.log(`wrote ${out} (${db.resources.length} records)`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
