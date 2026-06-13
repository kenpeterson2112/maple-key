"use client"

import { useMemo, useState } from "react"
import { BarChart3, BookOpen } from "lucide-react"
import {
  getAllTallies,
  aggregateAll,
  isSandboxMode,
  computeReadinessLevel,
  type LessonTally,
} from "@/lib/assessment-results"
import ClassDashboard from "@/components/class-dashboard"
import DevSeedControl from "@/components/dev/dev-seed-control"
import { normalizeSubject } from "@/lib/subjects"

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  )
}

export default function ClassInsightsSpace() {
  // The sample-data control bumps this to force a re-read of localStorage tallies
  // (they're otherwise read once on mount).
  const [reloadNonce, setReloadNonce] = useState(0)
  const tallies = useMemo<LessonTally[]>(() => getAllTallies(), [reloadNonce])

  const allSubjects = useMemo(() => uniqueSorted(tallies.map(t => normalizeSubject(t.subject))), [tallies])

  // A teacher only ever cares about one grade/subject combo at a time, so both
  // filters are single-select with no "all" option.
  const [activeSubject, setActiveSubject] = useState<string>("")
  const [activeGrade, setActiveGrade] = useState<string>("")

  const subject = activeSubject || allSubjects[0] || ""

  // Only the grades that actually appear within the active subject.
  const subjectGrades = useMemo(
    () => uniqueSorted(tallies.filter(t => normalizeSubject(t.subject) === subject).map(t => t.grade)),
    [tallies, subject]
  )

  // Fall back to the first available grade when none is selected (or the
  // selection doesn't exist within the active subject).
  const grade = subjectGrades.includes(activeGrade) ? activeGrade : (subjectGrades[0] || "")

  const filtered = useMemo(
    () => tallies.filter(t => normalizeSubject(t.subject) === subject && t.grade === grade),
    [tallies, subject, grade]
  )

  const data = useMemo(() => aggregateAll(filtered), [filtered])

  const expectationStats = useMemo(() => {
    let attention = 0, developing = 0, strong = 0
    for (const agg of Object.values(data.overall)) {
      const total = agg.bands.level1 + agg.bands.level2 + agg.bands.level3 + agg.bands.level4
      if (total === 0) continue
      const r = computeReadinessLevel(agg.bands)
      if (r === "great" || r === "good") strong++
      else if (r === "okay") developing++
      else if (r === "poor") attention++
    }
    return { attention, developing, strong }
  }, [data])

  if (tallies.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#FAF3E0]">
        <header className="flex items-center gap-2 border-b border-[#E8D5C4] bg-white px-6 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
            <BarChart3 size={18} className="text-amber-600" />
          </div>
          <h1 className="text-base font-bold text-[#2C2C2C]">Class Insights</h1>
          {isSandboxMode() && (
            <span className="rounded-full bg-[#FFE5CC] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C65D3B]">
              Sandbox
            </span>
          )}
          <div className="ml-auto">
            <DevSeedControl scope={{ kind: "global" }} onChanged={() => setReloadNonce((n) => n + 1)} />
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
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#FAF3E0]">

      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-2 border-b border-[#E8D5C4] bg-white px-6 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
          <BarChart3 size={18} className="text-amber-600" />
        </div>
        <h1 className="text-base font-bold text-[#2C2C2C]">Class Insights</h1>
        {isSandboxMode() && (
          <span className="rounded-full bg-[#FFE5CC] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C65D3B]">
            Sandbox
          </span>
        )}
        <div className="ml-auto">
          <DevSeedControl scope={{ kind: "global" }} onChanged={() => setReloadNonce((n) => n + 1)} />
        </div>
      </header>

      {/* Subject + grade filters — one combo at a time */}
      <div className="flex-shrink-0 border-b border-[#E8D5C4] bg-[#FAF3E0] px-6 py-3">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-[#8B7355]">
            Subject
            <select
              value={subject}
              onChange={(e) => { setActiveSubject(e.target.value); setActiveGrade("") }}
              className="rounded-lg border border-[#E8D5C4] bg-white px-2.5 py-1.5 text-sm font-bold text-[#2C2C2C] cursor-pointer hover:border-[#FF6B35]/50 transition-colors"
            >
              {allSubjects.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-[#8B7355]">
            Grade
            <select
              value={grade}
              onChange={(e) => setActiveGrade(e.target.value)}
              className="rounded-lg border border-[#E8D5C4] bg-white px-2.5 py-1.5 text-sm font-bold text-[#2C2C2C] cursor-pointer hover:border-[#FF6B35]/50 transition-colors"
            >
              {subjectGrades.map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

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
              <p className="text-sm font-medium text-[#2C2C2C]">No results for this view</p>
              <p className="mt-1 text-xs text-[#888]">Try another grade or subject tab above.</p>
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
