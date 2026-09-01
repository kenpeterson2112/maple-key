// The resource record. Field vocabularies are not declared here — they live in
// schema/resource-schema.json and reach TypeScript through shared/resource-schema.ts,
// which api/ and the Python ingest scripts read from too. Add a value there, not here.
import type {
  AccessType,
  AccessibilityRating,
  GradeBand,
  GradeLevel,
  InstructionalMode,
  Jurisdiction,
  LinkStatus,
  Modality,
  PedagogicalFunction,
  Province,
  ResourceType,
  Strand,
  Subject,
} from "../../shared/resource-schema"

export type {
  AccessType,
  AccessibilityRating,
  GradeBand,
  GradeLevel,
  InstructionalMode,
  Jurisdiction,
  LinkStatus,
  Modality,
  PedagogicalFunction,
  Province,
  ResourceType,
  Strand,
  Subject,
}

export interface ResourceMetadata {
  added_at: string | null
  added_by: string
  verified: boolean
  needs_review: boolean
  // Triage state, set from the Database Manager's review queue. `review_priority`
  // counts how many times a record has been escalated, so repeat offenders sort
  // to the top of the queue. Absent until the first escalation — readers default
  // it to 0.
  review_priority?: number
  // Last link-health verdict for this record. Advisory only: nothing is
  // auto-suppressed on it, and `dead`/`dead_domain` ("the site said so") must
  // never be conflated with `blocked`/`error` ("our request failed").
  link_status?: LinkStatus
  link_checked_at?: string | null
  // Enrichment provenance. A timestamp rather than a boolean so re-enrichment
  // after a prompt change is expressible; null/absent means never enriched, and
  // scripts/enrich-resources.py uses it as its resumability key.
  enriched_at?: string | null
}

export interface Resource {
  id: string
  topic_title: string
  description: string
  url: string
  publisher_creator: string
  // Grade
  grade_level: GradeLevel[]
  grade_band: GradeBand
  // Subject / curriculum
  subject: Subject
  strand: Strand[]
  curriculum_expectations: string[]
  // Location. `jurisdiction` is the snake_case expansion of `province`; the
  // pairing is enforced by scripts/validate-resources.py.
  province: Province
  jurisdiction: Jurisdiction
  // Language of the resource (ISO 639-1, e.g. "en", "fr"). Absent on a handful of
  // legacy records; treat missing/"en" as English (no language badge on the card).
  language?: string
  // Modality / access. `is_paid` is derivable from `access_type` and the two are
  // held in step by a validator invariant; it stays a field because the sidebar
  // filter and the card badge both read it directly.
  modality: Modality[]
  resource_type: ResourceType
  access_type: AccessType
  is_paid: boolean
  // Accessibility
  accessibility: AccessibilityRating[]
  // Publication info
  year_published?: number
  // Pedagogical deployment. Fed to the lesson/question prompts as "Best used as"
  // and "Deployment note" (api/generate-lesson.ts), so these steer generated
  // lessons — they are not display-only metadata. Regenerated per-resource by the
  // enrich-resources routine; earlier values were templated off resource_type.
  instructional_modes?: InstructionalMode[]
  usage_notes?: string | null
  pedagogical_function?: PedagogicalFunction
  estimated_minutes?: number
  // Curation state. These three are flags: written only when true and omitted
  // otherwise, never written as false. diffFields() in admin-changes.ts coerces
  // an absent flag to false so toggling one off on a record that never carried
  // it doesn't register as a change.
  is_collection?: boolean
  // Hidden from every teacher-facing search surface without deleting the
  // record. Set from the admin Database Manager (#admin); is_collection is the
  // narrower "this is a hub of resources" flag, suppressed is the catch-all.
  suppressed?: boolean
  // Set by scripts/atomize-collections.py on a collection that has been split
  // into individual records, so a later pass doesn't re-split it.
  decomposed?: boolean
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
