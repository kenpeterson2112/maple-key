// The one rule for expectation codes on a resource, shared by the admin editor
// (src/components/admin) and the admin push endpoint (api/admin-push.ts):
// every code must exist in the curriculum data for the resource's subject and
// one of its grades. scripts/validate-resources.py enforces the same rule in
// CI. The data is the Ministry's own, from scripts/fetch-curriculum.py.

import outline from "../src/data/curriculum/on.en.outline.json" with { type: "json" }

interface OutlineShape {
  subjects: Record<string, { grades: Record<string, { strands: { overalls: { code: string; specifics: string[] }[] }[] }> }>
}

const CODES = new Map<string, Set<string>>()
for (const [subject, { grades }] of Object.entries((outline as OutlineShape).subjects)) {
  for (const [grade, { strands }] of Object.entries(grades)) {
    const set = new Set<string>()
    for (const s of strands) {
      for (const o of s.overalls) {
        set.add(o.code)
        for (const c of o.specifics) set.add(c)
      }
    }
    CODES.set(`${subject}|${grade}`, set)
  }
}

/** Why a resource's codes don't match the curriculum, one line per problem; empty when they do. */
export function expectationCodeProblems(
  subject: string,
  grades: readonly (string | number)[],
  codes: readonly string[],
): string[] {
  if (codes.length === 0) return []
  const covered = grades.map((g) => CODES.get(`${subject}|${g}`)).filter((s): s is Set<string> => !!s)
  const gradeList = grades.length > 0 ? grades.join(", ") : "(none)"
  if (covered.length === 0) {
    return [`There is no ${subject} curriculum for grade ${gradeList}, so it can't carry expectation codes.`]
  }
  return codes
    .filter((c) => !covered.some((set) => set.has(c)))
    .map((c) => `${c} is not an Ontario ${subject} expectation for grade ${gradeList}.`)
}
