// Full curriculum wording, loaded per subject and grade only when needed.
//
// The text lives in public/curriculum/<province>/<lang>/<subject>/g<grade>.json
// (written by scripts/fetch-curriculum.py), not in the bundle: about 25 KB per
// subject/grade, 1 MB for all of Ontario K-8, of which a teacher needs one or
// two. `useCurriculumText(subject, grade)` fetches a file the first time a
// component asks for it, keeps it for the session, and re-renders every
// subscriber when it arrives, so `describeCode` (curriculum-codes.ts) can stay
// synchronous.

import { useEffect, useSyncExternalStore } from "react"
import outlineData from "@/data/curriculum/on.en.outline.json"
import { withBasePath } from "./base-path"
import { fetchJson } from "./fetch-json"
import { normalizeSubject } from "./subjects"

export interface CurriculumSpecific {
  code: string
  /** Sub-heading the curriculum groups it under, e.g. "Rational Numbers". */
  topic: string
  text: string
}

export interface CurriculumOverall {
  code: string
  title: string
  text: string
  specifics: CurriculumSpecific[]
}

export interface CurriculumStrand {
  code: string
  label: string
  overalls: CurriculumOverall[]
}

export interface CurriculumDoc {
  province: string
  language: string
  subject: string
  grade: string
  course_name: string
  source: { publisher: string; url: string; course_codename: string; last_modified: string }
  strands: CurriculumStrand[]
}

export interface LoadedCurriculum {
  doc: CurriculumDoc
  /** Overall and specific codes → wording. */
  byCode: Record<string, string>
}

// One province and language today; the path carries both so adding French is
// a new folder, not a new format.
const PROVINCE = "on"
const LANGUAGE = "en"
const SLUGS: Record<string, string> = Object.fromEntries(
  Object.entries((outlineData as { subjects: Record<string, { slug: string }> }).subjects).map(([s, v]) => [s, v.slug]),
)

const loaded = new Map<string, LoadedCurriculum>()
const inflight = new Map<string, Promise<void>>()
const listeners = new Set<() => void>()
let version = 0

function keyOf(subject: string, grade?: string): string | null {
  const slug = SLUGS[normalizeSubject(subject)]
  return slug && grade ? `${slug}/g${grade}` : null
}

function index(doc: CurriculumDoc): Record<string, string> {
  const byCode: Record<string, string> = {}
  for (const s of doc.strands) {
    for (const o of s.overalls) {
      byCode[o.code] = o.text
      for (const sp of o.specifics) byCode[sp.code] = sp.text
    }
  }
  return byCode
}

/** Fetch a subject/grade's text if it isn't loaded yet. Safe to call repeatedly. */
export function loadCurriculumText(subject: string, grade?: string): Promise<void> {
  const key = keyOf(subject, grade)
  if (!key || loaded.has(key)) return Promise.resolve()
  const pending = inflight.get(key)
  if (pending) return pending
  const p = fetchJson<CurriculumDoc>(withBasePath(`/curriculum/${PROVINCE}/${LANGUAGE}/${key}.json`))
    .then((doc) => {
      loaded.set(key, { doc, byCode: index(doc) })
      version++
      for (const l of listeners) l()
    })
    .catch((err) => {
      // Labels and codes still work from the bundled outline; only the wording
      // is missing, and a later call retries.
      console.warn(`Curriculum text for ${key} did not load:`, err)
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

/** Whatever has loaded for this subject/grade, without fetching. */
export function getLoadedCurriculumText(subject: string, grade?: string): LoadedCurriculum | undefined {
  const key = keyOf(subject, grade)
  return key ? loaded.get(key) : undefined
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Load a subject/grade's wording and re-render when it arrives. Returns it once
 * loaded, undefined before. Call it in any component that shows
 * `describeCode(...)` output.
 */
export function useCurriculumText(subject: string | undefined, grade: string | undefined): LoadedCurriculum | undefined {
  const g = grade?.match(/\w+/g)?.pop()
  useSyncExternalStore(subscribe, () => version)
  useEffect(() => {
    if (subject && g) void loadCurriculumText(subject, g)
  }, [subject, g])
  return subject && g ? getLoadedCurriculumText(subject, g) : undefined
}
