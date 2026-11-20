"use client"

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react"
import { AlertTriangle, ArrowRight, BarChart3, ChevronDown, ClipboardCheck, Search } from "lucide-react"
import {
  Gauge,
  Legend,
  OverallFill,
  UNTAUGHT,
  formatDay,
  levelColor,
  noProgressReason,
  useClassData,
  useClassProgress,
} from "@/components/context-strip"
import { SUBJECTS } from "@/components/hero-personalize"
import DevSeedControl from "@/components/dev/dev-seed-control"
import PageHeader from "@/components/page-header"
import EvidenceCapsule from "@/components/ui/evidence-capsule"
import { READINESS_TOKENS } from "@/components/ui/readiness-pill"
import { isSandboxMode, type Evidence, type LevelCounts } from "@/lib/assessment-results"
import {
  buildClassProgress,
  inSelection,
  type ClassProgress,
  type CoveringLesson,
  type OverallProgress,
  type SpecificProgress,
  type StrandProgress,
} from "@/lib/class-progress"
import { useCurriculumText } from "@/lib/curriculum-text"
import type { ExpectationStatus } from "@/lib/expectation-status"
import { useGlobalFilters } from "@/lib/global-filters"
import { setProgressStrand } from "@/lib/progress-location"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import { recentClasses } from "@/lib/recent-classes"
import { useResourceCounter } from "@/lib/use-resource-counter"

// Progress: the class's place in the curriculum, down to the specific
// expectations, and a launchpad into planning (PROGRESS_SPEC.md §4).
//
// - It follows the top nav, always: exactly the subject and grade picked there,
//   never a fallback. Nothing picked means a choice of the teacher's subjects.
// - It reads the one model of progress (buildClassProgress) and the one gap
//   rule (expectation-status.ts), so its numbers match the header bar's.
// - It describes; it never prescribes (decision 8). Rows say what the data
//   shows and offer neutral actions.
// - Addresses: #progress/B (strand), /B2 (overall, opened), /B2.3 (specific,
//   its overall opened and the row marked). Scrolling past strands replaces
//   the address, so Back doesn't step through them. The strand in view is
//   shared with the header bar (progress-location.ts), which marks it.

export interface ProgressHandlers {
  /** Open a fresh planner seeded with the expectation. */
  onPlanExpectation: (code: string, label: string) => void
  onFindResources: (code: string) => void
  onOpenLesson: (lesson: LessonMetadata) => void
  onQuickCheck: (lesson: LessonMetadata) => void
}

/** Where to land: an anchor code, and a counter that changes on every jump. */
export interface ProgressTarget {
  anchor?: string
  nonce: number
}

export default function ProgressSpace({ target, ...handlers }: ProgressHandlers & { target: ProgressTarget }) {
  const { state } = useGlobalFilters()
  const { subject, grade } = state
  const progress = useClassProgress(subject, grade)
  const meta = SUBJECTS.find((s) => s.value === subject)

  return (
    <div className="flex h-full flex-col bg-background">
      <PageHeader icon={BarChart3} title="Progress">
        {progress && (
          <span className="hidden text-sm font-semibold text-foreground sm:inline">
            {meta?.label ?? subject} · Grade {grade}
          </span>
        )}
        {isSandboxMode() && (
          <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-strong">
            Sandbox
          </span>
        )}
        {/* The stores announce their changes, so there's nothing to re-read here. */}
        <DevSeedControl scope={{ kind: "global" }} onChanged={() => {}} />
      </PageHeader>

      {progress ? (
        <ProgressMap
          key={`${subject}|${grade}`}
          subject={subject}
          grade={grade}
          accent={meta?.color ?? "var(--primary)"}
          progress={progress}
          target={target}
          handlers={handlers}
        />
      ) : subject && grade ? (
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="max-w-md text-sm text-foreground">{noProgressReason(subject, grade)}</p>
        </div>
      ) : (
        <PickClass subject={subject} grade={grade} />
      )}
    </div>
  )
}

// ---- No class picked: the teacher's subjects, larger than the header's chips ----

function PickClass({ subject, grade }: { subject: string; grade: string }) {
  const { tallies, lessons } = useClassData()
  const { setSubject, setGrade } = useGlobalFilters()
  const classes = useMemo(
    () =>
      recentClasses(tallies, lessons)
        .filter((c) => inSelection(subject, grade, c.subject, c.grade))
        .map((c) => ({ ...c, progress: buildClassProgress(c.subject, c.grade, tallies, lessons) })),
    [tallies, lessons, subject, grade],
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl font-semibold text-foreground">Pick a subject and grade</h2>
          <p className="text-sm text-muted-foreground">
            {classes.length > 0 ? "Or choose them in the top bar." : noProgressReason(subject, grade)}
          </p>
        </div>
        {classes.length > 0 && (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => {
              const meta = SUBJECTS.find((s) => s.value === c.subject)
              const color = meta?.color ?? "var(--muted-foreground)"
              const p = c.progress
              const pct = p && p.total > 0 ? (p.taught / p.total) * 100 : 0
              const name = `${meta?.label ?? c.subject} · Grade ${c.grade}`
              return (
                <li key={`${c.subject}|${c.grade}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setSubject(c.subject)
                      setGrade(c.grade)
                    }}
                    className="flex w-full flex-col gap-3 rounded-xl border-2 bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    style={{ borderColor: `color-mix(in oklab, ${color} 45%, var(--card))` }}
                  >
                    <span className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                      <span className="size-3 flex-shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
                      {name}
                    </span>
                    {p ? (
                      <span className="flex items-center gap-3">
                        <span className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: UNTAUGHT }} aria-hidden="true">
                          <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {p.taught} of {p.total} taught
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{noProgressReason(c.subject, c.grade)}</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---- The map ----

const domId = (code: string) => `progress-${code}`
const strandOf = (code: string) => code.match(/^[A-Za-z]+/)?.[0] ?? code

function currentAnchor(): string | undefined {
  const m = window.location.hash.match(/^#progress\/(.+)$/)
  if (!m) return undefined
  try {
    return decodeURIComponent(m[1])
  } catch {
    return undefined
  }
}

/** Point the address at a code without a new history entry, so Back lands here. */
function markHere(code: string) {
  if (!window.location.hash.startsWith("#progress")) return
  window.history.replaceState(window.history.state, "", `#progress/${encodeURIComponent(code)}`)
}

/** Where an anchor points in this class, or null when it isn't here. */
function resolveAnchor(progress: ClassProgress, anchor: string): { strand: string; overall?: string; specific?: string } | null {
  for (const s of progress.strands) {
    if (s.code === anchor) return { strand: s.code }
    for (const o of s.overalls) {
      if (o.code === anchor) return { strand: s.code, overall: o.code }
      if (o.specifics.some((sp) => sp.code === anchor)) return { strand: s.code, overall: o.code, specific: anchor }
    }
  }
  return null
}

const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

interface RowContext {
  frontier: string | null
  highlight: string | null
  text: { byCode: Record<string, string>; topicByCode: Record<string, string> } | undefined
  lessonById: Map<string, LessonMetadata>
  count: (code: string) => number | null
  handlers: ProgressHandlers
}

function ProgressMap({
  subject,
  grade,
  accent,
  progress,
  target,
  handlers,
}: {
  subject: string
  grade: string
  accent: string
  progress: ClassProgress
  target: ProgressTarget
  handlers: ProgressHandlers
}) {
  const text = useCurriculumText(subject, grade)
  const counter = useResourceCounter()
  const { lessons } = useClassData()
  const lessonById = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons])
  const scrollRef = useRef<HTMLDivElement>(null)
  // While a jump scrolls, the strand jumped to wins: the last strands can't
  // reach the top of the page, so the spy alone would name the one above.
  const jumpLock = useRef(0)

  const overalls = progress.strands.flatMap((s) => s.overalls)
  // Open by default: where the class is, and anything with a gap.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(overalls.filter((o) => o.code === progress.frontier || o.status.gap).map((o) => o.code)),
  )
  const [highlight, setHighlight] = useState<string | null>(null)
  const [inView, setInView] = useState(progress.strands[0]?.code ?? "")

  const toggle = (code: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  const allOpen = overalls.every((o) => expanded.has(o.code))

  // A deep link opens its target and scrolls to it: at once on arrival,
  // smoothly for a jump while the page is open (the header bar's strands). A
  // code this class doesn't have (after a class switch) lands at the top with
  // nothing marked.
  const arrived = useRef(false)
  useEffect(() => {
    const smooth = arrived.current && !prefersReducedMotion()
    arrived.current = true
    const spot = target.anchor ? resolveAnchor(progress, target.anchor) : null
    if (!spot) {
      setHighlight(null)
      scrollRef.current?.scrollTo({ top: 0 })
      return
    }
    if (spot.overall) setExpanded((prev) => (prev.has(spot.overall!) ? prev : new Set(prev).add(spot.overall!)))
    setHighlight(spot.specific ?? spot.overall ?? null)
    setInView(spot.strand)
    jumpLock.current = Date.now() + 1000
    const id = domId(spot.specific ?? spot.overall ?? spot.strand)
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" }))
    // Only a new jump moves the page; live data updates don't.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.nonce])

  // Tell the header bar which strand is in view, and stop when Progress closes.
  useEffect(() => setProgressStrand(inView || null), [inView])
  useEffect(() => () => setProgressStrand(null), [])

  // Scrollspy: the strand in view drives the phone's strand select and the
  // address (replaced, never pushed).
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const visible = new Set<string>()
    const order = progress.strands.map((s) => s.code)
    const evaluate = () => {
      if (Date.now() < jumpLock.current) return
      // At the very bottom, the last strand on screen is the one being read.
      const atBottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 2
      const top = atBottom ? [...order].reverse().find((c) => visible.has(c)) : order.find((c) => visible.has(c))
      if (!top) return
      setInView(top)
      const here = currentAnchor()
      if (!here || strandOf(here) !== top) markHere(top)
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const code = (e.target as HTMLElement).dataset.strand ?? ""
          if (e.isIntersecting) visible.add(code)
          else visible.delete(code)
        }
        evaluate()
      },
      { root, rootMargin: "0px 0px -65% 0px" },
    )
    for (const code of order) {
      const el = document.getElementById(domId(code))
      if (el) observer.observe(el)
    }
    // A jump's lock holds against the page's own scrolling; the teacher's own
    // scrolling ends it, and every scroll re-checks the strand in view.
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(evaluate)
    }
    const release = () => {
      jumpLock.current = 0
    }
    root.addEventListener("scroll", onScroll, { passive: true })
    for (const type of ["wheel", "touchstart", "keydown"] as const) root.addEventListener(type, release, { passive: true })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      root.removeEventListener("scroll", onScroll)
      for (const type of ["wheel", "touchstart", "keydown"] as const) root.removeEventListener(type, release)
    }
  }, [progress.strands])

  const jumpTo = (code: string) => {
    jumpLock.current = Date.now() + 1000
    markHere(code)
    setInView(code)
    document.getElementById(domId(code))?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })
  }

  const ctx: RowContext = {
    frontier: progress.frontier,
    highlight,
    text,
    lessonById,
    count: (code) => counter(subject, grade, code),
    handlers,
  }
  const ongoing = progress.ongoingStrands.map((s) => `${s.code} ${s.label}`).join(", ")

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      {/* Phones: jump between strands. */}
      <div className="sticky top-0 z-10 border-b border-border bg-background px-4 py-2 md:hidden">
        <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
          Strand
          <select
            value={inView}
            onChange={(e) => jumpTo(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-xl border border-border-strong bg-input px-3 text-base font-semibold text-foreground focus-visible:outline-none keyboard:focus-visible:ring-2 keyboard:focus-visible:ring-ring"
          >
            {progress.strands.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 md:px-6">
        {/* Summary */}
        <section aria-label="Summary" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:p-5">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Gauge taught={progress.taught} total={progress.total} accent={accent} size={88} />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-base text-foreground">
                <strong>
                  {progress.taught} of {progress.total}
                </strong>{" "}
                expectations taught
              </p>
              <p className="text-sm text-muted-foreground">
                {progress.checked} checked · {progress.lessonCount} {progress.lessonCount === 1 ? "lesson" : "lessons"} · Last
                Quick Check: {formatDay(progress.lastCheckAt)}
              </p>
              {ongoing && <p className="text-sm text-muted-foreground">Ongoing in every lesson: {ongoing}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <Legend wrap />
            <button
              type="button"
              onClick={() => setExpanded(allOpen ? new Set() : new Set(overalls.map((o) => o.code)))}
              className={`${SECONDARY} self-start md:self-end`}
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </button>
          </div>
        </section>

        {progress.strands.map((s) => (
          <StrandSection key={s.code} strand={s} expanded={expanded} onToggle={toggle} ctx={ctx} />
        ))}
      </div>
    </div>
  )
}

function StrandSection({
  strand: s,
  expanded,
  onToggle,
  ctx,
}: {
  strand: StrandProgress
  expanded: Set<string>
  onToggle: (code: string) => void
  ctx: RowContext
}) {
  const headingId = useId()
  const checked = s.overalls.reduce((n, o) => n + o.checked, 0)
  return (
    <section id={domId(s.code)} data-strand={s.code} aria-labelledby={headingId} className="flex scroll-mt-16 flex-col gap-3 md:scroll-mt-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id={headingId} className="font-display text-xl font-semibold text-foreground">
            {s.code} {s.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {s.taught}/{s.total} taught · {checked} checked
          </p>
        </div>
        <div className="flex h-2.5 gap-0.5" aria-hidden="true">
          {s.overalls.map((o) => (
            <div key={o.code} className="flex overflow-hidden rounded-sm" style={{ flex: o.total, background: UNTAUGHT }}>
              <OverallFill overall={o} />
            </div>
          ))}
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {s.overalls.map((o) => (
          <OverallRow key={o.code} overall={o} open={expanded.has(o.code)} onToggle={() => onToggle(o.code)} ctx={ctx} />
        ))}
      </ul>
    </section>
  )
}

function OverallRow({ overall: o, open, onToggle, ctx }: { overall: OverallProgress; open: boolean; onToggle: () => void; ctx: RowContext }) {
  const panelId = useId()
  const factsId = useId()
  const isFrontier = o.code === ctx.frontier
  const marked = ctx.highlight === o.code
  return (
    <li
      id={domId(o.code)}
      className={`scroll-mt-16 overflow-hidden rounded-xl border bg-card shadow-sm md:scroll-mt-4 ${marked ? "border-secondary ring-2 ring-secondary" : "border-border"}`}
    >
      <div className="flex flex-col gap-3 p-4">
        <h3 className="font-display text-base font-semibold text-foreground">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={panelId}
            aria-describedby={factsId}
            className="group flex w-full items-start gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown
              size={18}
              aria-hidden="true"
              className={`mt-0.5 flex-shrink-0 text-muted-foreground motion-safe:transition-transform ${open ? "" : "-rotate-90"}`}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span>
                {o.code} {o.title}
                {isFrontier && <span className="ml-2 font-sans text-xs font-semibold text-pop-strong">now</span>}
              </span>
              <span className="flex h-2 overflow-hidden rounded-sm" style={{ background: UNTAUGHT }} aria-hidden="true">
                <OverallFill overall={o} />
              </span>
            </span>
            <span className="flex-shrink-0 font-sans text-sm font-normal text-muted-foreground">
              {o.taught}/{o.total} taught
            </span>
          </button>
        </h3>
        <div className="flex flex-col gap-3 pl-6">
          <Facts id={factsId} status={o.status} counts={o.counts} evidence={o.evidence} lastCheckedAt={o.lastCheckedAt} lessons={o.lessons} ctx={ctx} />
          <Actions code={o.code} label={o.title} status={o.status} lessons={o.lessons} ctx={ctx} />
        </div>
      </div>
      <ol id={panelId} hidden={!open} className="flex flex-col divide-y divide-border border-t border-border motion-safe:animate-fade-in">
        {open &&
          o.specifics.map((sp, i) => {
            const topic = ctx.text?.topicByCode[sp.code]
            const newTopic = topic && topic !== ctx.text?.topicByCode[o.specifics[i - 1]?.code ?? ""]
            return <SpecificRow key={sp.code} specific={sp} topic={newTopic ? topic : undefined} overallTitle={o.title} ctx={ctx} />
          })}
      </ol>
    </li>
  )
}

function SpecificRow({
  specific: sp,
  topic,
  overallTitle,
  ctx,
}: {
  specific: SpecificProgress
  topic: string | undefined
  overallTitle: string
  ctx: RowContext
}) {
  const wording = ctx.text?.byCode[sp.code]
  const marked = ctx.highlight === sp.code
  const color = sp.status.state === "not-taught" ? UNTAUGHT : levelColor(sp.level)
  return (
    <li id={domId(sp.code)} className={`flex scroll-mt-16 flex-col gap-2 px-4 py-3 md:scroll-mt-4 ${marked ? "ring-2 ring-inset ring-secondary" : ""}`}>
      {topic && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{topic}</p>}
      <div className="flex gap-3">
        <span className="w-1 flex-shrink-0 self-stretch rounded-full" style={{ background: color }} aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* The wording loads with the class; its line is held while it does. */}
          <p className="min-h-5 text-sm text-foreground">
            <span className="font-semibold">{sp.code}</span>{" "}
            {wording ?? <span className="text-muted-foreground">{ctx.text ? "" : "Loading wording…"}</span>}
          </p>
          <Facts
            status={sp.status}
            counts={sp.counts}
            evidence={sp.evidence}
            lastCheckedAt={sp.lastCheckedAt}
            lessons={sp.lessons}
            ctx={ctx}
          />
          <Actions code={sp.code} label={ctx.text?.topicByCode[sp.code] ?? overallTitle} status={sp.status} lessons={sp.lessons} ctx={ctx} />
        </div>
      </div>
    </li>
  )
}

// ---- What a row says ----

function Facts({
  id,
  status,
  counts,
  evidence,
  lastCheckedAt,
  lessons,
  ctx,
}: {
  id?: string
  status: ExpectationStatus
  counts: LevelCounts
  evidence: Evidence
  lastCheckedAt: number | null
  lessons: CoveringLesson[]
  ctx: RowContext
}) {
  let summary: ReactNode
  if (status.state === "not-taught") summary = "Not yet taught"
  else if (status.state === "taught") summary = "Taught, not checked"
  else {
    const label = status.level ? READINESS_TOKENS[status.level].label : ""
    summary = (
      <>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: levelColor(status.level) }} aria-hidden="true" />
          {label}
        </span>
        {status.gap && (
          <span className="inline-flex items-center gap-1 font-semibold">
            <AlertTriangle size={14} className="text-pop-strong" aria-hidden="true" />
            {status.low} of {status.responses} responses at Level 1–2
          </span>
        )}
        <span>Last checked {formatDay(lastCheckedAt)}</span>
      </>
    )
  }
  return (
    <div id={id} className="flex flex-col gap-2 text-sm text-foreground">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">{summary}</p>
      {status.state === "checked" && <EvidenceCapsule bands={counts} evidence={evidence} size="sm" className="max-w-xs" />}
      {status.hedge && <p className="text-xs text-muted-foreground">{status.hedge}</p>}
      {lessons.length > 0 && <LessonLinks lessons={lessons} ctx={ctx} />}
    </div>
  )
}

const SHOWN_LESSONS = 3

function LessonLinks({ lessons, ctx }: { lessons: CoveringLesson[]; ctx: RowContext }) {
  const shown = lessons.slice(0, SHOWN_LESSONS)
  const more = lessons.length - shown.length
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>{lessons.length === 1 ? "Lesson:" : "Lessons:"}</span>
      {shown.map((l, i) => {
        const lesson = l.inLog ? ctx.lessonById.get(l.id) : undefined
        const name = l.title || "Untitled lesson"
        return (
          <span key={l.id}>
            {lesson ? (
              <button
                type="button"
                onClick={() => ctx.handlers.onOpenLesson(lesson)}
                className="rounded font-semibold text-secondary-strong underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {name}
              </button>
            ) : (
              <span className="text-foreground" title="No longer in your lesson list; its Quick Check results are kept">
                {name}
              </span>
            )}{" "}
            ({formatDay(l.timestamp)}){i < shown.length - 1 || more > 0 ? "," : ""}
          </span>
        )
      })}
      {more > 0 && <span>and {more} more</span>}
    </p>
  )
}

// ---- What a row offers (by state, never by verdict) ----

const PRIMARY =
  "flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:w-full"
const SECONDARY =
  "flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 text-sm font-semibold text-secondary-strong transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:w-full"

interface Action {
  label: string
  icon: ReactNode
  primary: boolean
  run: () => void
}

function Actions({
  code,
  label,
  status,
  lessons,
  ctx,
}: {
  code: string
  label: string
  status: ExpectationStatus
  lessons: CoveringLesson[]
  ctx: RowContext
}) {
  const { handlers } = ctx
  const n = ctx.count(code)
  const resources = n ? `Browse ${n} ${code} resource${n === 1 ? "" : "s"}` : `Search for ${code} resources`
  // A Quick Check needs a lesson to check: the newest covering one still in the log.
  const checkable = lessons.map((l) => (l.inLog ? ctx.lessonById.get(l.id) : undefined)).find(Boolean)

  const plan = (text: string, primary: boolean): Action => ({
    label: text,
    icon: <ArrowRight size={14} aria-hidden="true" />,
    primary,
    run: () => handlers.onPlanExpectation(code, label),
  })
  const find = (text: string): Action => ({
    label: text,
    icon: <Search size={14} aria-hidden="true" />,
    primary: false,
    run: () => handlers.onFindResources(code),
  })
  const check = (lesson: LessonMetadata, primary: boolean): Action => ({
    label: `Run a Quick Check on “${lesson.title || "Untitled lesson"}”`,
    icon: <ClipboardCheck size={14} aria-hidden="true" />,
    primary,
    run: () => handlers.onQuickCheck(lesson),
  })

  let actions: Action[]
  if (status.state === "not-taught") actions = [plan(`Plan the ${code} lesson`, true), find(resources)]
  else if (status.state === "taught") actions = checkable ? [check(checkable, true), plan(`Plan a ${code} lesson`, false)] : [plan(`Plan a ${code} lesson`, true)]
  else if (status.gap)
    actions = [plan(`Plan a ${code} lesson`, true), find(n ? resources : `Find ${code} resources`), ...(checkable ? [check(checkable, false)] : [])]
  else actions = [find(resources)]

  return (
    <div className="flex flex-wrap gap-2 max-md:flex-col">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => {
            // Back from where this leads returns to this row.
            markHere(code)
            a.run()
          }}
          className={a.primary ? PRIMARY : SECONDARY}
          style={TEXT_WRAP}
        >
          {a.label}
          {a.icon}
        </button>
      ))}
    </div>
  )
}

// Long lesson titles wrap inside a button rather than widening the row.
const TEXT_WRAP: CSSProperties = { textAlign: "center", overflowWrap: "anywhere" }
