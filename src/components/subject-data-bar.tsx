"use client"

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react"
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion"
import { BarChart3, ChevronDown, ChevronRight, X } from "lucide-react"
import {
  Gauge,
  Legend,
  OverallFill,
  UNTAUGHT,
  describeOverall,
  formatDay,
  levelColor,
  noProgressReason,
  useClassData,
} from "@/components/context-strip"
import { SUBJECTS } from "@/components/hero-personalize"
import { READINESS_TOKENS } from "@/components/ui/readiness-pill"
import {
  buildClassProgress,
  inSelection,
  type ClassProgress,
  type OverallProgress,
  type SpecificProgress,
} from "@/lib/class-progress"
import { useCurriculumText } from "@/lib/curriculum-text"
import { recentClasses } from "@/lib/recent-classes"

// The top nav's second bar on desktop: subject data.
//   - A subject and grade with curriculum data: the whole curriculum as a
//     timeline, one equal-width labelled section per strand. Clicking it slides
//     open a drawer with every overall expectation in columns that line up
//     with the strands above (each opens in place to its specifics), then the
//     totals, legend and an Analyze button (to Progress) along the bottom.
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
  onOpenProgress: () => void
  onPickClass: (subject: string, grade: string) => void
}

export default function SubjectDataBar({ subject, grade, progress, accent, onOpenProgress, onPickClass }: Props) {
  if (!progress) return <ClassChips subject={subject} grade={grade} onPick={onPickClass} />
  return <Timeline subject={subject} grade={grade} progress={progress} accent={accent} onOpenProgress={onOpenProgress} />
}

// ---- Timeline (a subject and grade picked) ----

function Timeline({
  subject,
  grade,
  progress,
  accent,
  onOpenProgress,
}: {
  subject: string
  grade: string
  progress: ClassProgress
  accent: string
  onOpenProgress: () => void
}) {
  const [open, setOpen] = useState(false)
  // The overall whose specific expectations fill its strand's column, if any.
  const [expanded, setExpanded] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()
  const reduceMotion = useReducedMotion()

  // A different class is a different timeline: start it closed.
  useEffect(() => {
    setOpen(false)
    setExpanded(null)
  }, [subject, grade])

  useEffect(() => {
    if (!open) setExpanded(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      // Escape steps back one level: the specifics first, then the drop-down.
      if (expanded) {
        collapse(expanded)
        return
      }
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
  }, [open, expanded])

  /** Back to every overall, with focus on the one that was open. */
  function collapse(code: string) {
    setExpanded(null)
    requestAnimationFrame(() => document.getElementById(overallButtonId(panelId, code))?.focus())
  }

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

      <AnimatePresence initial={false}>
        {open && (
          // The drawer grows down from the bar; the scroll lives inside it so
          // the height animation isn't fighting a scrollbar.
          <motion.div
            key="details"
            id={panelId}
            role="region"
            aria-label="Curriculum details"
            className="absolute inset-x-0 top-full z-40 overflow-hidden border-b border-border bg-card shadow-xl"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="overflow-y-auto" style={{ maxHeight: "70dvh" }}>
              <Details
                subject={subject}
                grade={grade}
                progress={progress}
                accent={accent}
                panelId={panelId}
                expanded={expanded}
                onExpand={setExpanded}
                onCollapse={collapse}
                reduceMotion={!!reduceMotion}
                onOpenProgress={() => {
                  setOpen(false)
                  onOpenProgress()
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const overallButtonId = (panelId: string, code: string) => `${panelId}-overall-${code}`

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

/** The drop-down: every overall under its strand, in the same columns as the
 *  timeline above, then the totals, legend and Analyze along the bottom. An
 *  overall opens in place to show its specific expectations. */
function Details({
  subject,
  grade,
  progress,
  accent,
  panelId,
  expanded,
  onExpand,
  onCollapse,
  reduceMotion,
  onOpenProgress,
}: {
  subject: string
  grade: string
  progress: ClassProgress
  accent: string
  panelId: string
  expanded: string | null
  onExpand: (code: string) => void
  onCollapse: (code: string) => void
  reduceMotion: boolean
  onOpenProgress: () => void
}) {
  const ongoing = progress.ongoingStrands.map((s) => `${s.code} ${s.label}`).join(", ")
  // Fetch the wording as soon as the drawer opens, so it's there by the time
  // an overall is opened.
  const text = useCurriculumText(subject, grade)
  const layout = reduceMotion ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-6 pt-5">
      <LayoutGroup>
        <div className="grid gap-x-4 gap-y-5" style={strandGrid(progress.strands.length)}>
          {progress.strands.map((s) => {
            const open = s.overalls.find((o) => o.code === expanded)
            return (
              <section key={s.code} aria-label={`${s.code} ${s.label}`} className="flex min-w-0 flex-col gap-2">
                <h3 className="flex items-baseline justify-between gap-2 text-base font-semibold text-foreground">
                  <span className="min-w-0">
                    {s.code} {s.label}
                  </span>
                  <span className="flex-shrink-0 font-sans text-sm font-normal text-muted-foreground">
                    {s.taught}/{s.total}
                  </span>
                </h3>
                {open ? (
                  <SpecificsCard
                    overall={open}
                    isFrontier={open.code === progress.frontier}
                    text={text?.byCode}
                    topics={text?.topicByCode}
                    transition={layout}
                    onClose={() => onCollapse(open.code)}
                  />
                ) : (
                  <ul className="flex flex-col gap-1">
                    {s.overalls.map((o) => (
                      <OverallRow
                        key={o.code}
                        id={overallButtonId(panelId, o.code)}
                        overall={o}
                        isFrontier={o.code === progress.frontier}
                        transition={layout}
                        onOpen={() => onExpand(o.code)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )
          })}
        </div>
      </LayoutGroup>

      {/* Pinned to the drawer's bottom, so it stays in view while an open
          overall's specifics scroll. */}
      <div className="sticky bottom-0 flex items-center gap-6 border-t border-border bg-card py-4">
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
            onClick={onOpenProgress}
            className="flex min-h-10 flex-shrink-0 items-center gap-2 rounded-xl border border-border-strong bg-card px-4 text-sm font-semibold text-secondary-strong transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BarChart3 size={18} aria-hidden="true" />
            Analyze
          </button>
        </div>
      </div>
    </div>
  )
}

function overallStatus(o: OverallProgress): string {
  return o.level ? READINESS_TOKENS[o.level].label : o.taught > 0 ? "Not checked yet" : "Not yet taught"
}

type LayoutTransition = { duration: number; ease?: readonly [number, number, number, number] }

function OverallRow({
  id,
  overall: o,
  isFrontier,
  transition,
  onOpen,
}: {
  id: string
  overall: OverallProgress
  isFrontier: boolean
  transition: LayoutTransition
  onOpen: () => void
}) {
  return (
    <motion.li layoutId={`overall-${o.code}`} transition={transition} className="rounded-lg">
      <button
        id={id}
        type="button"
        onClick={onOpen}
        aria-expanded={false}
        aria-label={`${describeOverall(o)}. Show its ${o.total} specific expectations`}
        className={`group flex w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isFrontier ? "bg-pop-tint hover:bg-pop-tint" : ""}`}
      >
        <span className="flex items-baseline gap-2 text-sm text-foreground">
          <span className="flex-shrink-0 font-semibold">{o.code}</span>
          <span className="min-w-0 flex-1">{o.title}</span>
          {isFrontier && <span className="flex-shrink-0 text-xs font-semibold text-pop-strong">now</span>}
          <ChevronRight
            size={14}
            className="flex-shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
        <span className="flex h-2 overflow-hidden rounded-sm" style={{ background: UNTAUGHT }} aria-hidden="true">
          <OverallFill overall={o} />
        </span>
        <span className="text-xs text-muted-foreground">
          {o.taught} of {o.total} taught · {overallStatus(o)}
        </span>
      </button>
    </motion.li>
  )
}

/** One overall opened up: its specific expectations fill the strand's column,
 *  each with its wording and where the class is on it. */
function SpecificsCard({
  overall: o,
  isFrontier,
  text,
  topics,
  transition,
  onClose,
}: {
  overall: OverallProgress
  isFrontier: boolean
  text: Record<string, string> | undefined
  topics: Record<string, string> | undefined
  transition: LayoutTransition
  onClose: () => void
}) {
  const titleId = useId()
  return (
    <motion.div
      layoutId={`overall-${o.code}`}
      transition={transition}
      role="group"
      aria-labelledby={titleId}
      className={`relative flex flex-col gap-3 rounded-lg border border-border-strong p-3 ${isFrontier ? "bg-pop-tint" : "bg-muted"}`}
    >
      {/* Faded in after the box has grown, so the text never stretches. */}
      <motion.div
        className="flex flex-col gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transition.duration ? { delay: 0.15, duration: 0.2 } : { duration: 0 }}
      >
        <div className="flex items-start gap-2 pr-9">
          <div className="flex min-w-0 flex-col gap-1">
            <p id={titleId} className="font-display text-sm font-semibold text-foreground">
              {o.code} {o.title}
            </p>
            <span className="flex h-2 overflow-hidden rounded-sm" style={{ background: UNTAUGHT }} aria-hidden="true">
              <OverallFill overall={o} />
            </span>
            <span className="text-xs text-muted-foreground">
              {o.taught} of {o.total} taught · {overallStatus(o)}
            </span>
          </div>
        </div>

        <ol className="flex flex-col gap-1">
          {o.specifics.map((sp, i) => {
            const topic = topics?.[sp.code]
            const newTopic = topic && topic !== topics?.[o.specifics[i - 1]?.code ?? ""]
            return (
              <li key={sp.code} className="flex flex-col gap-1">
                {newTopic && (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{topic}</p>
                )}
                <SpecificRow specific={sp} text={text?.[sp.code]} loading={!text} />
              </li>
            )
          })}
        </ol>
      </motion.div>

      <button
        type="button"
        autoFocus
        onClick={onClose}
        aria-label={`Close ${o.code}, back to every overall expectation`}
        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </motion.div>
  )
}

function SpecificRow({ specific: sp, text, loading }: { specific: SpecificProgress; text: string | undefined; loading: boolean }) {
  const status = sp.level ? READINESS_TOKENS[sp.level].label : sp.taught ? "Taught, not checked" : "Not yet taught"
  const color = sp.level || sp.taught ? levelColor(sp.level) : UNTAUGHT
  return (
    <div className="flex gap-2.5 rounded-md bg-card px-2.5 py-2">
      {/* The same colours as the bars: readiness, taught-but-unchecked grey, or the empty track. */}
      <span className="w-1 flex-shrink-0 self-stretch rounded-full" style={{ background: color }} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-sm text-foreground">
          <span className="font-semibold">{sp.code}</span>{" "}
          {text ?? (loading ? <span className="text-muted-foreground">Loading wording…</span> : null)}
        </p>
        <p className="text-xs text-muted-foreground">
          {status}
          {sp.responses > 0 && ` · ${sp.responses} ${sp.responses === 1 ? "response" : "responses"}`}
        </p>
      </div>
    </div>
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
