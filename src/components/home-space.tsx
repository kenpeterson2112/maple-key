"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, BookOpen, Bookmark, ChevronLeft, ChevronRight } from "lucide-react"
import { SUBJECTS } from "@/components/hero-personalize"
import MaterialsWidget from "@/components/materials-widget"
import WhatsNextWidget from "@/components/whats-next-widget"
import { useClassData, useSelectedClassData } from "@/components/context-strip"
import { buildNeedsAttention } from "@/lib/class-progress"
import { buildWeek } from "@/lib/week"
import { useGlobalFilters } from "@/lib/global-filters"
import { useBookmarks } from "@/lib/bookmarks-context"
import type { LessonMetadata } from "@/lib/lesson-metadata"

export type HomeDestination = "lessonplanner" | "resources" | "insights" | "lessons"

interface HomeSpaceProps {
  /** Navigate to one of the four working spaces. */
  onNavigate: (destination: HomeDestination) => void
  /** Open a previously generated lesson in the planner. */
  onOpenLesson: (lesson: LessonMetadata) => void
  /** Re-open the four-step "How Maple Key Works" tour on demand. */
  onOpenTour: () => void
  /** Open the Classroom profile (materials, lesson defaults). */
  onOpenClassroomSetup: () => void
  /** Search seeded with an expectation code (the class context is set first). */
  onFindResources: (code: string) => void
  /** Open the planner seeded with an expectation (the class context is set first). */
  onPlanExpectation: (code: string, label: string) => void
  /** Run a Quick Check on a saved lesson. */
  onQuickCheck: (lesson: LessonMetadata) => void
}

/**
 * The landing surface — what a teacher sees on arrival, before they have
 * chosen a space.
 *
 * It replaces a cold "Generate Lesson Plan" form as the front door. Three jobs,
 * in priority order:
 *
 *  1. Say what Maple Key is, in the display face, without a modal gate.
 *  2. Show every class the teacher has worked on, with how far through its
 *     curriculum it is; a card opens that class. The subject and grade are
 *     otherwise chosen in the top nav, and nothing has to be picked to start.
 *  3. Offer the real entry points (plan / find / track / revisit) and, for a
 *     returning teacher, pick up their last lesson and saved resources.
 *
 * Tokens only — no hex. See the design-system section of CLAUDE.md.
 */
export default function HomeSpace({
  onNavigate,
  onOpenLesson,
  onOpenTour,
  onOpenClassroomSetup,
  onFindResources,
  onPlanExpectation,
  onQuickCheck,
}: HomeSpaceProps) {
  const { state: filters, setGrade, setSubject } = useGlobalFilters()
  const { bookmarkedResources } = useBookmarks()

  const selected = useSelectedClassData()
  const all = useClassData()
  const isNew = all.lessons.length === 0 && all.tallies.length === 0
  const recentLessons = useMemo(() => [...selected.lessons].sort((a, b) => b.timestamp - a.timestamp).slice(0, 3), [selected.lessons])

  const hasHistory = recentLessons.length > 0 || bookmarkedResources.length > 0

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8 motion-safe:animate-fade-in">
        <h1 className="sr-only">Home</h1>

        {/* A brand-new teacher (nothing planned or checked anywhere) gets the
            way into the tour and the classroom profile; everyone else gets
            straight to the week. */}
        {isNew && (
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <button type="button" onClick={onOpenTour} className="font-semibold text-secondary-strong underline-offset-2 hover:underline">
              Take the tour
            </button>{" "}
            or{" "}
            <button type="button" onClick={onOpenClassroomSetup} className="font-semibold text-secondary-strong underline-offset-2 hover:underline">
              set up your classroom
            </button>
            , then pick a subject and grade above.
          </p>
        )}

        {/* ── This week; What's next with Needs attention under it; Materials ── */}
        {/* grid-cols-1 is minmax(0, 1fr): without it a phone's single column
            grows to its widest content and every card runs off the screen. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ThisWeek onOpenLesson={onOpenLesson} />
          {/* Each suggestion acts on its own class, which may not be the one
              picked, so each action sets the class first. */}
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
            <WhatsNextWidget
              subject={filters.subject}
              grade={filters.grade}
              handlers={{
                onPlan: (subject, grade, code, label) => {
                  setSubject(subject)
                  setGrade(grade)
                  onPlanExpectation(code, label)
                },
                onFindResources: (subject, grade, code) => {
                  setSubject(subject)
                  setGrade(grade)
                  onFindResources(code)
                },
                onQuickCheck,
                onPlanBlank: () => onNavigate("lessonplanner"),
                onOpenTrack: () => onNavigate("insights"),
              }}
            />
            <NeedsAttention
              onFindResources={(subject, grade, code) => {
                setSubject(subject)
                setGrade(grade)
                onFindResources(code)
              }}
            />
          </div>
          <div className="min-w-0">
            <MaterialsWidget onEdit={onOpenClassroomSetup} />
          </div>
        </div>

        {/* ── Pick up where you left off ───────────────────────────────── */}
        {hasHistory && (
          <section aria-labelledby="home-continue-heading" className="space-y-3">
            <h2
              id="home-continue-heading"
              className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
            >
              Pick up where you left off
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              {recentLessons.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  onClick={() => onOpenLesson(lesson)}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <BookOpen size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-card-foreground">
                      {lesson.title || "Untitled lesson"}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {[lesson.grade && `Grade ${lesson.grade}`, lesson.subject]
                        .filter(Boolean)
                        .join(" · ") || "No class context"}
                    </span>
                  </span>
                </button>
              ))}

              {bookmarkedResources.length > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate("lessonplanner")}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                >
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bookmark size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-card-foreground">
                      {bookmarkedResources.length} saved resource
                      {bookmarkedResources.length === 1 ? "" : "s"}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Ready to build a lesson around.
                    </span>
                  </span>
                </button>
              )}
            </div>

            {recentLessons.length > 0 && (
              <button
                type="button"
                onClick={() => onNavigate("lessons")}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                All lessons
              </button>
            )}
          </section>
        )}


      </div>
    </div>
  )
}

// A subject's colour token, or the brand colour for anything unlisted.
function subjectColor(subject: string): string {
  return SUBJECTS.find((o) => o.value === subject)?.color ?? "var(--primary)"
}

function subjectLabel(subject: string): string {
  return SUBJECTS.find((o) => o.value === subject)?.label ?? subject
}

const DAY_MS = 24 * 60 * 60 * 1000

/** "Nov 16 – 20", or across months "Nov 30 – Dec 4". */
function weekRange(days: { start: number }[]): string {
  const first = new Date(days[0].start)
  const last = new Date(days[days.length - 1].start)
  const month = (d: Date) => d.toLocaleDateString("en-CA", { month: "short" })
  return first.getMonth() === last.getMonth()
    ? `${month(first)} ${first.getDate()} – ${last.getDate()}`
    : `${month(first)} ${first.getDate()} – ${month(last)} ${last.getDate()}`
}

/** Mon–Fri of a week: lessons planned and Quick Checks recorded, stepping back
 *  and forward a week at a time. */
function ThisWeek({ onOpenLesson }: { onOpenLesson: (lesson: LessonMetadata) => void }) {
  const { tallies, lessons } = useSelectedClassData()
  const [offset, setOffset] = useState(0)
  const days = useMemo(() => buildWeek(lessons, tallies, Date.now(), offset), [lessons, tallies, offset])
  const empty = days.every((d) => d.lessons.length === 0 && d.checks.length === 0)
  const isFuture = days[0].start > Date.now() + DAY_MS
  const heading = offset === 0 ? "This week" : offset === -1 ? "Last week" : offset === 1 ? "Next week" : `Week of ${weekRange(days)}`
  const navButton =
    "flex size-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <section aria-labelledby="home-week-heading" className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-3">
      <div className="flex items-center gap-3">
        <h2 id="home-week-heading" className="font-display text-xl font-semibold text-card-foreground">
          {heading}
        </h2>
        {Math.abs(offset) <= 1 && <span className="text-sm text-muted-foreground max-sm:hidden">{weekRange(days)}</span>}
        <div className="ml-auto flex items-center gap-1">
          {/* Space for "Today" is kept, so the arrows don't move under the pointer. */}
          <button
            type="button"
            onClick={() => setOffset(0)}
            aria-hidden={offset === 0 ? true : undefined}
            tabIndex={offset === 0 ? -1 : undefined}
            className={`min-h-9 rounded-lg px-2.5 text-sm font-semibold text-secondary-strong transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${offset === 0 ? "invisible" : ""}`}
          >
            Today
          </button>
          <button type="button" onClick={() => setOffset((o) => o - 1)} aria-label="Previous week" className={navButton}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setOffset((o) => o + 1)} aria-label="Next week" className={navButton}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      {empty && (
        <p className="mt-1 text-sm text-muted-foreground">
          {isFuture
            ? "Nothing here yet. This is a record of lessons planned and Quick Checks recorded, so it fills in as the week happens."
            : offset === 0
              ? "Nothing planned or checked yet this week. Lessons you plan and Quick Checks you record show up here by day."
              : "Nothing planned or checked that week."}
        </p>
      )}
      <ol className="mt-4 grid gap-3 md:grid-cols-5">
        {days.map((day) => {
          const label = new Date(day.start).toLocaleDateString("en-CA", { weekday: "short", day: "numeric" })
          const nothing = day.lessons.length === 0 && day.checks.length === 0
          return (
            <li key={day.start} className={`flex flex-col gap-2 ${nothing ? "max-md:hidden" : ""}`}>
              <span className={`text-xs font-semibold ${day.isToday ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
                {day.isToday && " · today"}
              </span>
              {day.lessons.map((lesson) => {
                const color = subjectColor(lesson.subject)
                const codes = (lesson.curriculumCodesCovered ?? []).slice(0, 2).join(", ")
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => onOpenLesson(lesson)}
                    className="rounded-lg border px-2.5 py-2 text-left text-xs transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{
                      background: `color-mix(in oklch, ${color} 10%, var(--card))`,
                      borderColor: `color-mix(in oklch, ${color} 40%, var(--card))`,
                    }}
                  >
                    {codes && (
                      <span className="block font-bold" style={{ color }}>
                        {codes}
                      </span>
                    )}
                    <span className="line-clamp-2 text-foreground">{lesson.title || "Untitled lesson"}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      Gr {lesson.grade} {subjectLabel(lesson.subject)}
                    </span>
                  </button>
                )
              })}
              {day.checks.map((check) => (
                <span
                  key={check.lessonId}
                  className="rounded-lg border border-dashed border-border-strong px-2.5 py-2 text-xs text-foreground"
                >
                  <span className="block font-semibold">Quick Check</span>
                  <span className="line-clamp-2 text-muted-foreground">{check.title}</span>
                </span>
              ))}
              {nothing && <span className="rounded-lg border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">Nothing yet</span>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

/** The overall expectations classes are struggling with most, across classes:
 *  a slim bar under What's next, one line per expectation. */
function NeedsAttention({ onFindResources }: { onFindResources: (subject: string, grade: string, code: string) => void }) {
  const { tallies, lessons } = useSelectedClassData()
  const items = useMemo(() => buildNeedsAttention(tallies, lessons, 3), [tallies, lessons])

  return (
    <section aria-labelledby="home-attention-heading" className="flex flex-col gap-2 rounded-xl bg-pop-tint px-4 py-3">
      <h2 id="home-attention-heading" className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
        <AlertTriangle size={16} className="flex-shrink-0 text-pop-strong" aria-hidden="true" />
        Needs attention
        {items.length === 0 && (
          <span className="font-sans font-normal text-foreground">
            · Nothing flagged. A Quick Check with a class at Level 1–2 shows up here.
          </span>
        )}
      </h2>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map(({ subject, grade, overall }) => {
            const pct = Math.round((overall.lowShare ?? 0) * 100)
            return (
              <li key={`${subject}|${grade}|${overall.code}`} className="flex min-w-0 items-center gap-2 text-sm">
                <span
                  className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold"
                  style={{ background: subjectColor(subject), color: "var(--subject-foreground)" }}
                >
                  {subjectLabel(subject)} {grade}
                </span>
                <span className="min-w-0 flex-1 truncate text-foreground" title={`${overall.code} ${overall.title}`}>
                  <strong>{overall.code}</strong> {overall.title}
                </span>
                <span className="flex-shrink-0 text-xs text-foreground max-sm:hidden">{pct}% at Level 1–2</span>
                <button
                  type="button"
                  onClick={() => onFindResources(subject, grade, overall.code)}
                  className="min-h-8 flex-shrink-0 rounded-lg px-2 text-xs font-semibold text-pop-strong underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Find resources for ${subjectLabel(subject)} Grade ${grade} ${overall.code}, ${pct}% at Level 1–2`}
                >
                  Find resources
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
