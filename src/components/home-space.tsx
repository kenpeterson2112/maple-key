"use client"

import { useMemo } from "react"
import {
  BookOpen,
  Bookmark,
} from "lucide-react"
import { SUBJECTS } from "@/components/hero-personalize"
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
}: HomeSpaceProps) {
  const { setGrade, setSubject } = useGlobalFilters()
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

        {/* ── This week / Needs attention ──────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          <ThisWeek onOpenLesson={onOpenLesson} />
          <NeedsAttention
            onFindResources={(subject, grade, code) => {
              setSubject(subject)
              setGrade(grade)
              onFindResources(code)
            }}
          />
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

/** Mon–Fri of the current week: lessons planned and Quick Checks recorded. */
function ThisWeek({ onOpenLesson }: { onOpenLesson: (lesson: LessonMetadata) => void }) {
  const { tallies, lessons } = useSelectedClassData()
  const days = useMemo(() => buildWeek(lessons, tallies), [lessons, tallies])
  const empty = days.every((d) => d.lessons.length === 0 && d.checks.length === 0)

  return (
    <section aria-labelledby="home-week-heading" className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
      <h2 id="home-week-heading" className="font-display text-xl font-semibold text-card-foreground">
        This week
      </h2>
      {empty && (
        <p className="mt-1 text-sm text-muted-foreground">
          Nothing planned or checked yet this week. Lessons you plan and Quick Checks you record show up here by day.
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

/** The overall expectations classes are struggling with most, across classes. */
function NeedsAttention({ onFindResources }: { onFindResources: (subject: string, grade: string, code: string) => void }) {
  const { tallies, lessons } = useSelectedClassData()
  const items = useMemo(() => buildNeedsAttention(tallies, lessons), [tallies, lessons])

  return (
    <section aria-labelledby="home-attention-heading" className="flex flex-col gap-3 rounded-xl bg-pop-tint p-5">
      <h2 id="home-attention-heading" className="font-display text-xl font-semibold text-foreground">
        Needs attention
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-foreground">
          Nothing flagged. Once a Quick Check shows a class at Level 1–2 on an expectation, it appears here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map(({ subject, grade, overall }) => (
            <li key={`${subject}|${grade}|${overall.code}`} className="flex flex-col gap-1 text-sm">
              <span className="flex items-start gap-2">
                <span
                  className="mt-0.5 flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
                  style={{ background: subjectColor(subject), color: "var(--subject-foreground)" }}
                >
                  {subjectLabel(subject)} {grade}
                </span>
                <strong className="min-w-0 text-foreground">
                  {overall.code} {overall.title}
                </strong>
              </span>
              <span className="flex items-center justify-between gap-2 text-xs text-foreground">
                {Math.round((overall.lowShare ?? 0) * 100)}% at Level 1–2
                <button
                  type="button"
                  onClick={() => onFindResources(subject, grade, overall.code)}
                  className="min-h-8 rounded-lg px-2 font-semibold text-pop-strong underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Find resources for ${subjectLabel(subject)} Grade ${grade} ${overall.code}`}
                >
                  Find resources
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
