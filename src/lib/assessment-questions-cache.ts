import type { AssessmentQuestion } from "./assessment-types"
import { getLessonLog } from "./lesson-metadata"

const STORAGE_KEY = "maplekey_assessment_questions"

type Store = Record<string, AssessmentQuestion[]>

function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return {}
  }
}

export function getCachedQuestions(lessonId: string): AssessmentQuestion[] | null {
  return read()[lessonId] ?? null
}

export function cacheQuestions(lessonId: string, questions: AssessmentQuestion[]): void {
  const store = read()
  store[lessonId] = questions
  // Keep the cache bounded to lessons that still exist in the log.
  const validIds = new Set(getLessonLog().map((l) => l.id))
  validIds.add(lessonId)
  for (const key of Object.keys(store)) {
    if (!validIds.has(key)) delete store[key]
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Storage quota exceeded — questions stay in component state for this session.
  }
}

export function clearCachedQuestions(lessonId: string): void {
  const store = read()
  if (!(lessonId in store)) return
  delete store[lessonId]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // skip
  }
}
