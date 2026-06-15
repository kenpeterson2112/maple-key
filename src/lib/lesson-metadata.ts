import type { Resource } from "./types"

const STORAGE_KEY = "maplekey_lesson_log"
const MAX_ENTRIES = 20

export interface TemplateSection {
  id: string
  label: string
  subtitle: string
  content: string
  callout?: string
}

export type ArtifactSection = "mindsOn" | "action" | "consolidation" | "materials"
export type ArtifactStatus = "unset" | "have" | "will-make" | "help-me"

/** Language for student-facing reproducibles (artifacts + printable organizer). */
export type ReproducibleLanguage = "English" | "French"

export interface LessonArtifact {
  name: string
  purpose: string
  section: ArtifactSection
  status: ArtifactStatus
  /** Teacher's edits to the generic organizer, if they used "Help me make one". */
  organizer?: { fields: Record<string, string> }
}

export interface LessonFullContent {
  mindsOnContent: string
  mindsOnDifferentiation: string
  actionContent: string
  actionDifferentiation: string
  consolidationContent: string
  consolidationAssessment: string
  /** Kept optional so lessons saved before the schema change still load. */
  materialsContent?: string
  learningGoal?: string
  successCriteria?: string[]
  materials?: { resources: string[]; classroomMaterials?: string[]; preparation: string[] }
  excludedResources?: { title: string; reason: string }[]
  sections?: TemplateSection[]
  artifacts?: LessonArtifact[]
  /** Language the student reproducibles were generated in. Defaults to English. */
  reproducibleLanguage?: ReproducibleLanguage
}

export interface LessonMetadata {
  id: string
  timestamp: number
  title: string
  grade: string
  subject: string
  curriculumCodesCovered: string[]
  resourceIds: string[]
  lessonContent?: { mindsOn: string; action: string; consolidation: string }
  lessonLength?: string
  lessonTemplate?: string
  fullContent?: LessonFullContent
  resources?: Resource[]
}

export function logLesson(meta: Omit<LessonMetadata, "id" | "timestamp">): LessonMetadata {
  const entry: LessonMetadata = {
    id: `lesson_${Date.now()}`,
    timestamp: Date.now(),
    ...meta,
  }
  const existing = getLessonLog()
  const updated = [entry, ...existing].slice(0, MAX_ENTRIES)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Storage quota exceeded — silently skip
  }
  return entry
}

/**
 * Patch a saved lesson's fullContent in localStorage. Used for edits that
 * should round-trip when reopening a lesson (e.g. artifact triage decisions).
 */
export function updateLessonFullContent(
  id: string,
  patch: Partial<LessonFullContent>,
): void {
  const log = getLessonLog()
  const idx = log.findIndex((l) => l.id === id)
  if (idx === -1) return
  const current = log[idx]
  const next: LessonMetadata = {
    ...current,
    fullContent: { ...(current.fullContent ?? ({} as LessonFullContent)), ...patch },
  }
  const updated = [...log.slice(0, idx), next, ...log.slice(idx + 1)]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // quota
  }
}

export function getLessonLog(): LessonMetadata[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as LessonMetadata[]) : []
  } catch {
    return []
  }
}

export function getLatestLesson(): LessonMetadata | null {
  const log = getLessonLog()
  return log[0] ?? null
}
