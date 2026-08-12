import type { Resource } from "@/lib/types"

// Changeset model for the admin Database Manager (#admin). Edits accumulate
// locally (localStorage) against the read-only resources.json, then get
// pushed as a single PR via api/admin-push.ts, which applies the same
// changeset shape server-side against the repo copy.

// Fields the Database Manager can edit. Kept to display/curation metadata —
// alignments and provenance stay owned by the curation pipeline.
export interface AdminEditableFields {
  topic_title?: string
  description?: string
  url?: string
  publisher_creator?: string
  subject?: string
  grade_level?: (number | "K" | "PreK")[]
  strand?: string[]
  curriculum_expectations?: string[]
  usage_notes?: string
  is_collection?: boolean
  suppressed?: boolean
  tags?: string[]
  // Triage state. Nested under metadata in the record, so this one key is
  // merged into the existing metadata object rather than replacing it — see
  // applyChangeset. Only the review fields are editable; provenance
  // (added_at / added_by) and enrichment output stay owned by the pipeline.
  metadata?: AdminEditableMetadata
}

export interface AdminEditableMetadata {
  verified?: boolean
  needs_review?: boolean
  review_priority?: number
}

export const ADMIN_EDITABLE_METADATA_KEYS = [
  "verified",
  "needs_review",
  "review_priority",
] as const satisfies readonly (keyof AdminEditableMetadata)[]

export const ADMIN_EDITABLE_KEYS = [
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
] as const satisfies readonly (keyof AdminEditableFields)[]

export type AdminChange =
  | { action: "edit"; fields: AdminEditableFields }
  // `reason` is carried so api/admin-push.ts can archive the full row to
  // public/removed-resources.json before dropping it. Optional because the
  // plain trash-icon delete predates the triage queue and doesn't collect one.
  | { action: "delete"; reason?: string }

export const REMOVAL_REASON_MAX = 300

// Keyed by resource id. One entry per touched resource; an edit entry holds
// only the fields that differ from the original record.
export type AdminChangeset = Record<string, AdminChange>

const STORAGE_KEY = "mk-admin-changes"

export function loadChangeset(): AdminChangeset {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AdminChangeset) : {}
  } catch {
    return {}
  }
}

export function saveChangeset(changes: AdminChangeset) {
  try {
    if (Object.keys(changes).length === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(changes))
  } catch {
    // Quota/private-mode failures just mean the changeset won't survive a
    // reload — the in-memory copy keeps working.
  }
}

// NOTE: api/admin-push.ts carries an equivalent of this function for the
// server-side apply (api/ can't import from src/). Keep the semantics in sync.
export function applyChangeset(resources: Resource[], changes: AdminChangeset): Resource[] {
  const out: Resource[] = []
  for (const resource of resources) {
    const change = changes[resource.id]
    if (!change) {
      out.push(resource)
    } else if (change.action === "edit") {
      out.push(applyEdit(resource, change.fields))
    }
    // action === "delete": drop the record entirely
  }
  return out
}

// A plain spread would replace `metadata` wholesale, dropping added_at/added_by
// and any enrichment output for the sake of a one-field triage change. Every
// other editable key is a scalar or array and overwrites cleanly.
export function applyEdit(resource: Resource, fields: AdminEditableFields): Resource {
  const { metadata, ...flat } = fields
  const next: Resource = { ...resource, ...flat }
  if (metadata) next.metadata = { ...resource.metadata, ...metadata }
  return next
}

// ── Triage actions ──────────────────────────────────────────────────────────
// The review queue's three verdicts, as metadata patches. Approve and escalate
// are ordinary edits; remove is a delete (see AdminChange) because a record that
// is genuinely broken should stop being served, not just be hidden. `suppressed`
// remains the soft, non-destructive option for everything else.

export function approvePatch(): AdminEditableMetadata {
  return { needs_review: false, verified: true }
}

// Escalation keeps the record queued and bumps a counter, so a record flagged
// three times sorts above one flagged once.
export function escalatePatch(resource: Resource): AdminEditableMetadata {
  return {
    needs_review: true,
    review_priority: (resource.metadata?.review_priority ?? 0) + 1,
  }
}

// Sort key for the queue: most-escalated first, then oldest-added, so repeat
// offenders and long-ignored records surface before fresh arrivals.
export function reviewQueueOrder(a: Resource, b: Resource): number {
  const byPriority = (b.metadata?.review_priority ?? 0) - (a.metadata?.review_priority ?? 0)
  if (byPriority !== 0) return byPriority
  return (a.metadata?.added_at ?? "").localeCompare(b.metadata?.added_at ?? "")
}

export function countChangeset(changes: AdminChangeset): { edits: number; deletes: number } {
  let edits = 0
  let deletes = 0
  for (const change of Object.values(changes)) {
    if (change.action === "delete") deletes++
    else edits++
  }
  return { edits, deletes }
}

// Reduce a proposed set of field values to only what actually differs from
// the original record, so no-op saves fall out of the changeset. Arrays and
// scalars both compare structurally.
export function diffFields(original: Resource, proposed: AdminEditableFields): AdminEditableFields {
  const diff: AdminEditableFields = {}
  for (const key of ADMIN_EDITABLE_KEYS) {
    if (!(key in proposed)) continue
    if (key === "metadata") {
      // A proposed metadata is a *partial*, so comparing the objects whole
      // would report a change for every key the caller simply left out.
      const metaDiff = diffMetadata(original, proposed.metadata)
      if (metaDiff) diff.metadata = metaDiff
      continue
    }
    const next = proposed[key]
    const prev = original[key]
    // Treat absent boolean flags / tags as false / [] so toggling a flag off
    // on a record that never had it doesn't register as a change.
    const normPrev = prev ?? (typeof next === "boolean" ? false : Array.isArray(next) ? [] : prev)
    if (JSON.stringify(next) !== JSON.stringify(normPrev)) {
      // Assigning through a keyed union confuses tsc; the key/value pairing
      // is guaranteed by the loop over ADMIN_EDITABLE_KEYS.
      ;(diff as Record<string, unknown>)[key] = next
    }
  }
  return diff
}

// Reduce a proposed partial metadata to only the review keys that actually
// differ. Returns undefined when nothing changed, so the caller can drop the
// key entirely rather than storing an empty object in the changeset.
function diffMetadata(
  original: Resource,
  proposed: AdminEditableMetadata | undefined,
): AdminEditableMetadata | undefined {
  if (!proposed) return undefined
  const diff: AdminEditableMetadata = {}
  for (const key of ADMIN_EDITABLE_METADATA_KEYS) {
    if (!(key in proposed)) continue
    const next = proposed[key]
    // review_priority is absent on every record until the first escalation, so
    // an absent counter reads as 0 rather than as a change to 0.
    const prev = original.metadata?.[key] ?? (key === "review_priority" ? 0 : undefined)
    if (JSON.stringify(next) !== JSON.stringify(prev)) {
      ;(diff as Record<string, unknown>)[key] = next
    }
  }
  return Object.keys(diff).length > 0 ? diff : undefined
}
