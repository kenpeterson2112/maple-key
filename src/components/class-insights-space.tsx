"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, BarChart3, Users, Check } from "lucide-react"
import {
  getAllTallies,
  aggregateAll,
  type LessonTally,
} from "@/lib/assessment-results"
import ClassDashboard from "@/components/class-dashboard"

interface ClassInsightsSpaceProps {
  onBack: () => void
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

export default function ClassInsightsSpace({ onBack }: ClassInsightsSpaceProps) {
  const tallies = useMemo<LessonTally[]>(() => getAllTallies(), [])

  const allGrades = useMemo(() => uniqueSorted(tallies.map((t) => t.grade)), [tallies])
  const allSubjects = useMemo(() => uniqueSorted(tallies.map((t) => t.subject)), [tallies])

  const [grades, setGrades] = useState<string[]>([])
  const [subjects, setSubjects] = useState<string[]>([])

  const filtered = useMemo(() => {
    return tallies.filter(
      (t) =>
        (grades.length === 0 || grades.includes(t.grade)) &&
        (subjects.length === 0 || subjects.includes(t.subject)),
    )
  }, [tallies, grades, subjects])

  const data = useMemo(() => aggregateAll(filtered), [filtered])

  const caption = useMemo(() => {
    const parts: string[] = []
    if (grades.length) parts.push(`Grade ${grades.join(", ")}`)
    if (subjects.length) parts.push(subjects.join(", "))
    if (parts.length === 0) parts.push("All recorded")
    return `${parts.join(" · ")} · ${data.attempts} ${data.attempts === 1 ? "response" : "responses"} across ${filtered.length} ${filtered.length === 1 ? "lesson" : "lessons"}`
  }, [grades, subjects, data.attempts, filtered.length])

  const toggle = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF3E0] overflow-hidden">
      <header className="flex items-center justify-between border-b border-[#E8D5C4] bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#8B4513] hover:bg-[#FFE5CC] transition-colors"
            aria-label="Back to resources"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
              <BarChart3 size={18} className="text-amber-600" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#2C2C2C] leading-tight">Class Insights</h1>
              <p className="text-xs text-[#888] leading-tight">Aggregated quick check results across your lessons</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {tallies.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center px-6">
            <Users size={32} className="text-[#A8998E]" />
            <p className="text-sm font-semibold text-[#2C2C2C]">No quick check data yet</p>
            <p className="text-xs text-[#888] max-w-sm">
              Plan a lesson, run the quick check, and record student responses. Aggregated results will appear here.
            </p>
            <button
              onClick={onBack}
              className="mt-2 rounded-xl bg-[#FF6B35] px-5 py-2 text-sm font-semibold text-white hover:bg-[#e55a2a] transition-colors"
            >
              Plan a lesson
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-6 py-6 space-y-5">
            {(allGrades.length > 1 || allSubjects.length > 1) && (
              <div className="space-y-3 rounded-xl border border-[#E8D5C4] bg-white p-4">
                {allGrades.length > 1 && (
                  <FilterRow
                    label="Grade"
                    options={allGrades}
                    selected={grades}
                    onToggle={(v) => toggle(grades, v, setGrades)}
                    onClear={() => setGrades([])}
                  />
                )}
                {allSubjects.length > 1 && (
                  <FilterRow
                    label="Subject"
                    options={allSubjects}
                    selected={subjects}
                    onToggle={(v) => toggle(subjects, v, setSubjects)}
                    onClear={() => setSubjects([])}
                  />
                )}
              </div>
            )}
            <ClassDashboard data={data} caption={caption} />
          </div>
        )}
      </div>
    </div>
  )
}

function FilterRow({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8B4513]">{label}</p>
        {selected.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-[#888] hover:text-[#2C2C2C] transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-medium transition-colors ${
                isSelected
                  ? "bg-[#FF6B35] border-[#FF6B35] text-white"
                  : "bg-white border-[#E8D5C4] text-[#2C2C2C] hover:border-[#8B4513]"
              }`}
            >
              <Check size={11} strokeWidth={3} className={isSelected ? "opacity-100" : "opacity-0"} />
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}
