// Option lists for the class-context pickers (province, grade, subject) and the
// Search strand vocabulary. The hero component that once lived here is gone;
// the class context is chosen in the top nav (context-nav.tsx).

import type { PickerOption } from "@/components/inline-picker"

export const PROVINCES: PickerOption[] = [
  { value: "", label: "anywhere in Canada" },
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
]

export const GRADES: PickerOption[] = [
  { value: "", label: "any grade" },
  { value: "4", label: "Grade 4" },
  { value: "5", label: "Grade 5" },
  { value: "6", label: "Grade 6" },
  { value: "7", label: "Grade 7" },
  { value: "8", label: "Grade 8" },
  { value: "9", label: "Grade 9" },
]

export const SUBJECTS: PickerOption[] = [
  { value: "", label: "any subject" },
  { value: "Math", label: "Math", color: "var(--subject-math)" },
  { value: "Science", label: "Science", color: "var(--subject-science)" },
  { value: "Language", label: "Language", color: "var(--subject-language)" },
  { value: "Social Studies", label: "Social Studies", color: "var(--subject-social)" },
  { value: "FSL", label: "FSL", color: "var(--subject-fsl)" },
  { value: "Health & Physical Education", label: "Health & PE", color: "var(--subject-health)" },
  { value: "History", label: "History", color: "var(--subject-history)" },
  { value: "Geography", label: "Geography", color: "var(--subject-geography)" },
]

// Grade-stable subjects only — History and Geography rename their strands
// every grade, so their options come from curriculum-codes.ts's grade-aware
// `strandsForSubject` instead (see the lookups below).
export const SUBJECT_STRANDS: Record<string, string[]> = {
  Math: [
    "Algebra",
    "Number",
    "Spatial Sense",
    "Data Literacy",
    "Probability",
    "Financial Literacy",
    "Math: Cross-Strand",
  ],
  Science: [
    "Earth and Space Systems",
    "Life Systems",
    "Matter and Energy",
    "Science: Cross-Strand",
    "STEM Skills and Connections",
  ],
  Language: ["Media Literacy", "Writing", "Reading", "Oral Communication"],
  "Social Studies": ["Heritage and Identity", "People and Environments", "Power and Governance"],
  FSL: ["Listening", "Speaking", "Reading", "Writing", "Intercultural Understanding"],
  "Health & Physical Education": [
    "Social-Emotional Learning Skills",
    "Active Living",
    "Movement Competence",
    "Healthy Living",
  ],
}

// Official Ontario curriculum strand letters. Cross-strand / cross-cutting
// entries have no single lettered strand and are left unprefixed.
export const STRAND_CODES: Record<string, string> = {
  // Math (2020)
  Number: "B",
  Algebra: "C",
  "Data Literacy": "D",
  Probability: "D",
  "Spatial Sense": "E",
  "Financial Literacy": "F",
  // Science (2022)
  "STEM Skills and Connections": "A",
  "Life Systems": "B",
  "Matter and Energy": "C",
  "Earth and Space Systems": "E",
  // Language (2023)
  "Media Literacy": "A",
  "Oral Communication": "B",
  Reading: "C",
  Writing: "D",
  // Social Studies, History and Geography (2023)
  "Heritage and Identity": "A",
  "People and Environments": "B",
  // FSL (2013/2014) — Reading and Writing share letters C/D with Language above
  Listening: "A",
  Speaking: "B",
  // Health & Physical Education (2019)
  "Social-Emotional Learning Skills": "A",
  "Active Living": "B",
  "Movement Competence": "C",
  "Healthy Living": "D",
}
