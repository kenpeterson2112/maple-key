"use client"

import { useMemo } from "react"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bookmark,
  Compass,
  GraduationCap,
  Lightbulb,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import MapleKeyIcon from "@/components/ui/maple-key-icon"
import { SUBJECTS } from "@/components/hero-personalize"
import { StrandTimeline, useClassData } from "@/components/context-strip"
import { buildClassProgress, buildOverallSummary } from "@/lib/class-progress"
import { useGlobalFilters } from "@/lib/global-filters"
import { useFilteredResources } from "@/lib/use-filtered-resources"
import { useBookmarks } from "@/lib/bookmarks-context"
import { getLessonLog, type LessonMetadata } from "@/lib/lesson-metadata"
import type { Filters } from "@/lib/types"

export type HomeDestination = "lessonplanner" | "resources" | "insights" | "lessons"

interface HomeSpaceProps {
  /** Navigate to one of the four working spaces. */
  onNavigate: (destination: HomeDestination) => void
  /** Open a previously generated lesson in the planner. */
  onOpenLesson: (lesson: LessonMetadata) => void
  /** Re-open the four-step "How Maple Key Works" tour on demand. */
  onOpenTour: () => void
  /** Open classroom materials setup. */
  onOpenClassroomSetup: () => void
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
}: HomeSpaceProps) {
  const { state, setGrade, setSubject } = useGlobalFilters()
  const { bookmarkedResources } = useBookmarks()

  // The count reflects curriculum context only. Sidebar facets are a Search
  // concern and deliberately not applied here.
  const contextFilters: Filters = useMemo(
    () => ({
      province: state.province,
      grade: state.grade,
      subject: state.subject,
      strand: state.strand,
      topic: "",
      learningType: "",
    }),
    [state.province, state.grade, state.subject, state.strand]
  )

  const { filteredResources, isLoading } = useFilteredResources(contextFilters)
  const matchCount = filteredResources.length

  // Read once per mount — the log only changes when a lesson is generated,
  // which unmounts this space.
  const recentLessons = useMemo(() => getLessonLog().slice(0, 3), [])

  const hasContext = !!(state.grade || state.subject || state.province)
  const hasHistory = recentLessons.length > 0 || bookmarkedResources.length > 0

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 md:px-6 py-8 md:py-12 space-y-10 md:space-y-12 motion-safe:animate-fade-in">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <header className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <MapleKeyIcon className="h-6 w-6" />
            <span className="text-xs font-semibold uppercase tracking-widest">Maple Key</span>
          </div>

          <h1 className="font-display text-3xl font-semibold md:text-5xl leading-tight tracking-tight text-foreground">
            Let's get planning.
          </h1>

          <p className="max-w-2xl text-base md:text-lg leading-relaxed text-muted-foreground">
            Tell Maple Key what you teach. It finds Canadian classroom resources matched to your
            curriculum expectations, drafts a lesson around the ones you pick, and tracks what your
            students understood so the next lesson starts in the right place.
          </p>
        </header>

        {/* ── Teaching context ─────────────────────────────────────────── */}
        <section
          aria-labelledby="home-context-heading"
          className="rounded-xl border border-border bg-card p-5 md:p-7 shadow-sm"
        >
          <h2 id="home-context-heading" className="font-display text-xl md:text-2xl font-semibold text-card-foreground">
            Your classes
          </h2>
          <ClassCards onOpen={(subject, grade) => {
            setSubject(subject)
            setGrade(grade)
            onNavigate("resources")
          }} />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("lessonplanner")}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              <Lightbulb size={16} />
              Plan a lesson
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={() => onNavigate("resources")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
            >
              <Search size={16} />
              {isLoading
                ? "Browse resources"
                : `Browse ${matchCount.toLocaleString()} matching resource${matchCount === 1 ? "" : "s"}`}
            </button>

            {!hasContext && (
              <p className="text-xs text-muted-foreground">
                Pick a subject and grade in the bar above to narrow this to your classroom.
              </p>
            )}
          </div>
        </section>

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

        {/* ── The three pillars ────────────────────────────────────────── */}
        <section aria-labelledby="home-spaces-heading" className="space-y-3">
          <h2
            id="home-spaces-heading"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            Where to go
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <DoorCard
              icon={Compass}
              title="Find resources"
              body="Search Canadian classroom resources filtered by grade, subject, strand and curriculum expectation. Save the ones worth teaching."
              action="Search resources"
              onClick={() => onNavigate("resources")}
            />
            <DoorCard
              icon={Lightbulb}
              title="Plan a lesson"
              body="Answer a few questions about pacing and format. Maple Key drafts a lesson around your saved resources, and you edit it until it fits."
              action="Open the planner"
              onClick={() => onNavigate("lessonplanner")}
            />
            <DoorCard
              icon={BarChart3}
              title="Track understanding"
              body="Check comprehension by curriculum expectation after a lesson, and see what landed and what needs another pass."
              action="View insights"
              onClick={() => onNavigate("insights")}
            />
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        {/* The same four steps the tour modal walks through — shown here as
            scannable copy so first-time arrival is never gated by a dialog.
            The modal is still available from the button below. */}
        <section aria-labelledby="home-how-heading" className="space-y-4">
          <h2
            id="home-how-heading"
            className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            How Maple Key works
          </h2>

          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HowStep
              step={1}
              icon={Search}
              title="Find"
              body="Filter the curated library down to your grade, subject and strand."
            />
            <HowStep
              step={2}
              icon={Bookmark}
              title="Save"
              body="Bookmark what fits and add materials you already use."
            />
            <HowStep
              step={3}
              icon={PenLine}
              title="Shape"
              body="Answer a few design questions, then edit the drafted plan."
            />
            <HowStep
              step={4}
              icon={Sparkles}
              title="Assess"
              body="Check understanding by expectation and plan the next lesson."
            />
          </ol>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenTour}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
            >
              <BookOpen size={15} />
              Take the tour
            </button>
            <button
              type="button"
              onClick={onOpenClassroomSetup}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
            >
              <GraduationCap size={15} />
              Set up your classroom
            </button>
          </div>
        </section>

        <p className="pb-4 text-xs text-muted-foreground">
          Your filters, bookmarks and lessons save in this browser. Signing in to sync them across
          devices is coming soon.
        </p>
      </div>
    </div>
  )
}

function DoorCard({
  icon: Icon,
  title,
  body,
  action,
  onClick,
}: {
  icon: LucideIcon
  title: string
  body: string
  action: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={19} />
      </span>
      <span className="font-display text-base font-bold text-card-foreground">{title}</span>
      <span className="flex-1 text-sm leading-relaxed text-muted-foreground">{body}</span>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        {action}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

function HowStep({
  step,
  icon: Icon,
  title,
  body,
}: {
  step: number
  icon: LucideIcon
  title: string
  body: string
}) {
  return (
    <li className="rounded-lg border border-border bg-card/60 p-4">
      <div className="flex items-center gap-2 text-primary">
        <Icon size={16} />
        <span className="text-xs font-semibold uppercase tracking-widest">Step {step}</span>
      </div>
      <p className="mt-2 font-display text-sm font-bold text-card-foreground">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </li>
  )
}

/** One card per subject and grade with any lesson or Quick Check. */
function ClassCards({ onOpen }: { onOpen: (subject: string, grade: string) => void }) {
  const { tallies, lessons } = useClassData()
  const cards = useMemo(
    () =>
      buildOverallSummary(tallies, lessons).classes.map((c) => ({
        ...c,
        progress: buildClassProgress(c.subject, c.grade, tallies, lessons),
      })),
    [tallies, lessons],
  )

  if (cards.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        No classes yet. Plan a lesson or run a Quick Check and each class shows up here with its progress
        through the curriculum.
      </p>
    )
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ subject, grade, progress }) => {
        const option = SUBJECTS.find((o) => o.value === subject)
        return (
          <button
            key={`${subject}|${grade}`}
            type="button"
            onClick={() => onOpen(subject, grade)}
            className="flex flex-col gap-2.5 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-semibold text-foreground">
                Grade {grade} {option?.label ?? subject}
              </span>
              <span
                className="h-3 w-3 flex-shrink-0 rounded-full"
                style={{ background: option?.color ?? "var(--primary)" }}
                aria-hidden="true"
              />
            </span>
            {progress ? (
              <>
                <StrandTimeline progress={progress} showLabels={false} height="h-2" />
                <span className="flex justify-between gap-2 text-sm">
                  <span className="text-foreground">
                    <strong>{progress.taught}</strong> of {progress.total} taught
                  </span>
                  {progress.needsWork && (
                    <span className="font-semibold text-pop-strong">{progress.needsWork.code} needs work</span>
                  )}
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">No curriculum data for this grade</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
