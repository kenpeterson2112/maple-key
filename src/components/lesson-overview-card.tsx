"use client"

import { Calendar, Check, ArrowRight, BookOpen, ClipboardCheck, Sparkles } from "lucide-react"
import { CURRICULUM_DESCRIPTIONS } from "@/lib/curriculum-codes"
import { getLessonTally, aggregateLesson } from "@/lib/assessment-results"
import { LEVEL_ORDER, LEVEL_META } from "@/lib/assessment-types"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import type { Resource } from "@/lib/types"

function getSubjectTheme(subject: string) {
  const s = (subject || "").toLowerCase()
  if (s.includes("math"))
    return { bg: "bg-[#F0FDF4]", border: "border-[#86EFAC]", dot: "bg-[#166534]", badge: "bg-gradient-to-r from-[#166534] to-[#14532D] text-white", label: "text-[#166534]" }
  if (s.includes("science"))
    return { bg: "bg-[#EFF6FF]", border: "border-[#93C5FD]", dot: "bg-[#1E40AF]", badge: "bg-gradient-to-r from-[#1E3A8A] to-[#1E293B] text-white", label: "text-[#1E40AF]" }
  if (s.includes("fsl"))
    return { bg: "bg-[#F0FDFA]", border: "border-[#5EEAD4]", dot: "bg-[#0D9488]", badge: "bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white", label: "text-[#0F766E]" }
  if (s.includes("language") || s.includes("english") || s.includes("french") || s.includes("literacy"))
    return { bg: "bg-[#FEFCE8]", border: "border-[#FDE047]", dot: "bg-[#CA8A04]", badge: "bg-gradient-to-r from-[#CA8A04] to-[#A16207] text-white", label: "text-[#92400E]" }
  if (s.includes("social") || s.includes("history") || s.includes("geo"))
    return { bg: "bg-[#F5F3FF]", border: "border-[#C4B5FD]", dot: "bg-[#7C3AED]", badge: "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white", label: "text-[#7C3AED]" }
  if (s.includes("health") || s.includes("physical"))
    return { bg: "bg-[#FFF7ED]", border: "border-[#FED7AA]", dot: "bg-[#EA580C]", badge: "bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white", label: "text-[#EA580C]" }
  if (s.includes("art") || s.includes("music") || s.includes("drama") || s.includes("dance"))
    return { bg: "bg-[#FDF4FF]", border: "border-[#E9D5FF]", dot: "bg-[#A21CAF]", badge: "bg-gradient-to-r from-[#A21CAF] to-[#86198F] text-white", label: "text-[#A21CAF]" }
  return { bg: "bg-[#FFF5ED]", border: "border-[#FFB627]", dot: "bg-[#FF6B35]", badge: "bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white", label: "text-[#C65D3B]" }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

interface LessonOverviewCardProps {
  lesson: LessonMetadata
  bookmarkedResources: Resource[]
  onOpen: () => void
  onOpenAssessment: () => void
}

export default function LessonOverviewCard({
  lesson,
  bookmarkedResources,
  onOpen,
  onOpenAssessment,
}: LessonOverviewCardProps) {
  const theme = getSubjectTheme(lesson.subject)

  const headerLine = [
    formatDate(lesson.timestamp),
    lesson.grade ? `Grade ${lesson.grade}` : null,
    lesson.subject || null,
  ]
    .filter(Boolean)
    .join(" · ")

  const codes = lesson.curriculumCodesCovered ?? []

  const resourceTitles = (lesson.resourceIds ?? [])
    .map((id) => bookmarkedResources.find((r) => r.id === id)?.topic_title)
    .filter(Boolean) as string[]
  const resourceCount = lesson.resourceIds?.length ?? 0

  const description =
    lesson.lessonContent?.mindsOn ||
    lesson.lessonContent?.action ||
    `A ${lesson.subject || "curriculum"} lesson for ${lesson.grade ? `Grade ${lesson.grade}` : "your class"}.`

  // High-level assessment summary
  const tally = getLessonTally(lesson.id)
  const agg = aggregateLesson(tally)
  const levelTotals = { level1: 0, level2: 0, level3: 0, level4: 0 }
  if (tally) {
    for (const counts of Object.values(tally.byExpectation)) {
      levelTotals.level1 += counts.level1
      levelTotals.level2 += counts.level2
      levelTotals.level3 += counts.level3
      levelTotals.level4 += counts.level4
    }
  }
  const levelTotal = levelTotals.level1 + levelTotals.level2 + levelTotals.level3 + levelTotals.level4
  const pct = (n: number) => (levelTotal > 0 ? Math.round((n / levelTotal) * 100) : 0)

  return (
    <div className={`rounded-2xl border-2 ${theme.border} ${theme.bg} shadow-sm overflow-hidden`}>
      {/* Header: date · grade · subject */}
      <div className="bg-white px-4 py-2.5 border-b border-[#E8D5C4] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1.5 h-4 rounded-full flex-shrink-0 ${theme.dot}`} />
          <p className="text-xs font-semibold text-[#2C2C2C] truncate">{headerLine}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-[#A8998E]">
          <Sparkles size={13} className="text-violet-500" />
          <span className="text-[11px] font-medium hidden sm:inline">Most recent lesson</span>
          <Calendar size={13} />
        </div>
      </div>

      {/* Body: title + description */}
      <div className="px-4 pt-3 pb-2 space-y-1.5">
        <h3 className="text-base font-bold text-[#2C2C2C] leading-snug">{lesson.title}</h3>
        <p className="text-xs text-[#555] leading-relaxed line-clamp-3">{description}</p>
      </div>

      {/* Expectations + resources */}
      <div className="px-4 pb-3 space-y-2">
        {codes.length > 0 && (
          <div className="flex items-start gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
            <p className="text-[11px] text-[#555] leading-relaxed">
              <span className="font-semibold text-emerald-700">{codes.length}</span> curriculum{" "}
              {codes.length === 1 ? "expectation" : "expectations"}
              <span className="text-[#999]">
                {" — "}
                {codes
                  .slice(0, 3)
                  .map((c) => CURRICULUM_DESCRIPTIONS[c] ?? c)
                  .join("; ")}
                {codes.length > 3 ? "…" : ""}
              </span>
            </p>
          </div>
        )}

        {resourceCount > 0 && (
          <div className="flex items-start gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#D9742A] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#555] leading-relaxed">
              <span className="font-semibold text-[#C65D3B]">{resourceCount}</span>{" "}
              {resourceCount === 1 ? "resource" : "resources"}
              {resourceTitles.length > 0 && (
                <span className="text-[#999]"> — {resourceTitles.slice(0, 2).join("; ")}{resourceTitles.length > 2 ? "…" : ""}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Assessment summary */}
      {agg.hasData && levelTotal > 0 && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-white/70 border border-[#E8D5C4] px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ClipboardCheck size={13} className="text-amber-600" />
                <span className="text-[11px] font-semibold text-[#2C2C2C]">Assessment results</span>
              </div>
              <span className="text-[11px] text-[#888]">
                {agg.attempts} quick {agg.attempts === 1 ? "check" : "checks"}
              </span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-[#F0EADD]">
              {LEVEL_ORDER.map((level) => (
                levelTotals[level] > 0 && (
                  <div key={level} className={LEVEL_META[level].barClass} style={{ width: `${pct(levelTotals[level])}%` }} />
                )
              ))}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#888] flex-wrap">
              {LEVEL_ORDER.map((level) => (
                <span key={level} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${LEVEL_META[level].barClass}`} />
                  {pct(levelTotals[level])}% {LEVEL_META[level].label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer: open lesson + quick check */}
      <div className="bg-white px-4 py-2.5 border-t border-[#E8D5C4] flex items-center justify-between gap-2">
        <button
          onClick={onOpenAssessment}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 transition-colors"
        >
          <ClipboardCheck size={14} />
          {agg.hasData ? "View checks" : "Quick check"}
        </button>
        <button
          onClick={onOpen}
          className={`py-1.5 px-3.5 ${theme.badge} text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1 hover:scale-105 transform`}
        >
          Open lesson
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
