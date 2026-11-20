"use client"

import { useMemo, type CSSProperties } from "react"
import { ChevronRight } from "lucide-react"
import { OverallFill, UNTAUGHT, describeOverall, noProgressReason, useClassData } from "@/components/context-strip"
import { SUBJECTS } from "@/components/hero-personalize"
import { buildClassProgress, inSelection, type ClassProgress } from "@/lib/class-progress"
import { useProgressStrand } from "@/lib/progress-location"
import { recentClasses } from "@/lib/recent-classes"

// The top nav's second bar on desktop: subject data.
//   - A subject and grade with curriculum data: the whole curriculum as a
//     timeline, one equal-width labelled section per strand. Each strand is a
//     link into Progress at that strand (#progress/B); the overall slivers
//     inside are too small to click (WCAG 2.5.8), so they're visual only, with
//     a tooltip. On Progress, the strand in view is marked. "Open Progress"
//     sits at the end, beside the class's "N/M taught".
//   - Otherwise: the subjects the teacher has worked on, by grade, as chips
//     (most recent first); picking one sets the subject and grade, and the bar
//     becomes its timeline.
// Phones keep their one-line row (top-nav.tsx), which opens Progress.

interface Props {
  subject: string
  grade: string
  progress: ClassProgress | null
  /** Open Progress, optionally at a strand code. */
  onOpenProgress: (anchor?: string) => void
  onPickClass: (subject: string, grade: string) => void
}

export default function SubjectDataBar({ subject, grade, progress, onOpenProgress, onPickClass }: Props) {
  if (!progress) return <ClassChips subject={subject} grade={grade} onPick={onPickClass} />
  return <Timeline progress={progress} onOpenProgress={onOpenProgress} />
}

// ---- Timeline (a subject and grade picked) ----

// A column of equal width per strand, then a fixed column at the end for the
// count and the Open Progress link, so every strand fits on one row.
function strandGrid(strands: number): CSSProperties {
  return { gridTemplateColumns: `repeat(${strands}, minmax(0, 1fr)) 8rem` }
}

function Timeline({ progress, onOpenProgress }: { progress: ClassProgress; onOpenProgress: (anchor?: string) => void }) {
  const inView = useProgressStrand()
  return (
    <nav aria-label="Curriculum strands" className="grid w-full min-w-0 items-center gap-x-2" style={strandGrid(progress.strands.length)}>
      {progress.strands.map((s) => {
        const hasFrontier = s.overalls.some((o) => o.code === progress.frontier)
        const current = s.code === inView
        return (
          <button
            key={s.code}
            type="button"
            onClick={() => onOpenProgress(s.code)}
            aria-current={current ? "location" : undefined}
            aria-label={`${s.code} ${s.label}: ${s.taught} of ${s.total} taught${hasFrontier ? `, now on ${progress.frontier}` : ""}. Open in Progress`}
            className={`flex min-w-0 flex-col gap-1.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${current ? "bg-card shadow-sm" : ""}`}
          >
            {/* A long name wraps to two lines rather than truncating. */}
            <span className="flex w-full min-w-0 items-end justify-between gap-2">
              <span className={`line-clamp-2 min-w-0 text-sm font-semibold leading-tight text-foreground ${current ? "underline decoration-2 underline-offset-4" : ""}`}>
                {s.code} {s.label}
              </span>
              <span className="flex flex-shrink-0 items-baseline gap-1.5 text-xs">
                {hasFrontier && <span className="font-semibold text-pop-strong">now</span>}
                <span className="text-muted-foreground">
                  {s.taught}/{s.total}
                </span>
              </span>
            </span>
            <span className="flex h-3 w-full gap-0.5">
              {s.overalls.map((o) => (
                <span
                  key={o.code}
                  title={describeOverall(o)}
                  className={`flex overflow-hidden rounded-sm ${o.code === progress.frontier ? "outline outline-2 outline-offset-1 outline-foreground" : ""}`}
                  style={{ flex: o.total, background: UNTAUGHT }}
                >
                  <OverallFill overall={o} />
                </span>
              ))}
            </span>
          </button>
        )
      })}

      <span className="flex flex-col items-end gap-1">
        <span className="text-sm text-foreground">
          <strong>
            {progress.taught}/{progress.total}
          </strong>{" "}
          taught
        </span>
        <button
          type="button"
          onClick={() => onOpenProgress()}
          className="flex min-h-6 items-center gap-0.5 rounded-md text-sm font-semibold text-secondary-strong underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Open Progress
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </span>
    </nav>
  )
}

// ---- Class chips (no subject, or no grade, or no curriculum data) ----

function ClassChips({ subject, grade, onPick }: { subject: string; grade: string; onPick: (subject: string, grade: string) => void }) {
  const { tallies, lessons } = useClassData()
  const chips = useMemo(
    () =>
      recentClasses(tallies, lessons)
        .filter((c) => inSelection(subject, grade, c.subject, c.grade))
        .map((c) => ({ ...c, progress: buildClassProgress(c.subject, c.grade, tallies, lessons) })),
    [tallies, lessons, subject, grade],
  )

  // Both picked: this class has no curriculum data, so say why, and nothing else.
  const prompt =
    subject && grade
      ? noProgressReason(subject, grade)
      : chips.length === 0
        ? subject
          ? `Choose a grade above to see your ${subject} curriculum timeline.`
          : "Pick a subject and grade above to see your curriculum timeline."
        : subject
          ? `Choose a grade, or pick one:`
          : "Subjects"

  return (
    <div className="flex w-full min-w-0 items-center gap-4">
      <p className="flex-shrink-0 text-sm font-semibold text-foreground">{prompt}</p>
      {!(subject && grade) && chips.length > 0 && (
        <ul className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1" aria-label="Your subjects">
          {chips.map((c) => (
            <li key={`${c.subject}|${c.grade}`} className="flex-shrink-0">
              <ClassChip subject={c.subject} grade={c.grade} progress={c.progress} onPick={onPick} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ClassChip({
  subject,
  grade,
  progress,
  onPick,
}: {
  subject: string
  grade: string
  progress: ClassProgress | null
  onPick: (subject: string, grade: string) => void
}) {
  const meta = SUBJECTS.find((s) => s.value === subject)
  const color = meta?.color ?? "var(--muted-foreground)"
  const label = `${meta?.label ?? subject} · Gr ${grade}`
  const pct = progress && progress.total > 0 ? (progress.taught / progress.total) * 100 : 0
  const border: CSSProperties = { borderColor: `color-mix(in oklab, ${color} 45%, var(--card))` }
  return (
    <button
      type="button"
      onClick={() => onPick(subject, grade)}
      aria-label={`${meta?.label ?? subject}, Grade ${grade}${progress ? `: ${progress.taught} of ${progress.total} taught` : ""}. Show its timeline`}
      className="flex h-10 items-center gap-2.5 whitespace-nowrap rounded-full border-2 bg-card pl-3 pr-3.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={border}
    >
      <span className="size-2.5 flex-shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
      {label}
      {progress && (
        <span className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-12 overflow-hidden rounded-full" style={{ background: UNTAUGHT }}>
            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {progress.taught}/{progress.total}
          </span>
        </span>
      )}
    </button>
  )
}
