// Pure helpers for "continue from this lesson": building the continuation
// context from a saved lesson, and grouping the library into sequences.
// No storage access here so it stays unit-testable (see lesson-sequence.test.ts).

import type { LessonMetadata } from "./lesson-metadata"
import {
  clampContinuation,
  type ContinuationContext,
  type ContinuationLevelCounts,
} from "../../shared/lesson-continuation"

/**
 * Summarizes `prev` for the generate-lesson prompt. Every field is optional on
 * older saved lessons, so each one degrades to "absent" instead of throwing.
 */
export function buildContinuationContext(
  prev: LessonMetadata,
  quickCheck?: Record<string, ContinuationLevelCounts> | null,
): ContinuationContext {
  const fc = prev.fullContent
  const sections = fc?.sections ?? []
  const lastSection = sections.length > 0 ? sections[sections.length - 1] : undefined

  const activities = sections.length > 0
    ? sections.slice(0, -1).map((s) => `${s.label}: ${s.content}`)
    : [
        fc?.mindsOnContent ?? prev.lessonContent?.mindsOn,
        fc?.actionContent ?? prev.lessonContent?.action,
      ]
        .map((t, i) => (t ? `${i === 0 ? "Minds On" : "Action"}: ${t}` : ""))
        .filter(Boolean)

  const raw = {
    title: prev.title || "Untitled lesson",
    grade: prev.grade,
    subject: prev.subject,
    learningGoal: fc?.learningGoal,
    successCriteria: fc?.successCriteria,
    curriculumCodes: prev.curriculumCodesCovered,
    activities,
    consolidation: lastSection?.content ?? fc?.consolidationContent ?? prev.lessonContent?.consolidation,
    consolidationAssessment: lastSection?.callout ?? fc?.consolidationAssessment,
    reflectionCheckpoint: fc?.reflectionCheckpoint,
    resourceTitles: fc?.materials?.resources?.length
      ? fc.materials.resources
      : prev.resources?.map((r) => r.topic_title),
    quickCheck: quickCheck ?? undefined,
  }
  // clampContinuation only returns null without a title, which we always set.
  return clampContinuation(raw) ?? { title: raw.title }
}

export interface LessonRow {
  lesson: LessonMetadata
  /** Visual indent level, already capped. */
  depth: number
}

export const MAX_SEQUENCE_INDENT = 3

/**
 * Orders `lessons` so follow-ups sit directly beneath their source, depth-first.
 * Roots keep the incoming order (the caller's sort); siblings sit in incoming
 * order too. A lesson whose source isn't in `lessons` (evicted, or filtered
 * out) is a root. Links only ever point at lessons that existed before, so a
 * cycle can't form; the `seen` set is just belt-and-braces.
 */
export function groupLessonsBySequence(
  lessons: LessonMetadata[],
  maxIndent = MAX_SEQUENCE_INDENT,
): LessonRow[] {
  const byId = new Map(lessons.map((l) => [l.id, l]))
  const children = new Map<string, LessonMetadata[]>()
  const roots: LessonMetadata[] = []
  for (const l of lessons) {
    const parentId = l.continuesFrom?.id
    if (parentId && parentId !== l.id && byId.has(parentId)) {
      const list = children.get(parentId) ?? []
      list.push(l)
      children.set(parentId, list)
    } else {
      roots.push(l)
    }
  }

  const rows: LessonRow[] = []
  const seen = new Set<string>()
  const visit = (l: LessonMetadata, depth: number) => {
    if (seen.has(l.id)) return
    seen.add(l.id)
    rows.push({
      lesson: l,
      depth: Math.min(depth, maxIndent),
    })
    for (const c of children.get(l.id) ?? []) visit(c, depth + 1)
  }
  for (const r of roots) visit(r, 0)
  // Anything unreachable (only possible with corrupted data) still shows.
  for (const l of lessons) visit(l, 0)
  return rows
}
