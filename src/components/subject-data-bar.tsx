"use client"

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react"
import { BarChart3, ChevronDown } from "lucide-react"
import {
  Gauge,
  Legend,
  OverallFill,
  UNTAUGHT,
  describeOverall,
  formatDay,
  noProgressReason,
  useClassData,
} from "@/components/context-strip"
import { SUBJECTS } from "@/components/hero-personalize"
import { READINESS_TOKENS } from "@/components/ui/readiness-pill"
import { buildClassProgress, inSelection, type ClassProgress, type OverallProgress } from "@/lib/class-progress"
import { recentClasses } from "@/lib/recent-classes"

// The top nav's second bar on desktop: subject data.
//   - A subject and grade with curriculum data: the whole curriculum as a
//     timeline, one equal-width labelled section per strand. Clicking it opens
//     a drop-down with the totals and an Analyze button (to Track), then every
//     overall expectation in columns that line up with the strands above.
//   - Otherwise: the subjects the teacher has worked on, by grade, as chips
//     (most recent first); picking one sets the subject and grade, and the bar
//     becomes its timeline.
// Phones keep their one-line row and the class sheet (top-nav.tsx).

interface Props {
  subject: string
  grade: string
  progress: ClassProgress | null
  /** The subject's colour token, e.g. "var(--subject-math)". */
  accent: string
  onOpenTrack: () => void
  onPickClass: (subject: string, grade: string) => void
}

export default function SubjectDataBar({ subject, grade, progress, accent, onOpenTrack, onPickClass }: Props) {
  if (!progress) return <ClassChips subject={subject} grade={grade} onPick={onPickClass} />
  return <Timeline subject={subject} grade={grade} progress={progress} accent={accent} onOpenTrack={onOpenTrack} />
}

// ---- Timeline (a subject and grade picked) ----

function Timeline({
  subject,
  grade,
  progress,
  accent,
  onOpenTrack,
}: {
  subject: string
  grade: string
  progress: ClassProgress
  accent: string
  onOpenTrack: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  // A different class is a different timeline: start it closed.
  useEffect(() => setOpen(false), [subject, grade])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      setOpen(false)
      toggleRef.current?.focus()
    }
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDown)
    }
  }, [open])

  const summary = progress.strands.map((s) => `${s.code} ${s.label}, ${s.taught} of ${s.total}`).join("; ")

  return (
    <div ref={rootRef} className="flex h-full w-full items-center">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Curriculum timeline: ${progress.taught} of ${progress.total} expectations taught. ${summary}. ${open ? "Hide" : "Show"} details`}
        className="-mx-3 grid min-w-0 flex-1 items-end gap-x-4 rounded-xl px-3 py-2 text-left transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={strandGrid(progress.strands.length)}
      >
        <StrandSections progress={progress} />

        {/* The count sits at the end, beside the toggle, so it never pushes the
            strands out of line with the columns in the drop-down. */}
        <span className="flex flex-col items-end gap-1">
          <span className="text-sm text-foreground">
            <strong>
              {progress.taught}/{progress.total}
            </strong>{" "}
            taught
          </span>
          <span className="flex items-center gap-1 text-sm font-semibold text-secondary-strong">
            {open ? "Less" : "Details"}
            <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
          </span>
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Curriculum details"
          className="absolute inset-x-0 top-full z-40 overflow-y-auto border-b border-border bg-card shadow-xl"
          style={{ maxHeight: "70dvh" }}
        >
          <Details progress={progress} accent={accent} onOpenTrack={() => {
            setOpen(false)
            onOpenTrack()
          }} />
        </div>
      )}
    </div>
  )
}

// The timeline and the drop-down share one grid: a column of equal width per
// strand, then a fixed column at the end (the count and toggle above, nothing
// below). So each strand's details sit straight under its section of the bar,
// and every strand fits on one row.
function strandGrid(strands: number): CSSProperties {
  return { gridTemplateColumns: `repeat(${strands}, minmax(0, 1fr)) 7rem` }
}

/** One section per strand, labelled above its overalls. */
function StrandSections({ progress }: { progress: ClassProgress }) {
  return (
    <>
      {progress.strands.map((s) => {
        const hasFrontier = s.overalls.some((o) => o.code === progress.frontier)
        return (
          <span
            key={s.code}
            className="flex min-w-0 flex-col gap-1.5"
            title={`${s.code} ${s.label}: ${s.taught} of ${s.total} taught`}
            aria-hidden="true"
          >
            {/* A long name wraps to two lines rather than truncating. */}
            <span className="flex min-w-0 items-end justify-between gap-2">
              <span className="line-clamp-2 min-w-0 text-sm font-semibold leading-tight text-foreground">
                {s.code} {s.label}
              </span>
              <span className="flex flex-shrink-0 items-baseline gap-1.5 text-xs">
                {hasFrontier && <span className="font-semibold text-pop-strong">now</span>}
                <span className="text-muted-foreground">
                  {s.taught}/{s.total}
                </span>
              </span>
            </span>
            <span className="flex h-3 gap-0.5">
              {s.overalls.map((o) => (
                <span
                  key={o.code}
                  className={`flex overflow-hidden rounded-sm ${o.code === progress.frontier ? "outline outline-2 outline-offset-1 outline-foreground" : ""}`}
                  style={{ flex: o.total, background: UNTAUGHT }}
                >
                  <OverallFill overall={o} />
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </>
  )
}

/** The drop-down: the totals and Analyze on one line, then every overall
 *  under its strand, in the same columns as the timeline above. */
function Details({ progress, accent, onOpenTrack }: { progress: ClassProgress; accent: string; onOpenTrack: () => void }) {
  const ongoing = progress.ongoingStrands.map((s) => `${s.code} ${s.label}`).join(", ")
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-6 py-5">
      <div className="flex items-center gap-6 border-b border-border pb-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Gauge taught={progress.taught} total={progress.total} accent={accent} size={72} />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-foreground">
              <strong>
                {progress.taught} of {progress.total}
              </strong>{" "}
              expectations taught
            </p>
            <p className="text-xs text-muted-foreground">
              {progress.checked} checked · {progress.lessonCount} {progress.lessonCount === 1 ? "lesson" : "lessons"} · Last
              Quick Check: {formatDay(progress.lastCheckAt)}
            </p>
            {ongoing && <p className="text-xs text-muted-foreground">Ongoing in every lesson: {ongoing}</p>}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-6">
          <Legend />
          <button
            type="button"
            onClick={onOpenTrack}
            className="flex min-h-10 flex-shrink-0 items-center gap-2 rounded-xl border border-border-strong bg-card px-4 text-sm font-semibold text-secondary-strong transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BarChart3 size={18} aria-hidden="true" />
            Analyze
          </button>
        </div>
      </div>

      <div className="grid gap-x-4 gap-y-5" style={strandGrid(progress.strands.length)}>
        {progress.strands.map((s) => (
          <section key={s.code} aria-label={`${s.code} ${s.label}`} className="flex min-w-0 flex-col gap-2">
            <h3 className="flex items-baseline justify-between gap-2 text-base font-semibold text-foreground">
              <span className="min-w-0">
                {s.code} {s.label}
              </span>
              <span className="flex-shrink-0 font-sans text-sm font-normal text-muted-foreground">
                {s.taught}/{s.total}
              </span>
            </h3>
            <ul className="flex flex-col gap-1">
              {s.overalls.map((o) => (
                <OverallRow key={o.code} overall={o} isFrontier={o.code === progress.frontier} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function OverallRow({ overall: o, isFrontier }: { overall: OverallProgress; isFrontier: boolean }) {
  const status = o.level
    ? READINESS_TOKENS[o.level].label
    : o.taught > 0
      ? "Not checked yet"
      : "Not yet taught"
  return (
    <li className={`flex flex-col gap-1 rounded-lg px-2 py-1.5 ${isFrontier ? "bg-pop-tint" : ""}`} aria-label={describeOverall(o)}>
      <span className="flex items-baseline gap-2 text-sm text-foreground">
        <span className="flex-shrink-0 font-semibold">{o.code}</span>
        <span className="min-w-0 flex-1">{o.title}</span>
        {isFrontier && <span className="flex-shrink-0 text-xs font-semibold text-pop-strong">now</span>}
      </span>
      <span className="flex h-2 overflow-hidden rounded-sm" style={{ background: UNTAUGHT }} aria-hidden="true">
        <OverallFill overall={o} />
      </span>
      <span className="text-xs text-muted-foreground">
        {o.taught} of {o.total} taught · {status}
      </span>
    </li>
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
