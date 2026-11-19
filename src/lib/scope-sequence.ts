// Which teaching order the "next step" follows for a subject and grade: a
// scope-and-sequence file in src/data/sequences/ when one exists (a district's
// or our own), else the Ontario curriculum's own order (strand by strand,
// overall by overall). See src/data/sequences/README.md.

import { expectationCodes } from "./curriculum-codes"
import { normalizeSubject } from "./subjects"
import type { ScopeSequence } from "./next-step"

interface SequenceFile {
  name: string
  province?: string
  subject: string
  grade: string
  codes: string[]
}

const FILES = Object.values(
  import.meta.glob<SequenceFile>("../data/sequences/*.json", { eager: true, import: "default" }),
)

export function getScopeSequence(subject: string, grade: string): ScopeSequence {
  const curriculum = expectationCodes(subject, grade)
  const file = FILES.find((f) => normalizeSubject(f.subject) === normalizeSubject(subject) && String(f.grade) === grade)
  if (!file) return { name: "the Ontario curriculum order", codes: curriculum }
  const valid = new Set(curriculum)
  const listed = file.codes.filter((c) => valid.has(c))
  const rest = curriculum.filter((c) => !listed.includes(c))
  return { name: file.name, codes: [...listed, ...rest] }
}
