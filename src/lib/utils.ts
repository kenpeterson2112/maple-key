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
