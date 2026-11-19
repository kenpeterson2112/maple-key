// Lesson stage text is a list of short steps, one per line. The model is asked
// for arrays (a JSON array can't break on a raw newline the way a string can),
// and everything downstream — draft state, the saved lesson, the editors, the
// continuation summary — keeps the single newline-joined string it always had.
// Shared by api/generate-lesson.ts (normalizes the response) and the client
// (normalizes pasted responses, and splits for display and print).
// Spec: LESSON_SPEC.md → "Scannable by default".

/** Leading "- ", "• ", "* " or "1. " / "1) " a model or teacher may have typed. */
const LIST_MARKER = /^\s*(?:[-•*▪]|\d{1,2}[.)])\s+/

/** One step per array item. A lesson saved before step lists is one paragraph, so one item. */
export function splitLessonLines(text: string | undefined | null): string[] {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(LIST_MARKER, "").trim())
    .filter(Boolean)
}

/** Accepts the model's array of steps, or a plain string, and returns the stored form. */
export function joinLessonLines(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((v) => String(v ?? "").trim())
      .filter(Boolean)
      .join("\n")
  }
  return typeof value === "string" ? value : ""
}

/** The response fields that hold step lists. `sections[].content` / `.callout` do too. */
export const LESSON_LINE_FIELDS = [
  "mindsOnContent",
  "mindsOnDifferentiation",
  "actionContent",
  "actionDifferentiation",
  "consolidationContent",
  "consolidationAssessment",
] as const

/** Rewrites every step-list field of a raw lesson response to its stored string form, in place. */
export function normalizeLessonLines(lesson: Record<string, unknown>): void {
  for (const field of LESSON_LINE_FIELDS) {
    if (field in lesson) lesson[field] = joinLessonLines(lesson[field])
  }
  if (Array.isArray(lesson.sections)) {
    for (const section of lesson.sections as Record<string, unknown>[]) {
      if (!section || typeof section !== "object") continue
      section.content = joinLessonLines(section.content)
      if ("callout" in section) section.callout = joinLessonLines(section.callout)
    }
  }
}
