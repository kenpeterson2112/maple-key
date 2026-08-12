import crypto from "node:crypto"
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors, getClientIp } from "./_lib/security.js"
import { checkRateLimit } from "./_lib/rate-limit.js"

/**
 * Admin Database Manager "push" endpoint.
 *
 * Takes the changeset accumulated in the #admin UI, applies it to
 * public/resources.json and docs/resources.json as they exist on the base
 * branch, commits the result to a fresh admin/resource-edits-* branch, and
 * opens a draft PR. The repo's PR flow stays the review gate — this endpoint
 * never writes to main directly.
 *
 * Auth is a dedicated shared secret (MK_ADMIN_SECRET) that the admin enters
 * in the UI. Unlike MK_API_SECRET it is NOT baked into the client bundle, so
 * possession of the deployed site alone is not enough to open PRs.
 *
 * Required env: MK_ADMIN_SECRET, MK_ADMIN_GITHUB_TOKEN (repo-scoped
 * fine-grained token with contents:write + pull_requests:write).
 */

const REPO = process.env.MK_ADMIN_REPO ?? "kenpeterson2112/maple-key"
const BASE_BRANCH = process.env.MK_ADMIN_BASE_BRANCH ?? "main"
const RESOURCE_PATHS = ["public/resources.json", "docs/resources.json"]
// Archive of removed rows. Written in the same commit as the deletion, so a
// removal is recoverable without digging through git history. Mirrored to docs/
// for the same reason resources.json is.
const REMOVED_PATHS = ["public/removed-resources.json", "docs/removed-resources.json"]
const MAX_CHANGES = 500
const MAX_FIELD_LENGTH = 5_000
const MAX_NOTE_LENGTH = 2_000
const MAX_REASON_LENGTH = 300

// Mirrors ADMIN_EDITABLE_KEYS in src/lib/admin-changes.ts (api/ can't import
// from src/). Anything outside this list is rejected, so a forged request
// can't rewrite pipeline-owned fields like alignments.
const EDITABLE_KEYS = new Set([
  "topic_title",
  "description",
  "url",
  "publisher_creator",
  "subject",
  "grade_level",
  "strand",
  "curriculum_expectations",
  "usage_notes",
  "is_collection",
  "suppressed",
  "tags",
  "metadata",
])

// `metadata` is the one editable object, and only its triage fields are
// writable — provenance (added_at / added_by), link health, and enrichment
// output stay owned by the pipeline. Mirrors ADMIN_EDITABLE_METADATA_KEYS in
// src/lib/admin-changes.ts. Validated by subkey *and* type, because unlike the
// flat keys this one would otherwise be a hole straight into the record.
const EDITABLE_METADATA_KEYS = new Set(["verified", "needs_review", "review_priority"])
const MAX_REVIEW_PRIORITY = 1_000

// Returns an error string, or null when the value is an acceptable metadata patch.
function validateMetadataPatch(value: unknown, id: string): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return `metadata must be an object (${id})`
  }
  for (const [key, sub] of Object.entries(value as Record<string, unknown>)) {
    if (!EDITABLE_METADATA_KEYS.has(key)) return `metadata field not editable: ${key} (${id})`
    if (key === "review_priority") {
      if (typeof sub !== "number" || !Number.isInteger(sub) || sub < 0 || sub > MAX_REVIEW_PRIORITY) {
        return `metadata.review_priority must be an integer 0-${MAX_REVIEW_PRIORITY} (${id})`
      }
    } else if (typeof sub !== "boolean") {
      return `metadata.${key} must be a boolean (${id})`
    }
  }
  return null
}

interface EditChange {
  action: "edit"
  fields: Record<string, unknown>
}
interface DeleteChange {
  action: "delete"
  reason?: string
}
type Change = EditChange | DeleteChange

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

function validateChanges(raw: unknown): Record<string, Change> | string {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "changes must be an object keyed by resource id"
  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length === 0) return "changes is empty"
  if (entries.length > MAX_CHANGES) return `too many changes (max ${MAX_CHANGES})`

  const out: Record<string, Change> = {}
  for (const [id, value] of entries) {
    if (!/^[\w-]{1,40}$/.test(id)) return `invalid resource id: ${id}`
    const change = value as { action?: unknown; fields?: unknown; reason?: unknown }
    if (change?.action === "delete") {
      if (change.reason !== undefined && typeof change.reason !== "string") {
        return `delete reason must be a string (${id})`
      }
      const reason = typeof change.reason === "string" ? change.reason.trim().slice(0, MAX_REASON_LENGTH) : ""
      out[id] = reason ? { action: "delete", reason } : { action: "delete" }
      continue
    }
    if (change?.action !== "edit" || !change.fields || typeof change.fields !== "object" || Array.isArray(change.fields)) {
      return `invalid change for ${id}`
    }
    const fields = change.fields as Record<string, unknown>
    for (const [key, fieldValue] of Object.entries(fields)) {
      if (!EDITABLE_KEYS.has(key)) return `field not editable: ${key} (${id})`
      if (key === "metadata") {
        const err = validateMetadataPatch(fieldValue, id)
        if (err) return err
        continue
      }
      if (typeof fieldValue === "string" && fieldValue.length > MAX_FIELD_LENGTH) return `field too long: ${key} (${id})`
      if (Array.isArray(fieldValue) && fieldValue.length > 100) return `list too long: ${key} (${id})`
    }
    out[id] = { action: "edit", fields }
  }
  return out
}

// Server-side twin of applyChangeset in src/lib/admin-changes.ts.
function applyChanges(
  resources: Array<Record<string, unknown>>,
  changes: Record<string, Change>,
): {
  resources: Array<Record<string, unknown>>
  applied: string[]
  missing: string[]
  removed: RemovedRecord[]
} {
  const seen = new Set<string>()
  const out: Array<Record<string, unknown>> = []
  const removed: RemovedRecord[] = []
  const removedAt = new Date().toISOString()
  for (const resource of resources) {
    const id = String(resource.id)
    const change = changes[id]
    if (!change) {
      out.push(resource)
      continue
    }
    seen.add(id)
    if (change.action === "delete") {
      // Snapshot before dropping — this is the only copy outside git history.
      removed.push({
        id,
        removed_at: removedAt,
        reason: change.reason ?? "",
        resource,
      })
    }
    if (change.action === "edit") {
      const { metadata, ...flat } = change.fields
      const next: Record<string, unknown> = { ...resource, ...flat }
      // Merge rather than replace: a one-field triage change must not drop
      // added_at / added_by / enrichment output. Twin of applyEdit in
      // src/lib/admin-changes.ts.
      if (metadata) {
        const prev = (resource.metadata ?? {}) as Record<string, unknown>
        next.metadata = { ...prev, ...(metadata as Record<string, unknown>) }
      }
      out.push(next)
    }
  }
  const missing = Object.keys(changes).filter((id) => !seen.has(id))
  return { resources: out, applied: Array.from(seen), missing, removed }
}

interface RemovedRecord {
  id: string
  removed_at: string
  reason: string
  resource: Record<string, unknown>
}

interface RemovedArchive {
  meta: { total_count: number; updated_at: string }
  removed: RemovedRecord[]
}

// Append to the archive, newest last. Returns null when there is nothing to
// archive so the caller can skip writing the file entirely.
function buildRemovedArchive(existing: unknown, removed: RemovedRecord[]): RemovedArchive | null {
  if (removed.length === 0) return null
  const prior = Array.isArray((existing as RemovedArchive | undefined)?.removed)
    ? (existing as RemovedArchive).removed
    : []
  const all = [...prior, ...removed]
  return {
    meta: { total_count: all.length, updated_at: new Date().toISOString() },
    removed: all,
  }
}

async function gh(token: string, path: string, init?: RequestInit & { rawAccept?: string }) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: init?.rawAccept ?? "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(`GitHub ${init?.method ?? "GET"} ${path} → ${res.status}: ${detail.slice(0, 300)}`)
  }
  return res
}

function summarizeForPr(changes: Record<string, Change>): string {
  const lines = Object.entries(changes).map(([id, change]) =>
    change.action === "delete"
      ? `- \`${id}\`: **delete**${change.reason ? ` — ${change.reason}` : ""}`
      : `- \`${id}\`: edit (${Object.keys(change.fields).join(", ")})`,
  )
  const shown = lines.slice(0, 60)
  if (lines.length > shown.length) shown.push(`- …and ${lines.length - shown.length} more`)
  return shown.join("\n")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })
  if (!checkRateLimit(getClientIp(req))) {
    return res.status(429).json({ error: "Too many requests. Please slow down and try again shortly." })
  }

  const expected = process.env.MK_ADMIN_SECRET
  const provided = req.headers["x-mk-admin-key"]
  if (!expected || typeof provided !== "string" || !safeEqual(provided, expected)) {
    return res.status(401).json({ error: "Unauthorized — check the admin key (MK_ADMIN_SECRET)." })
  }

  const token = process.env.MK_ADMIN_GITHUB_TOKEN
  if (!token) {
    return res.status(503).json({ error: "MK_ADMIN_GITHUB_TOKEN is not configured on this deployment." })
  }

  const body = req.body as { changes?: unknown; note?: unknown }
  const changes = validateChanges(body?.changes)
  if (typeof changes === "string") return res.status(400).json({ error: changes })
  const note = typeof body?.note === "string" ? body.note.slice(0, MAX_NOTE_LENGTH) : ""

  try {
    // Base commit to branch from (and to resolve the base tree).
    const ref = (await (await gh(token, `/repos/${REPO}/git/ref/heads/${BASE_BRANCH}`)).json()) as {
      object: { sha: string }
    }
    const baseSha = ref.object.sha
    const baseCommit = (await (await gh(token, `/repos/${REPO}/git/commits/${baseSha}`)).json()) as {
      tree: { sha: string }
    }

    // Both resource files are kept identical, so apply against the canonical
    // public/ copy and write the same blob to both paths.
    const fileRes = await gh(token, `/repos/${REPO}/contents/${RESOURCE_PATHS[0]}?ref=${BASE_BRANCH}`, {
      rawAccept: "application/vnd.github.raw+json",
    })
    const data = JSON.parse(await fileRes.text()) as { resources: Array<Record<string, unknown>> }
    const { resources, applied, missing, removed } = applyChanges(data.resources, changes)
    if (applied.length === 0) {
      return res.status(409).json({ error: `None of the changed ids exist on ${BASE_BRANCH} — refresh and retry.` })
    }
    const content = JSON.stringify({ ...data, resources }, null, 2) + "\n"

    const blob = (await (
      await gh(token, `/repos/${REPO}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: Buffer.from(content).toString("base64"), encoding: "base64" }),
      })
    ).json()) as { sha: string }

    const treeEntries = RESOURCE_PATHS.map((path) => ({
      path,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    }))

    // Archive removed rows in the same commit as the deletion. The file may not
    // exist yet on the base branch, in which case we start it.
    if (removed.length > 0) {
      let existing: unknown
      try {
        const priorRes = await gh(token, `/repos/${REPO}/contents/${REMOVED_PATHS[0]}?ref=${BASE_BRANCH}`, {
          rawAccept: "application/vnd.github.raw+json",
        })
        existing = JSON.parse(await priorRes.text())
      } catch {
        existing = undefined // first removal — the archive doesn't exist yet
      }
      const archive = buildRemovedArchive(existing, removed)
      if (archive) {
        const archiveContent = JSON.stringify(archive, null, 2) + "\n"
        const archiveBlob = (await (
          await gh(token, `/repos/${REPO}/git/blobs`, {
            method: "POST",
            body: JSON.stringify({
              content: Buffer.from(archiveContent).toString("base64"),
              encoding: "base64",
            }),
          })
        ).json()) as { sha: string }
        for (const path of REMOVED_PATHS) {
          treeEntries.push({ path, mode: "100644", type: "blob", sha: archiveBlob.sha })
        }
      }
    }

    const tree = (await (
      await gh(token, `/repos/${REPO}/git/trees`, {
        method: "POST",
        body: JSON.stringify({ base_tree: baseCommit.tree.sha, tree: treeEntries }),
      })
    ).json()) as { sha: string }

    const deletes = Object.values(changes).filter((c) => c.action === "delete").length
    const edits = applied.length - deletes
    const commit = (await (
      await gh(token, `/repos/${REPO}/git/commits`, {
        method: "POST",
        body: JSON.stringify({
          message: `data: ${edits} edit(s), ${deletes} delete(s) via Database Manager${note ? `\n\n${note}` : ""}`,
          tree: tree.sha,
          parents: [baseSha],
        }),
      })
    ).json()) as { sha: string }

    const branch = `admin/resource-edits-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`
    await gh(token, `/repos/${REPO}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
    })

    const pr = (await (
      await gh(token, `/repos/${REPO}/pulls`, {
        method: "POST",
        body: JSON.stringify({
          title: `Database Manager: ${edits} edit(s), ${deletes} delete(s)`,
          head: branch,
          base: BASE_BRANCH,
          draft: true,
          body: [
            "Changes pushed from the admin Database Manager (#admin).",
            note ? `\n> ${note}\n` : "",
            removed.length
              ? `\n${removed.length} removed record(s) were archived to \`${REMOVED_PATHS[0]}\` in this commit — the delete is recoverable from that file.\n`
              : "",
            "\n### Changed records\n",
            summarizeForPr(changes),
            missing.length ? `\n### Skipped (id not found on ${BASE_BRANCH})\n${missing.map((m) => `- \`${m}\``).join("\n")}` : "",
          ].join("\n"),
        }),
      })
    ).json()) as { html_url: string }

    return res.status(200).json({ prUrl: pr.html_url, branch, applied: applied.length, missing })
  } catch (err) {
    console.error("admin-push failed:", err)
    return res.status(502).json({ error: err instanceof Error ? err.message : "GitHub API call failed" })
  }
}
