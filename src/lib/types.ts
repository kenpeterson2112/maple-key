export interface ResourceAlignment {
  jurisdiction: string
  grade: number | "K" | "PreK" | null
  subject: string | null
  strand: string | null
  expectation_code: string | null
  expectation_description: string | null
  alignment_strength: "primary" | "secondary"
}

export interface ResourceMetadata {
  added_at: string | null
  added_by: string
  verified: boolean
  needs_review: boolean
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
  // Pedagogical deployment (populated by normalize-resources.py and enrich-usage-notes.py)
  instructional_modes?: ("whole-class" | "small-group" | "individual" | "station-rotation")[]
  usage_notes?: string
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
