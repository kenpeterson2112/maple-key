"use client"

import { useMemo, useState } from "react"
import { BarChart3, BookOpen } from "lucide-react"
import {
  getAllTallies,
  isSandboxMode,
  type LessonTally,
} from "@/lib/assessment-results"
import { useGlobalFilters } from "@/lib/global-filters"
import CurriculumOrbDashboard from "@/components/curriculum-orb-dashboard"
import DevSeedControl from "@/components/dev/dev-seed-control"
import PageHeader from "@/components/page-header"
import { normalizeSubject } from "@/lib/subjects"
import { normalizeGrades } from "@/lib/utils"

// Tallies recorded before the grade_level normalization fix may carry
// bracket/quote artifacts (e.g. "[9]") — clean those up for display so they
// don't show up as duplicate grade options alongside "9".
function normalizeGrade(grade: string): string {
  return normalizeGrades([grade])[0] ?? grade
}

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
  const globalFilters = useGlobalFilters()

  const allSubjects = useMemo(() => uniqueSorted(tallies.map(t => normalizeSubject(t.subject))), [tallies])

  // Use global filters for subject and grade
  const subject = globalFilters.state.subject ? normalizeSubject(globalFilters.state.subject) : (allSubjects[0] || "")

  // Only the grades that actually appear within the active subject.
  const subjectGrades = useMemo(
    () => uniqueSorted(tallies.filter(t => normalizeSubject(t.subject) === subject).map(t => normalizeGrade(t.grade))),
    [tallies, subject]
  )

  // Use global grade filter if set and valid for the subject
  const grade = (globalFilters.state.grade && subjectGrades.includes(globalFilters.state.grade))
    ? globalFilters.state.grade
    : (subjectGrades[0] || "")

  const filtered = useMemo(
    () => tallies.filter(t => normalizeSubject(t.subject) === subject && normalizeGrade(t.grade) === grade),
    [tallies, subject, grade]
  )

  if (tallies.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#FAF3E0]">
        <PageHeader icon={BarChart3} title="Class Insights">
          {isSandboxMode() && (
            <span className="rounded-full bg-[#FFE5CC] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C65D3B]">
              Sandbox
            </span>
          )}
          <DevSeedControl scope={{ kind: "global" }} onChanged={() => setReloadNonce((n) => n + 1)} />
        </PageHeader>
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
      <PageHeader icon={BarChart3} title="Class Insights">
        {isSandboxMode() && (
          <span className="rounded-full bg-[#FFE5CC] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#C65D3B]">
            Sandbox
          </span>
        )}

        <DevSeedControl scope={{ kind: "global" }} onChanged={() => setReloadNonce((n) => n + 1)} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">

          {/* Expectation breakdown */}
          {filtered.length > 0 ? (
            <CurriculumOrbDashboard tallies={filtered} />
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
                        Gr {normalizeGrade(t.grade)} · {normalizeSubject(t.subject)} · {t.attempts}{" "}
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
