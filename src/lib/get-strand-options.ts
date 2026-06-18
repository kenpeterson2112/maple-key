import { SUBJECT_STRANDS, STRAND_CODES } from "@/components/hero-personalize"
import { strandsForSubject } from "@/lib/curriculum-codes"
import type { PickerOption } from "@/components/inline-picker"

// Strand option values for a subject (and grade, for subjects whose strand
// names shift by grade — History, Geography). Used both to render pickers and
// to validate strand selections in global-filters.ts.
export function getStrandValues(subject: string, grade?: string): string[] {
  if (subject === "") return []
  const staticStrands = SUBJECT_STRANDS[subject]
  if (staticStrands) return staticStrands
  return strandsForSubject(subject, grade).map((s) => s.label)
}

export function getStrandOptions(subject: string, grade?: string): PickerOption[] {
  if (subject === "") {
    return []
  }

  const staticStrands = SUBJECT_STRANDS[subject]
  const options = staticStrands
    ? staticStrands.map((s) => ({
        value: s,
        label: STRAND_CODES[s] ? `${STRAND_CODES[s]}. ${s}` : s,
      }))
    : strandsForSubject(subject, grade).map((s) => ({ value: s.label, label: `${s.code}. ${s.label}` }))

  return [{ value: "", label: "any strand" }, ...options]
}
