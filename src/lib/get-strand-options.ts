import { SUBJECT_STRANDS, STRAND_CODES } from "@/components/hero-personalize"
import type { PickerOption } from "@/components/inline-picker"

export function getStrandOptions(subject: string): PickerOption[] {
  if (subject === "") {
    return []
  }

  const strands = SUBJECT_STRANDS[subject] ?? []
  return [
    { value: "", label: "any strand" },
    ...strands.map((s) => ({
      value: s,
      label: STRAND_CODES[s] ? `${STRAND_CODES[s]}. ${s}` : s,
    })),
  ]
}
