// Maple Key curriculum taxonomy — subject-aware, grade-aware, backed by the
// official Ontario curriculum.
//
// Progress checking is keyed on the OVERALL EXPECTATION (e.g. "D1"), grouped by
// STRAND (e.g. "D"), and drilled into SPECIFIC EXPECTATIONS (e.g. "D1.1"). Those
// code *relationships* are pure structure — split on "." for the overall, take
// the first letter for the strand — and hold for every Ontario subject, so they
// need no per-subject data.
//
// Human-readable LABELS are keyed by SUBJECT then GRADE: the same code means
// different things in different subjects ("D1.1" is data literacy in Math but
// writing in FSL) and, for History/Geography/Social Studies, in different grades.
//
// The data comes from scripts/fetch-curriculum.py, which pulls the Ministry's
// published curriculum. Two layers:
//   - the OUTLINE (src/data/curriculum/on.en.outline.json): strand labels,
//     overall titles and every expectation code, no text. Bundled, so every
//     lookup here is synchronous.
//   - the TEXT (public/curriculum/on/en/<subject>/g<grade>.json): the full
//     wording, fetched only when a subject/grade is opened. See
//     src/lib/curriculum-text.ts; `describeCode` reads whatever has loaded.
//
// A lookup with no grade (or a grade the curriculum doesn't cover) uses the
// label only when every grade of that subject agrees on it (Math's strands, say)
// and otherwise degrades to the bare code.

import outlineData from "@/data/curriculum/on.en.outline.json"
import { normalizeSubject } from "./subjects"
import { getLoadedCurriculumText } from "./curriculum-text"

// ---- Structure (subject-independent) ----

export function overallCodeOf(code: string): string {
  return code.split(".")[0]
}

// The strand is the code's leading letters: "D1" → "D", and Grade 9 Math's
// SEL strand "AA1" → "AA" (not "A", which is a different strand there).
export function strandCodeOf(overall: string): string {
  return overall.match(/^[A-Za-z]+/)?.[0] ?? overall.charAt(0)
}

// Real expectation codes are always <strand letter(s)><overall number>[.<specific
// number>] (e.g. "D1", "D1.1"). Lesson plans can carry free-form fallback "codes"
// (short concept labels) when the AI had no curriculum code to attach to a
// question — those must never reach the coverage tree, since `strandCodeOf`
// would otherwise turn a bare/malformed token into a fake one-letter strand.
const EXPECTATION_CODE_PATTERN = /^[A-Za-z]+\d+(\.\d+)?$/

export function isExpectationCode(code: string): boolean {
  return EXPECTATION_CODE_PATTERN.test(code)
}

export function groupByOverall(codes: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const code of codes) {
    ;(out[overallCodeOf(code)] ??= []).push(code)
  }
  return out
}

export function groupByStrand(overalls: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const overall of overalls) {
    ;(out[strandCodeOf(overall)] ??= []).push(overall)
  }
  return out
}

// ---- Outline ----

export interface OutlineOverall {
  code: string
  title: string
  /** Every specific-expectation code under this overall, in curriculum order. */
  specifics: string[]
}

export interface OutlineStrand {
  code: string
  label: string
  overalls: OutlineOverall[]
}

interface Outline {
  province: string
  language: string
  subjects: Record<string, { slug: string; grades: Record<string, { strands: OutlineStrand[] }> }>
}

// Ontario, English, today. A second province or French is a second outline file
// from the same script; the lookups below take it from here.
const OUTLINE = outlineData as Outline

/** "Grade 6", "[6]", " 6" → "6". */
function gradeKey(grade?: string): string | undefined {
  const token = grade?.match(/\w+/g)?.pop()
  return token?.replace(/^grade$/i, "") || undefined
}

/** File-system slug for a subject's text files, or undefined if not covered. */
export function curriculumSlug(subject: string): string | undefined {
  return OUTLINE.subjects[normalizeSubject(subject)]?.slug
}

/** The strands (with overalls and specific codes) for one subject and grade. */
export function curriculumOutline(subject: string, grade?: string): OutlineStrand[] {
  const g = gradeKey(grade)
  if (!g) return []
  return OUTLINE.subjects[normalizeSubject(subject)]?.grades[g]?.strands ?? []
}

/** Grades the curriculum covers for a subject, in order. */
export function curriculumGrades(subject: string): string[] {
  return Object.keys(OUTLINE.subjects[normalizeSubject(subject)]?.grades ?? {})
}

// Labels every grade of a subject agrees on, for grade-less lookups.
const GRADE_STABLE: Record<string, { strands: Record<string, string>; overalls: Record<string, string> }> = {}
for (const [subject, { grades }] of Object.entries(OUTLINE.subjects)) {
  const strands: Record<string, string | null> = {}
  const overalls: Record<string, string | null> = {}
  for (const { strands: list } of Object.values(grades)) {
    for (const s of list) {
      strands[s.code] = s.code in strands && strands[s.code] !== s.label ? null : s.label
      for (const o of s.overalls) {
        overalls[o.code] = o.code in overalls && overalls[o.code] !== o.title ? null : o.title
      }
    }
  }
  const keep = (m: Record<string, string | null>) =>
    Object.fromEntries(Object.entries(m).filter((e): e is [string, string] => e[1] !== null))
  GRADE_STABLE[subject] = { strands: keep(strands), overalls: keep(overalls) }
}

function findStrand(subject: string, strand: string, grade?: string): string | undefined {
  const graded = curriculumOutline(subject, grade).find((s) => s.code === strand)
  return graded?.label ?? GRADE_STABLE[normalizeSubject(subject)]?.strands[strand]
}

function findOverall(subject: string, overall: string, grade?: string): string | undefined {
  for (const s of curriculumOutline(subject, grade)) {
    const o = s.overalls.find((x) => x.code === overall)
    if (o) return o.title
  }
  return GRADE_STABLE[normalizeSubject(subject)]?.overalls[overall]
}

// ---- Strand labels ----

export function strandLabel(subject: string, strand: string, grade?: string): string {
  return findStrand(subject, strand, grade) ?? strand
}

// True when we have a real strand name for this code (vs. a bare-letter fallback).
// Drives whether a dashboard groups overalls under named strand headers.
export function hasStrandLabel(subject: string, strand: string, grade?: string): boolean {
  return findStrand(subject, strand, grade) !== undefined
}

// All strand letter/label pairs for a subject at a grade (or the grade-stable
// set when ungraded). UI strand pickers for History/Geography read this, since
// their strand names change every grade.
export function strandsForSubject(subject: string, grade?: string): { code: string; label: string }[] {
  const graded = curriculumOutline(subject, grade)
  if (graded.length > 0) return graded.map((s) => ({ code: s.code, label: s.label }))
  const stable = GRADE_STABLE[normalizeSubject(subject)]?.strands ?? {}
  return Object.entries(stable)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, label]) => ({ code, label }))
}

// ---- Overall expectations ----

// Strict gloss: the overall's real name, or the bare code when we don't have one.
// Use where a caller wants to detect "do we have a friendly name?" (label !== code).
export function overallLabel(subject: string, overall: string, grade?: string): string {
  return findOverall(subject, overall, grade) ?? overall
}

// Display title for an overall row. Prefers the overall's name; falls back to
// the strand name as context so a row never shows the code twice (the code is
// rendered separately as a badge); finally the code.
export function overallTitle(subject: string, overall: string, grade?: string): string {
  return findOverall(subject, overall, grade) ?? findStrand(subject, strandCodeOf(overall), grade) ?? overall
}

// ---- Specific expectations ----

// Every specific-expectation code for a subject and grade, in curriculum order.
// The denominator for "how much of the curriculum has this class covered".
export function expectationCodes(subject: string, grade?: string): string[] {
  return curriculumOutline(subject, grade).flatMap((s) => s.overalls.flatMap((o) => o.specifics))
}

// True when `code` is a real expectation (overall or specific) in this
// subject and grade. False for anything else, including codes the resource
// catalogue carries that the curriculum doesn't have.
export function isCurriculumCode(subject: string, code: string, grade?: string): boolean {
  return curriculumOutline(subject, grade).some((s) =>
    s.overalls.some((o) => o.code === code || o.specifics.includes(code)),
  )
}

// The expectation's wording, once that subject/grade's text has loaded
// (components call useCurriculumText to load it and re-render). Undefined until
// then, and for codes the curriculum doesn't have; callers fall back to the code.
export function describeCode(subject: string, code: string, grade?: string): string | undefined {
  return getLoadedCurriculumText(subject, gradeKey(grade))?.byCode[code]
}
