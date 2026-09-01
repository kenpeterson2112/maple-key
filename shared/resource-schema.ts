// Canonical resource schema, shared by the client and the Vercel functions.
//
// The vocabularies themselves live in schema/resource-schema.json, not here, so
// the Python ingest scripts (scripts/_schema.py) read exactly the same values.
// This module is the TypeScript face of that file: it declares the literal union
// types and re-exports the JSON's arrays typed against them.
//
// Why a shared/ directory rather than src/lib: api/ cannot import from src/, so
// before this the allowlists in src/lib/admin-changes.ts and api/admin-push.ts
// were two hand-maintained copies kept in sync by comment. Both tsconfig.json
// and tsconfig.api.json now include this directory.
//
// The literal unions below are declared by hand because a JSON import widens to
// string[] — TypeScript cannot narrow it back to a union. scripts/check-schema-sync.py
// closes that gap in CI, so adding a value to the JSON without adding it here
// fails the build.

import schema from "../schema/resource-schema.json"

// ── Vocabulary types ────────────────────────────────────────────────────────

export type GradeLevel = number | "K" | "PreK"
export type GradeBand = "primary" | "junior" | "intermediate" | "senior" | "multi"

export type Subject =
  | "FSL"
  | "Geography"
  | "Health & Physical Education"
  | "History"
  | "Language"
  | "Math"
  | "Science"
  | "Social Studies"

export type Modality =
  | "Audio/Podcast"
  | "Books & Print Media"
  | "Field Trip"
  | "Guest Speaker"
  | "Interactive"
  | "Online"
  | "Video"

export type ResourceType =
  | "audio"
  | "digital"
  | "interactive"
  | "kit"
  | "other"
  | "physical"
  | "print"
  | "video"

export type AccessType = "free" | "purchase" | "licensed"

export type AccessibilityRating = "No Concerns" | "Some Concerns" | "Not Accessible"

export type InstructionalMode =
  | "whole-class"
  | "small-group"
  | "individual"
  | "station-rotation"

// Pedagogical role a resource plays in a lesson. Closed enum — extend it in
// schema/resource-schema.json and here, the same rule the planning-question
// answer formats follow.
export type PedagogicalFunction =
  | "hook"
  | "core_teaching"
  | "guided_practice"
  | "independent_practice"
  | "assessment"
  | "extension"

// Last link-health verdict. The dead/dead_domain vs blocked/error split is
// load-bearing: "the site said so" must never collapse into "our request
// failed". Advisory only — nothing is auto-suppressed on a link verdict.
export type LinkStatus =
  | "live"
  | "dead"
  | "dead_domain"
  | "invalid"
  | "moved"
  | "blocked"
  | "error"

export type Province = keyof typeof schema.vocabularies.jurisdiction_by_province
export type Jurisdiction =
  (typeof schema.vocabularies.jurisdiction_by_province)[Province]

// Strand has 28 members and turns over as curriculum documents change, so it is
// validated against the JSON rather than mirrored as a union here.
export type Strand = string

// ── Vocabularies ────────────────────────────────────────────────────────────

export const SCHEMA_VERSION = schema.schema_version

export const GRADE_BANDS = schema.vocabularies.grade_band as readonly GradeBand[]
export const SUBJECTS = schema.vocabularies.subject as readonly Subject[]
export const STRANDS = schema.vocabularies.strand as readonly Strand[]
export const MODALITIES = schema.vocabularies.modality as readonly Modality[]
export const RESOURCE_TYPES = schema.vocabularies.resource_type as readonly ResourceType[]
export const ACCESS_TYPES = schema.vocabularies.access_type as readonly AccessType[]
export const ACCESSIBILITY_RATINGS =
  schema.vocabularies.accessibility as readonly AccessibilityRating[]
export const INSTRUCTIONAL_MODES =
  schema.vocabularies.instructional_modes as readonly InstructionalMode[]
export const PEDAGOGICAL_FUNCTIONS =
  schema.vocabularies.pedagogical_function as readonly PedagogicalFunction[]
export const LINK_STATUSES = schema.vocabularies.link_status as readonly LinkStatus[]
export const JURISDICTION_BY_PROVINCE = schema.vocabularies.jurisdiction_by_province
export const PROVINCES = Object.keys(JURISDICTION_BY_PROVINCE) as readonly Province[]

export const GRADE_LEVEL_RANGE = schema.vocabularies.grade_level

// ── Field contract ──────────────────────────────────────────────────────────

export const REQUIRED_FIELDS = schema.fields.required as readonly string[]
export const OPTIONAL_FIELDS = schema.fields.optional as readonly string[]
// Written only when true, omitted otherwise — never written as false.
export const FLAG_FIELDS = schema.fields.flags as readonly string[]
export const REQUIRED_METADATA_FIELDS = schema.metadata_fields.required as readonly string[]
export const OPTIONAL_METADATA_FIELDS = schema.metadata_fields.optional as readonly string[]

// ── Admin allowlists ────────────────────────────────────────────────────────

// Literal tuples rather than the JSON's string[] so callers keep `keyof`
// checking against AdminEditableFields. scripts/check-schema-sync.py proves they
// match schema/resource-schema.json.
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
] as const

export const ADMIN_EDITABLE_METADATA_KEYS = [
  "verified",
  "needs_review",
  "review_priority",
] as const

export const ADMIN_VOCABULARY_CHECKED_KEYS =
  schema.admin.vocabulary_checked_keys as readonly string[]
export const ADMIN_LIMITS = schema.admin.limits

// ── Validation ──────────────────────────────────────────────────────────────

const VOCABULARY_BY_FIELD: Record<string, readonly string[]> = {
  grade_band: GRADE_BANDS,
  subject: SUBJECTS,
  strand: STRANDS,
  modality: MODALITIES,
  resource_type: RESOURCE_TYPES,
  access_type: ACCESS_TYPES,
  accessibility: ACCESSIBILITY_RATINGS,
  instructional_modes: INSTRUCTIONAL_MODES,
  pedagogical_function: PEDAGOGICAL_FUNCTIONS,
  link_status: LINK_STATUSES,
  province: PROVINCES,
}

// True when `field` has a closed vocabulary and every supplied value is in it.
// Scalars and arrays are both accepted, since strand/modality/accessibility are
// arrays of vocabulary members while subject/grade_band are scalars.
export function isInVocabulary(field: string, value: unknown): boolean {
  const vocabulary = VOCABULARY_BY_FIELD[field]
  if (!vocabulary) return true
  const values = Array.isArray(value) ? value : [value]
  return values.every((v) => typeof v === "string" && vocabulary.includes(v))
}

export function isValidGradeLevel(value: unknown): boolean {
  if (typeof value === "string") {
    return (GRADE_LEVEL_RANGE.named as readonly string[]).includes(value)
  }
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= GRADE_LEVEL_RANGE.numeric_min &&
    value <= GRADE_LEVEL_RANGE.numeric_max
  )
}
