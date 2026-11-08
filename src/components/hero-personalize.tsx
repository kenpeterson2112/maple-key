"use client"

import { motion, AnimatePresence } from "framer-motion"
import { RotateCcw } from "lucide-react"
import InlinePicker, { type PickerOption } from "@/components/inline-picker"
import { strandsForSubject } from "@/lib/curriculum-codes"
import type { Filters } from "@/lib/types"

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

interface HeroPersonalizeProps {
  filters: Filters
  setFilters: (next: Filters) => void
  resultCount: number
  inferred: boolean
  onReset: () => void
}

export default function HeroPersonalize({
  filters,
  setFilters,
  resultCount,
  inferred,
  onReset,
}: HeroPersonalizeProps) {
  // The header reads multi-grade (CSV) but the hero treats grade as a single primary.
  const primaryGrade = (filters.grade || "").split(",").filter(Boolean)[0] ?? ""
  const strandOptions: PickerOption[] = filters.subject
    ? [
        { value: "", label: "any strand" },
        ...(SUBJECT_STRANDS[filters.subject]
          ? SUBJECT_STRANDS[filters.subject].map((s) => ({
              value: s,
              label: STRAND_CODES[s] ? `${STRAND_CODES[s]}. ${s}` : s,
            }))
          // Grade-variant subjects (History, Geography) have no static list above —
          // pull their strand names from curriculum-codes.ts for the active grade.
          : strandsForSubject(filters.subject, primaryGrade).map((s) => ({ value: s.label, label: `${s.code}. ${s.label}` }))),
      ]
    : []

  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-muted via-muted to-muted">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 80% at 15% 0%, rgba(255,107,53,0.10) 0%, rgba(255,107,53,0) 60%), radial-gradient(50% 70% at 90% 10%, rgba(198,93,59,0.10) 0%, rgba(198,93,59,0) 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-[1500px] px-4 md:px-6 py-2 md:py-3"
      >
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 md:gap-x-2 font-display text-lg md:text-2xl font-semibold tracking-tight text-foreground leading-tight">
          <span>I teach</span>
          <InlinePicker
            value={primaryGrade}
            placeholder="any grade"
            options={GRADES}
            onChange={(v) => setFilters({ ...filters, grade: v })}
            ariaLabel="Choose grade"
          />
          <InlinePicker
            value={filters.subject || ""}
            placeholder="any subject"
            options={SUBJECTS}
            onChange={(v) => setFilters({ ...filters, subject: v, strand: "" })}
            ariaLabel="Choose subject"
          />
          <span>in</span>
          <InlinePicker
            value={filters.province || ""}
            placeholder="anywhere in Canada"
            options={PROVINCES}
            onChange={(v) => setFilters({ ...filters, province: v })}
            ariaLabel="Choose province"
          />
          {filters.subject && (
            <>
              <span className="text-muted-foreground">·</span>
              <InlinePicker
                value={filters.strand || ""}
                placeholder="any strand"
                options={strandOptions}
                onChange={(v) => setFilters({ ...filters, strand: v })}
                ariaLabel="Choose strand"
              />
            </>
          )}
          <span className="w-full md:w-auto mt-0.5 md:mt-0">
            <ResultsCounter count={resultCount} />
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <AnimatePresence>
            {inferred && (
              <motion.button
                key="reset"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                onClick={onReset}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-secondary-strong backdrop-blur transition-colors hover:bg-card"
                title="We guessed your province from your timezone. Click to clear."
              >
                <RotateCcw size={12} />
                Not you? Reset
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  )
}

function ResultsCounter({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border-2 border-primary/30 bg-card px-3 py-1.5 shadow-sm">
      <motion.span
        key={count}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-sm font-bold text-primary tabular-nums"
      >
        {count}
      </motion.span>
      <span className="text-sm font-medium text-foreground">
        resource{count === 1 ? "" : "s"} match
      </span>
    </div>
  )
}
