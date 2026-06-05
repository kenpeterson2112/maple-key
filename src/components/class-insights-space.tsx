"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, BarChart3, BookOpen } from "lucide-react"
import {
  getAllTallies,
  aggregateAll,
  type LessonTally,
  type BandCounts,
} from "@/lib/assessment-results"
import ClassDashboard from "@/components/class-dashboard"

function total(counts: BandCounts): number {
  return counts.strong + (counts.developing ?? 0) + counts.needsSupport
}

function readinessOf(counts: BandCounts): "great" | "good" | "developing" | "poor" | "none" {
  const t = total(counts)
  if (t === 0) return "none"
  const sr = counts.strong / t
  const nr = counts.needsSupport / t
  if (sr >= 0.8) return "great"
  if (sr >= 0.5) return "good"
  if (nr >= 0.5) return "poor"
  return "developing"
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )
}

interface ClassInsightsSpaceProps {
  onBack: () => void
}

export default function ClassInsightsSpace({ onBack }: ClassInsightsSpaceProps) {
  const tallies = useMemo<LessonTally[]>(() => getAllTallies(), [])

  const allGrades = useMemo(() => uniqueSorted(tallies.map(t => t.grade)), [tallies])
  const allSubjects = useMemo(() => uniqueSorted(tallies.map(t => t.subject)), [tallies])

  const [grades, setGrades] = useState<string[]>([])
  const [subjects, setSubjects] = useState<string[]>([])

  const filtered = useMemo(
    () => tallies.filter(t =>
      (grades.length === 0 || grades.includes(t.grade)) &&
      (subjects.length === 0 || subjects.includes(t.subject))
    ),
    [tallies, grades, subjects]
  )

  const data = useMemo(() => aggregateAll(filtered), [filtered])

  const expectationStats = useMemo(() => {
    let attention = 0, developing = 0, strong = 0
    for (const agg of Object.values(data.overall)) {
      const r = readinessOf(agg.bands)
      if (r === "great" || r === "good") strong++
      else if (r === "developing") developing++
      else if (r === "poor") attention++
    }
    return { attention, developing, strong }
  }, [data])

  const toggle = (list: string[], value: string, setter: (v: string[]) => void) =>
    setter(list.includes(value) ? list.filter(v => v !== value) : [...list, value])

  if (tallies.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#FAF3E0]">
        <header className="flex items-center gap-3 border-b border-[#E8D5C4] bg-white px-6 py-3">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#8B4513] hover:bg-[#FFE5CC] transition-colors"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
              <BarChart3 size={18} className="text-amber-600" />
            </div>
            <h1 className="text-base font-bold text-[#2C2C2C]">Class Insights</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center gap-4 flex-1 text-center px-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
            <BarChart3 size={26} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2C2C2C]">No quick check data yet</p>
            <p className="text-xs text-[#888] max-w-sm mt-1">
              Plan a lesson, run the quick check, and record student responses — aggregated results will appear here.
            </p>
          </div>
          <button
            onClick={onBack}
            className="rounded-xl bg-[#FF6B35] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#e55a2a] transition-colors"
          >
            Plan a lesson
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF3E0]">

      {/* Header with inline grade/subject filter pills */}
      <header className="flex-shrink-0 border-b border-[#E8D5C4] bg-white px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#8B4513] hover:bg-[#FFE5CC] transition-colors flex-shrink-0"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
              <BarChart3 size={18} className="text-amber-600" />
            </div>
            <h1 className="text-base font-bold text-[#2C2C2C]">Class Insights</h1>
          </div>

          {(allGrades.length > 1 || allSubjects.length > 1) && (
            <div className="ml-auto flex flex-wrap gap-1.5 items-center">
              {allGrades.length > 1 && allGrades.map(g => (
                <button
                  key={g}
                  onClick={() => toggle(grades, g, setGrades)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    grades.includes(g)
                      ? "bg-[#FF6B35] border-[#FF6B35] text-white"
                      : "bg-white border-[#E8D5C4] text-[#555] hover:border-[#8B4513]"
                  }`}
                >
                  Gr {g}
                </button>
              ))}
              {allSubjects.length > 1 && allSubjects.map(s => (
                <button
                  key={s}
                  onClick={() => toggle(subjects, s, setSubjects)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    subjects.includes(s)
                      ? "bg-[#FF6B35] border-[#FF6B35] text-white"
                      : "bg-white border-[#E8D5C4] text-[#555] hover:border-[#8B4513]"
                  }`}
                >
                  {s}
                </button>
              ))}
              {(grades.length > 0 || subjects.length > 0) && (
                <button
                  onClick={() => { setGrades([]); setSubjects([]) }}
                  className="px-2.5 py-1 rounded-full text-xs text-[#888] hover:text-[#2C2C2C] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">

          {/* Summary stat cards */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              value={filtered.length}
              label={filtered.length === 1 ? "lesson assessed" : "lessons assessed"}
              valueColor="#FF6B35"
            />
            <StatCard
              value={data.attempts}
              label={data.attempts === 1 ? "student response" : "student responses"}
              valueColor="#8B4513"
            />
            <StatCard
              value={expectationStats.attention}
              label={expectationStats.attention === 1 ? "area needs attention" : "areas need attention"}
              valueColor={expectationStats.attention > 0 ? "#B45309" : "#16A34A"}
              highlight={expectationStats.attention > 0}
            />
          </div>

          {/* Expectation breakdown */}
          {data.hasData ? (
            <ClassDashboard data={data} />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[#E8D5C4] bg-white p-8 text-center">
              <p className="text-sm font-medium text-[#2C2C2C]">No results for these filters</p>
              <p className="mt-1 text-xs text-[#888]">Try clearing a filter above.</p>
            </div>
          )}

          {/* Lesson history */}
          {filtered.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8B4513] mb-2">
                Lesson History
              </p>
              <div className="rounded-xl border border-[#E8D5C4] bg-white overflow-hidden divide-y divide-[#F0E6D8]">
                {[...filtered].sort((a, b) => b.updatedAt - a.updatedAt).map(t => (
                  <div key={t.lessonId} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50">
                      <BookOpen size={14} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#2C2C2C] truncate">{t.title}</p>
                      <p className="text-xs text-[#888]">
                        Gr {t.grade} · {t.subject} · {t.attempts}{" "}
                        {t.attempts === 1 ? "response" : "responses"}
                      </p>
                    </div>
                    <p className="text-xs text-[#A8998E] flex-shrink-0">{formatDate(t.updatedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function StatCard({
  value,
  label,
  valueColor,
  highlight = false,
}: {
  value: number
  label: string
  valueColor: string
  highlight?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 bg-white transition-colors ${highlight && value > 0 ? "border-amber-200 bg-amber-50/60" : "border-[#E8D5C4]"}`}>
      <p className="text-2xl font-bold leading-none" style={{ color: valueColor }}>{value}</p>
      <p className="text-xs text-[#888] mt-1.5 leading-tight">{label}</p>
    </div>
  )
}
