"use client"

import { useMemo, useState } from "react"
import { Calendar, Check, BookOpen, ClipboardCheck, ArrowRight, Library, CornerDownRight } from "lucide-react"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import { groupLessonsBySequence } from "@/lib/lesson-sequence"
import FollowsLink from "@/components/follows-link"
import { useGlobalFilters } from "@/lib/global-filters"
import { inSelection } from "@/lib/class-progress"
import type { LevelCounts } from "@/lib/assessment-results"
import { describeTallyCounts, earlierQuickChecks, summarizeTally, type TallySummary } from "@/lib/tally-summary"
import { levelColor, useClassData } from "@/components/context-strip"
import { READINESS_TOKENS } from "@/components/ui/readiness-pill"
import DevSeedControl from "@/components/dev/dev-seed-control"
import PageHeader from "@/components/page-header"

interface LessonsLibraryProps {
  onOpenLesson: (lesson: LessonMetadata) => void
  /** Starts a fresh plan that continues from this lesson. */
  onContinueLesson: (lesson: LessonMetadata) => void
}

/** Indent per sequence level, as Tailwind classes (kept static for the JIT). */
const INDENT_CLASS = ["", "ml-4 md:ml-6", "ml-8 md:ml-12", "ml-12 md:ml-18"]

type SortKey = "newest" | "oldest" | "title"

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function LessonsLibrary({ onOpenLesson, onContinueLesson }: LessonsLibraryProps) {
  // Live: a saved lesson or a recorded Quick Check shows up without a reload.
  const { lessons, tallies } = useClassData()
  const globalFilters = useGlobalFilters()
  const { subject, grade } = globalFilters.state
  const [sort, setSort] = useState<SortKey>("newest")
  const summaries = useMemo(() => new Map(tallies.filter((t) => t.attempts > 0).map((t) => [t.lessonId, summarizeTally(t)])), [tallies])
  // The history Track used to show: checks whose lesson left the 20-entry log.
  const earlier = useMemo(
    () => earlierQuickChecks(tallies, lessons).filter((s) => inSelection(subject, grade, s.subject, s.grade)),
    [tallies, lessons, subject, grade],
  )

  const visible = useMemo(() => {
    // Follows the top nav's subject and grade ("all" where a picker is empty).
    let list = lessons.filter((l) => inSelection(subject, grade, l.subject, l.grade))

    // Sort
    if (sort === "newest") list.sort((a, b) => b.timestamp - a.timestamp)
    else if (sort === "oldest") list.sort((a, b) => a.timestamp - b.timestamp)
    else list.sort((a, b) => a.title.localeCompare(b.title))
    // Follow-ups sit beneath the lesson they build on; roots keep the sort.
    return groupLessonsBySequence(list)
  }, [lessons, subject, grade, sort])
  const byId = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons])

  return (
    <div className="w-full h-full bg-background flex flex-col overflow-hidden">
      {/* Title strip */}
      <PageHeader icon={Library} title="All Lessons" iconColor="text-secondary-strong" iconBg="bg-secondary-tint">
        {/* The stores announce their changes, so there's nothing to re-read here. */}
        <DevSeedControl scope={{ kind: "lessons", lessons }} onChanged={() => {}} />
      </PageHeader>

      {/* Controls */}
      <div className="px-4 md:px-6 py-3 border-b border-border bg-muted flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-1.5 border-2 border-border rounded-lg bg-card text-sm focus:outline-none focus:border-ring transition-colors"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {visible.length} lesson{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {visible.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-semibold text-foreground">No lessons found</p>
              <p className="text-sm mt-1">Try a different subject filter, or generate a new lesson.</p>
            </div>
          ) : (
            visible.map(({ lesson, depth }) => {
              const check = summaries.get(lesson.id)
              const meta = [
                formatDate(lesson.timestamp),
                lesson.grade ? `Grade ${lesson.grade}` : null,
                lesson.subject || null,
              ]
                .filter(Boolean)
                .join(" · ")
              const source = lesson.continuesFrom ? byId.get(lesson.continuesFrom.id) : undefined
              return (
                <div
                  key={lesson.id}
                  className={`relative ${INDENT_CLASS[depth] ?? INDENT_CLASS[INDENT_CLASS.length - 1]}`}
                >
                {depth > 0 && (
                  <CornerDownRight
                    size={14}
                    aria-hidden
                    className="absolute -left-4 top-4 text-muted-foreground/50 hidden md:block"
                  />
                )}
                <button
                  onClick={() => onOpenLesson(lesson)}
                  className="w-full text-left rounded-2xl bg-card border border-border px-4 py-3.5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Calendar size={12} />
                    <span className="truncate">{meta}</span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground mt-1 leading-snug">{lesson.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    {lesson.curriculumCodesCovered?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Check size={12} className="text-success" strokeWidth={3} />
                        {lesson.curriculumCodesCovered.length} expectation{lesson.curriculumCodesCovered.length === 1 ? "" : "s"}
                      </span>
                    )}
                    {(lesson.resources?.length ?? lesson.resourceIds?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} className="text-primary" />
                        {lesson.resources?.length ?? lesson.resourceIds?.length} resource{(lesson.resources?.length ?? lesson.resourceIds?.length) === 1 ? "" : "s"}
                      </span>
                    )}
                    <ArrowRight size={13} className="ml-auto text-muted-foreground" />
                  </div>
                  {check && <QuickCheckLine summary={check} />}
                </button>
                {/* Siblings of the card button, not nested inside it. */}
                <div className="flex items-center gap-3 px-4 pt-1.5">
                  {lesson.continuesFrom && (
                    <FollowsLink
                      follows={{
                        title: source?.title ?? lesson.continuesFrom.title,
                        onOpen: source ? () => onOpenLesson(source) : undefined,
                      }}
                      className="flex-1"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onContinueLesson(lesson)}
                    aria-label={`Plan the next lesson after ${lesson.title || "this lesson"}`}
                    title="Start a new lesson that picks up where this one left off"
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary/40 bg-card px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                  >
                    Plan next lesson
                    <ArrowRight size={12} />
                  </button>
                </div>
                </div>
              )
            })
          )}

          {earlier.length > 0 && (
            <section aria-labelledby="earlier-checks-heading" className="flex flex-col gap-2 pt-6">
              <h2 id="earlier-checks-heading" className="font-display text-base font-semibold text-foreground">
                Earlier Quick Checks
              </h2>
              <p className="text-sm text-muted-foreground">
                From lessons no longer in your list. Their results still count on Progress.
              </p>
              <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                {earlier.map((s) => (
                  <li key={s.lessonId} className="flex flex-col gap-1 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{s.title || "Untitled lesson"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {[s.grade ? `Grade ${s.grade}` : null, s.subject || null].filter(Boolean).join(" · ")}
                    </p>
                    <QuickCheckLine summary={s} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

/** A lesson's Quick Checks: when, how many responses from how many answer
 *  sets, the four levels as a bar, and the readiness label. */
function QuickCheckLine({ summary: s }: { summary: TallySummary }) {
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-foreground">
        <span className="flex items-center gap-1 font-semibold">
          <ClipboardCheck size={12} className="text-pop-strong" aria-hidden="true" />
          Quick Check {formatDate(s.lastCheckedAt)}
        </span>
        <span className="text-muted-foreground">{describeTallyCounts(s)}</span>
        {s.level && (
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ background: levelColor(s.level) }} aria-hidden="true" />
            {READINESS_TOKENS[s.level].label}
          </span>
        )}
      </p>
      <LevelBar counts={s.counts} />
    </div>
  )
}

const SIGNALS = ["var(--signal-1)", "var(--signal-2)", "var(--signal-3)", "var(--signal-4)"] as const

/** Levels 1–4 left to right, sized by their share. Decorative: the label says it in words. */
function LevelBar({ counts }: { counts: LevelCounts }) {
  const values = [counts.level1, counts.level2, counts.level3, counts.level4]
  const total = values.reduce((a, b) => a + b, 0)
  if (total === 0) return null
  return (
    <span className="flex h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted" aria-hidden="true">
      {values.map((v, i) => (v > 0 ? <span key={i} style={{ width: `${(v / total) * 100}%`, background: SIGNALS[i] }} /> : null))}
    </span>
  )
}
