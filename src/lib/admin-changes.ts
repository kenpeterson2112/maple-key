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
}

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
] as const satisfies readonly (keyof AdminEditableFields)[]

export type AdminChange =
  | { action: "edit"; fields: AdminEditableFields }
  | { action: "delete" }

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
      out.push({ ...resource, ...change.fields })
    }
    // action === "delete": drop the record entirely
  }
  return out
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
