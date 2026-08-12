export interface ResourceAlignment {
  jurisdiction: string
  grade: number | "K" | "PreK" | null
  subject: string | null
  strand: string | null
  expectation_code: string | null
  expectation_description: string | null
  alignment_strength: "primary" | "secondary"
}

// Pedagogical role a resource plays in a lesson. Closed enum — extend it here
// rather than letting free-form values in, the same rule the planning-question
// answer formats follow.
export type PedagogicalFunction =
  | "hook"
  | "core_teaching"
  | "guided_practice"
  | "independent_practice"
  | "assessment"
  | "extension"

export interface ResourceMetadata {
  added_at: string | null
  added_by: string
  verified: boolean
  needs_review: boolean
  // Triage state, set from the Database Manager's review queue. `review_priority`
  // counts how many times a record has been escalated, so repeat offenders sort
  // to the top of the queue.
  review_priority?: number
  // Last link-health verdict for this record, mirrored from public/link-health.json
  // by the nightly routine. Advisory only: nothing is auto-suppressed on it.
  link_status?: string
  link_checked_at?: string | null
  // Enrichment provenance. A timestamp rather than a boolean so re-enrichment
  // after a prompt change is expressible; null/absent means never enriched.
  enriched_at?: string | null
}

export interface Resource {
  id: string
  topic_title: string
  description: string
  url: string
  publisher_creator: string
  // Grade
  grade_level: (number | "K" | "PreK")[]
  grade_band: "primary" | "junior" | "intermediate" | "senior" | "multi"
  // Subject / curriculum
  subject: string
  strand: string[]
  curriculum_expectations: string[]
  alignments: ResourceAlignment[]
  // Location
  province: string
  jurisdiction: string
  // Language of the resource (ISO 639-1, e.g. "en", "fr"). Absent on a handful of
  // legacy records; treat missing/"en" as English (no language badge on the card).
  language?: string
  // Modality / access
  modality: string[]
  resource_type: string
  access_type: "free" | "purchase" | "licensed"
  is_paid: boolean
  // Accessibility
  accessibility: string[]
  // Publication info
  year_published?: number
  // Pedagogical deployment. Fed to the lesson/question prompts as "Best used as"
  // and "Deployment note" (api/generate-lesson.ts), so these steer generated
  // lessons — they are not display-only metadata. Regenerated per-resource by the
  // enrich-resources routine; earlier values were templated off resource_type.
  instructional_modes?: ("whole-class" | "small-group" | "individual" | "station-rotation")[]
  usage_notes?: string
  pedagogical_function?: PedagogicalFunction
  estimated_minutes?: number
  // Curation state
  is_collection?: boolean
  // Hidden from every teacher-facing search surface without deleting the
  // record. Set from the admin Database Manager (#admin); is_collection is the
  // narrower "this is a hub of resources" flag, suppressed is the catch-all.
  suppressed?: boolean
  // Freeform admin labels applied in the Database Manager (e.g. "needs-review")
  tags?: string[]
  // Provenance
  metadata: ResourceMetadata
}

export interface Filters {
  province: string
  grade: string
  subject: string
  strand: string
  topic: string
  learningType: string
}
