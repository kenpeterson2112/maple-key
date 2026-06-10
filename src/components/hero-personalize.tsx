"use client"

import { motion, AnimatePresence } from "framer-motion"
import { RotateCcw } from "lucide-react"
import InlinePicker, { type PickerOption } from "@/components/inline-picker"
import type { Filters } from "@/lib/types"

const PROVINCES: PickerOption[] = [
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

const GRADES: PickerOption[] = [
  { value: "", label: "any grade" },
  { value: "4", label: "Grade 4" },
  { value: "5", label: "Grade 5" },
  { value: "6", label: "Grade 6" },
  { value: "7", label: "Grade 7" },
  { value: "8", label: "Grade 8" },
  { value: "9", label: "Grade 9" },
]

const SUBJECTS: PickerOption[] = [
  { value: "", label: "any subject" },
  { value: "Math", label: "Math", color: "#166534" },
  { value: "Science", label: "Science", color: "#1E40AF" },
  { value: "Language", label: "Language", color: "#CA8A04" },
  { value: "Social Studies", label: "Social Studies", color: "#7C3AED" },
  { value: "FSL", label: "FSL", color: "#0D9488" },
]

const SUBJECT_STRANDS: Record<string, string[]> = {
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
}

// Official Ontario curriculum strand letters. Cross-strand / cross-cutting
// entries have no single lettered strand and are left unprefixed.
const STRAND_CODES: Record<string, string> = {
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
        ...(SUBJECT_STRANDS[filters.subject] ?? []).map((s) => ({
          value: s,
          label: STRAND_CODES[s] ? `${STRAND_CODES[s]}. ${s}` : s,
        })),
      ]
    : []

  return (
    <section className="relative overflow-hidden border-b border-[#E8D5C4] bg-gradient-to-b from-[#FFF8F0] via-[#FAF3E0] to-[#FAF3E0]">
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
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 md:gap-x-2 text-lg md:text-2xl font-semibold tracking-tight text-[#2C2C2C] leading-tight">
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
              <span className="text-[#A8998E]">·</span>
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
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8D5C4] bg-white/70 px-3 py-1 text-xs font-medium text-[#8B4513] backdrop-blur transition-colors hover:bg-white"
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
    <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#FF6B35]/30 bg-white px-3 py-1.5 shadow-sm">
      <motion.span
        key={count}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-sm font-bold text-[#FF6B35] tabular-nums"
      >
        {count}
      </motion.span>
      <span className="text-sm font-medium text-[#8B4513]">
        resource{count === 1 ? "" : "s"} match
      </span>
    </div>
  )
}
