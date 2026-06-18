// Maple Key curriculum taxonomy — subject-aware, degrade-friendly.
//
// Progress checking is keyed on the OVERALL EXPECTATION (e.g. "D1"), grouped by
// STRAND (e.g. "D"), and drilled into SPECIFIC EXPECTATIONS (e.g. "D1.1"). Those
// code *relationships* are pure structure — split on "." for the overall, take
// the first letter for the strand — and hold for every Ontario subject, so they
// need no per-subject data.
//
// Human-readable LABELS are the opposite: the same code string means different
// things in different subjects ("D1.1" is data literacy in Math but a listening
// expectation in FSL), so every label lookup is keyed by SUBJECT first. We ship
// authoritative STRAND names for all subjects (a small, grade-stable set) plus
// the overall/specific glosses we actually have (Math Data, Probability, and
// Financial Literacy today). Anything without a gloss degrades to the bare code,
// which is always correct — that is the "structure now, glosses later" contract.

import { normalizeSubject } from "./subjects"

// ---- Structure (subject-independent) ----

export function overallCodeOf(code: string): string {
  return code.split(".")[0]
}

export function strandCodeOf(overall: string): string {
  return overall.charAt(0)
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

// ---- Strand labels (subject-keyed, authoritative) ----
// Strand letter → strand name, per subject. These are the current Ontario strand
// names, which are grade-stable, so this stays a small fixed table rather than the
// deep per-grade/per-province work. Codes whose letter isn't listed (legacy
// curriculum versions, cross-strand tags) fall back to the bare letter.
const STRAND_LABELS: Record<string, Record<string, string>> = {
  Math: {
    A: "Social-Emotional Learning",
    B: "Number",
    C: "Algebra",
    D: "Data",
    E: "Spatial Sense",
    F: "Financial Literacy",
  },
  Science: {
    A: "STEM Skills & Connections",
    B: "Life Systems",
    C: "Matter and Energy",
    D: "Structures and Mechanisms",
    E: "Earth and Space Systems",
  },
  "Social Studies": {
    A: "Heritage and Identity",
    B: "People and Environments",
  },
  Language: {
    A: "Literacy Connections",
    B: "Foundations of Language",
    C: "Comprehension",
    D: "Composition",
  },
  FSL: {
    A: "Listening",
    B: "Speaking",
    C: "Reading",
    D: "Writing",
  },
  "Health & Physical Education": {
    A: "Social-Emotional Skills",
    B: "Active Living",
    C: "Movement Competence",
    D: "Healthy Living",
  },
}

export function strandLabel(subject: string, strand: string): string {
  return STRAND_LABELS[normalizeSubject(subject)]?.[strand] ?? strand
}

// True when we have a real strand name for this code (vs. a bare-letter fallback).
// Drives whether a dashboard groups overalls under named strand headers.
export function hasStrandLabel(subject: string, strand: string): boolean {
  return Boolean(STRAND_LABELS[normalizeSubject(subject)]?.[strand])
}

// ---- Overall-expectation glosses (subject-keyed; sparse, degrade to code) ----
// Only the overalls we have human-readable names for. Everything else degrades to
// the code via overallLabel/overallTitle.
const OVERALL_LABELS: Record<string, Record<string, string>> = {
  Math: {
    D1: "Data Literacy",
    D2: "Probability",
    F1: "Financial Literacy",
  },
}

// Strict gloss: the overall's real name, or the bare code when we don't have one.
// Use where a caller wants to detect "do we have a friendly name?" (label !== code).
export function overallLabel(subject: string, overall: string): string {
  return OVERALL_LABELS[normalizeSubject(subject)]?.[overall] ?? overall
}

// Display title for an overall row. Prefers the gloss; falls back to the strand
// name as context (e.g. Science "B2" → "Life Systems") so a row never shows the
// code twice (the code is rendered separately as a badge); finally the code.
export function overallTitle(subject: string, overall: string): string {
  const canonical = normalizeSubject(subject)
  const gloss = OVERALL_LABELS[canonical]?.[overall]
  if (gloss) return gloss
  return STRAND_LABELS[canonical]?.[strandCodeOf(overall)] ?? overall
}

// ---- Specific-expectation descriptions (subject-keyed; sparse, may be absent) ----
// Today only Grade-7 Math Data/Probability/Financial Literacy carry full text.
// Non-described codes return undefined and callers fall back to the bare code.
const SPECIFIC_DESCRIPTIONS: Record<string, Record<string, string>> = {
  Math: {
    // Data Literacy
    "D1.1": "describe the difference between discrete and continuous data, and provide examples of each",
    "D1.2":
      "collect qualitative data and discrete and continuous quantitative data to answer questions of interest about a population, and organize the sets of data as appropriate, including using intervals",
    "D1.3":
      "select from among a variety of graphs, including histograms and broken-line graphs, the type of graph best suited to represent various sets of data; display the data in the graphs with proper sources, titles, and labels, and appropriate scales; and justify their choice of graphs",
    "D1.4":
      "create an infographic about a data set, representing the data in appropriate ways, including in tables, histograms, and broken-line graphs, and incorporating any other relevant information that helps to tell a story about the data",
    "D1.5":
      "determine the range as a measure of spread and the measures of central tendency for various data sets, and use this information to compare two or more data sets",
    "D1.6":
      "analyse different sets of data presented in various ways, including in histograms and broken-line graphs and in misleading graphs, by asking and answering questions about the data, challenging preconceived notions, and drawing conclusions, then make convincing arguments and informed decisions",
    // Probability
    "D2.1":
      "use fractions, decimals, and percents to express the probability of events happening, represent this probability on a probability line, and use it to make predictions and informed decisions",
    "D2.2": "determine and compare the theoretical and experimental probabilities of two independent events happening",
    // Financial Literacy
    "F1.1":
      "describe the advantages and disadvantages of various methods of payment that can be used to purchase goods and services",
    "F1.2":
      "identify different types of financial goals, including earning and saving goals, and outline some key steps in achieving them",
    "F1.3": "identify and describe various factors that may help or interfere with reaching financial goals",
    "F1.4":
      "explain the concept of interest rates, and identify types of interest rates and fees associated with different accounts and loans offered by various banks and other financial institutions",
    "F1.5":
      "describe trading, lending, borrowing, and donating as different ways to distribute financial and other resources among individuals and organizations",
  },
}

export function describeCode(subject: string, code: string): string | undefined {
  return SPECIFIC_DESCRIPTIONS[normalizeSubject(subject)]?.[code]
}

// Codes we have rich specific descriptions for, by subject. Used by the dev-seed
// generator to produce realistic demo data for the showcase subject (Math).
export function describedCodes(subject: string): string[] {
  return Object.keys(SPECIFIC_DESCRIPTIONS[normalizeSubject(subject)] ?? {})
}
