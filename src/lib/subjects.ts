// Canonical subject labels. Lesson/tally data sometimes arrives with
// inconsistent naming (e.g. dev-seed's "Mathematics" vs. the canonical
// "Math" used by personalization, filters, and resource data) — normalize
// here so views like Class Insights don't show duplicate subject tabs.
const SUBJECT_ALIASES: Record<string, string> = {
  mathematics: "Math",
  "social_studies": "Social Studies",
  "health_and_physical_education": "Health & Physical Education",
}

export function normalizeSubject(subject: string): string {
  const trimmed = subject.trim()
  const key = trimmed.toLowerCase()
  return SUBJECT_ALIASES[key] ?? trimmed
}
