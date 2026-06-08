import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize a resource's raw `grade_level` into clean grade tokens.
 *
 * The nightly resource export can serialize grades as Python list reprs
 * (e.g. `["['6']"]`), leaving stray brackets and quotes on each entry. Pull
 * out the underlying tokens so filtering and display can rely on clean values
 * like `["6"]` or `["K"]`, regardless of how the export formatted them.
 */
export function normalizeGrades(gradeLevel: unknown): string[] {
  if (!Array.isArray(gradeLevel)) return []
  return gradeLevel.flatMap((g) => String(g).match(/\w+/g) ?? [])
}

/**
 * Map a single grade token to a sortable number: `PreK → -1`, `K → 0`,
 * `"6" → 6`. Unrecognized tokens sort last (`+Infinity`).
 */
export function gradeToNumber(grade: string): number {
  const s = grade.trim().toUpperCase()
  if (s === "PREK") return -1
  if (s === "K") return 0
  const n = Number.parseInt(s, 10)
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n
}

/**
 * Lowest grade a resource targets, as a sortable number — so a multi-grade
 * resource (e.g. grades 6–8) sorts at its earliest grade. Runs the raw
 * `grade_level` through {@link normalizeGrades} first, so it tolerates every
 * historical serialization (ints, `"K"`, even legacy `["['6']"]`). Resources
 * with no usable grade sort last (`+Infinity`).
 */
export function minGrade(gradeLevel: unknown): number {
  const nums = normalizeGrades(gradeLevel).map(gradeToNumber)
  return nums.length ? Math.min(...nums) : Number.POSITIVE_INFINITY
}
