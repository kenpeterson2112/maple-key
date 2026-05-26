import type { Resource } from "./types"

const STORAGE_KEY = "maplekey_lesson_log"
const MAX_ENTRIES = 20

export interface LessonFullContent {
  mindsOnContent: string
  mindsOnDifferentiation: string
  actionContent: string
  actionDifferentiation: string
  consolidationContent: string
  consolidationAssessment: string
  materialsContent: string
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
