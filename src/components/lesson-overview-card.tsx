"use client"

import { Calendar, Check, ArrowRight, BookOpen, ClipboardCheck } from "lucide-react"
import { describeCode } from "@/lib/curriculum-codes"
import { getLessonTally, aggregateLesson } from "@/lib/assessment-results"
import { LEVEL_ORDER, LEVEL_META } from "@/lib/assessment-types"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import type { Resource } from "@/lib/types"
import { getSubjectTheme } from "@/lib/subject-theme"

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
      <div className="bg-card px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-1.5 h-4 rounded-full flex-shrink-0 ${theme.dot}`} />
          <p className="text-xs font-semibold text-foreground truncate">{headerLine}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 text-muted-foreground">
          <span className="text-[11px] font-medium hidden sm:inline">Most recent lesson</span>
          <Calendar size={13} />
        </div>
      </div>

      {/* Body: title + description */}
      <div className="px-4 pt-3 pb-2 space-y-1.5">
        <h3 className="text-base font-bold text-foreground leading-snug">{lesson.title}</h3>
        <p className="text-xs text-foreground leading-relaxed line-clamp-3">{description}</p>
      </div>

      {/* Expectations + resources */}
      <div className="px-4 pb-3 space-y-2">
        {codes.length > 0 && (
          <div className="flex items-start gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" strokeWidth={3} />
            <p className="text-[11px] text-foreground leading-relaxed">
              <span className="font-semibold text-emerald-700">{codes.length}</span> curriculum{" "}
              {codes.length === 1 ? "expectation" : "expectations"}
              <span className="text-muted-foreground">
                {" — "}
                {codes
                  .slice(0, 3)
                  .map((c) => describeCode(lesson.subject, c, lesson.grade) ?? c)
                  .join("; ")}
                {codes.length > 3 ? "…" : ""}
              </span>
            </p>
          </div>
        )}

        {resourceCount > 0 && (
          <div className="flex items-start gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-foreground leading-relaxed">
              <span className="font-semibold text-primary-strong">{resourceCount}</span>{" "}
              {resourceCount === 1 ? "resource" : "resources"}
              {resourceTitles.length > 0 && (
                <span className="text-muted-foreground"> — {resourceTitles.slice(0, 2).join("; ")}{resourceTitles.length > 2 ? "…" : ""}</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Assessment summary */}
      {agg.hasData && levelTotal > 0 && (
        <div className="px-4 pb-3">
          <div className="rounded-xl bg-card/70 border border-border px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ClipboardCheck size={13} className="text-amber-600" />
                <span className="text-[11px] font-semibold text-foreground">Assessment results</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {agg.attempts} quick {agg.attempts === 1 ? "check" : "checks"}
              </span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
              {LEVEL_ORDER.map((level) => (
                levelTotals[level] > 0 && (
                  <div key={level} className={LEVEL_META[level].barClass} style={{ width: `${pct(levelTotals[level])}%` }} />
                )
              ))}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
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
      <div className="bg-card px-4 py-2.5 border-t border-border flex items-center justify-between gap-2">
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
