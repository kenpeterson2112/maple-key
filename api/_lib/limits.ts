/**
 * Input-size caps for the Anthropic-backed endpoints. These exist to bound
 * worst-case prompt size / token spend per request — separate from (and
 * larger than) the smaller "soft" slices each endpoint already applies when
 * building its prompt (e.g. only the first N resources are described to the
 * model). A request that exceeds one of these is rejected outright with 413
 * rather than silently truncated, since exceeding them is a signal of abuse
 * rather than a normal large lesson.
 */
export const MAX_TEACHER_NOTES_LENGTH = 4000
export const MAX_RESOURCES = 50
export const MAX_RESOURCE_TITLE_LENGTH = 300
export const MAX_RESOURCE_DESCRIPTION_LENGTH = 3000
export const MAX_CLASSROOM_RESOURCES = 50
export const MAX_PLANNING_ANSWERS = 20
export const MAX_PLANNING_ANSWER_FIELD_LENGTH = 2000
export const MAX_EXPECTATIONS = 30
export const MAX_LESSON_CONTENT_FIELD_LENGTH = 8000
export const MAX_ASSESSMENT_TITLE_LENGTH = 300

export class PayloadTooLargeError extends Error {}

export function assertMaxLength(value: string | undefined, max: number, field: string): void {
  if (typeof value === "string" && value.length > max) {
    throw new PayloadTooLargeError(`${field} exceeds ${max} characters`)
  }
}

export function assertMaxArrayLength(arr: unknown[] | undefined, max: number, field: string): void {
  if (Array.isArray(arr) && arr.length > max) {
    throw new PayloadTooLargeError(`${field} exceeds ${max} items`)
  }
}
