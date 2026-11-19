"use client"

import { useMemo, useSyncExternalStore, type CSSProperties } from "react"
import { getAllTallies, getResultsVersion, subscribeResultsChanged, type ReadinessLevel } from "@/lib/assessment-results"
import { getLessonLog, getLessonLogVersion, subscribeLessonLog } from "@/lib/lesson-metadata"
import {
  buildClassProgress,
  buildOverallSummary,
  type ClassProgress,
  type OverallProgress,
  type OverallSummary,
} from "@/lib/class-progress"
import { curriculumGrades } from "@/lib/curriculum-codes"
import { READINESS_TOKENS } from "@/components/ui/readiness-pill"
import { PROVINCES } from "@/components/hero-personalize"

// The second row of the top nav: where the class is in the subject and grade
// the nav is set to (a gauge, a strand timeline, what needs work), or, with no
// subject chosen, a summary across all classes. Every colour is a token; the
// subject colour arrives as a CSS variable from top-nav.tsx.

// ---- Data ----

/** Tallies and lessons, re-read whenever either store changes. */
export function useClassData() {
  const resultsVersion = useSyncExternalStore(subscribeResultsChanged, getResultsVersion)
  const lessonVersion = useSyncExternalStore(subscribeLessonLog, getLessonLogVersion)
  const tallies = useMemo(() => getAllTallies(), [resultsVersion])
  const lessons = useMemo(() => getLessonLog(), [lessonVersion])
  return { tallies, lessons }
}

export function useClassProgress(subject: string, grade: string): ClassProgress | null {
  const { tallies, lessons } = useClassData()
  return useMemo(() => buildClassProgress(subject, grade, tallies, lessons), [subject, grade, tallies, lessons])
}

export function useOverallSummary(): OverallSummary {
  const { tallies, lessons } = useClassData()
  return useMemo(() => buildOverallSummary(tallies, lessons), [tallies, lessons])
}

// ---- Shared bits ----

const UNTAUGHT = "color-mix(in oklch, var(--foreground) 12%, transparent)"
const TAUGHT_UNCHECKED = "color-mix(in oklch, var(--foreground) 38%, transparent)"

function levelColor(level: ReadinessLevel | null): string {
  return level ? `var(${READINESS_TOKENS[level].token})` : TAUGHT_UNCHECKED
}

function formatDay(ts: number | null): string {
  return ts ? new Date(ts).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "none yet"
}

function describeOverall(o: OverallProgress): string {
  const checked = o.level ? `, ${READINESS_TOKENS[o.level].label.toLowerCase()}` : o.taught > 0 ? ", not checked yet" : ""
  return `${o.code} ${o.title}: ${o.taught} of ${o.total} taught${checked}`
}

export function provinceName(code: string): string {
  return code ? (PROVINCES.find((p) => p.value === code)?.label ?? code) : "Anywhere in Canada"
}

/** Half-ring gauge: share of the grade's expectations taught. */
export function Gauge({ taught, total, accent, size = 104 }: { taught: number; total: number; accent: string; size?: number }) {
  const pct = total > 0 ? Math.round((taught / total) * 100) : 0
  return (
    <svg width={size} height={size * 0.58} viewBox="0 0 112 65" role="img" aria-label={`${taught} of ${total} expectations taught`} className="flex-shrink-0">
      <path d="M8 58 A48 48 0 0 1 104 58" fill="none" stroke={UNTAUGHT} strokeWidth="12" strokeLinecap="round" />
      {pct > 0 && (
        <path
          d="M8 58 A48 48 0 0 1 104 58"
          fill="none"
          stroke={accent}
          strokeWidth="12"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${pct} 100`}
        />
      )}
      <text x="56" y="56" textAnchor="middle" className="fill-foreground font-display" fontWeight="700" fontSize="22">
        {pct}%
      </text>
    </svg>
  )
}

/** One bar per strand, sized by its expectation count, a block per overall. */
export function StrandTimeline({
  progress,
  showLabels = true,
  height = "h-5",
}: {
  progress: ClassProgress
  showLabels?: boolean
  height?: string
}) {
  const summary = progress.strands.map((s) => `${s.code} ${s.label}: ${s.taught} of ${s.total} taught`).join("; ")
  return (
    <div className="flex min-w-0 items-end gap-1.5" role="img" aria-label={`Progress by strand. ${summary}.`}>
      {progress.strands.map((s) => (
        <div key={s.code} className="flex min-w-0 flex-col gap-1" style={{ flex: s.total }}>
          <div className={`flex gap-0.5 ${height}`}>
            {s.overalls.map((o) => {
              const isFrontier = o.code === progress.frontier
              const fill: CSSProperties = { width: `${(o.taught / o.total) * 100}%`, background: levelColor(o.level) }
              return (
                <div
                  key={o.code}
                  title={describeOverall(o)}
                  className={`flex overflow-hidden rounded-sm ${isFrontier ? "outline outline-2 outline-offset-1 outline-foreground" : ""}`}
                  style={{ flex: o.total, background: UNTAUGHT }}
                >
                  <div style={fill} />
                </div>
              )
            })}
          </div>
          {showLabels && (
            <span className="truncate text-xs font-semibold text-foreground">
              {s.code} {s.label} · {s.taught}/{s.total}
              {s.overalls.some((o) => o.code === progress.frontier) && (
                <span className="text-pop-strong"> · now {progress.frontier}</span>
              )}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

export function Legend() {
  const levels: ReadinessLevel[] = ["poor", "okay", "good", "great"]
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {levels.map((l) => (
        <span key={l} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: levelColor(l) }} aria-hidden="true" />
          {READINESS_TOKENS[l].label}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: TAUGHT_UNCHECKED }} aria-hidden="true" />
        Taught, not checked
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: UNTAUGHT }} aria-hidden="true" />
        Not yet
      </span>
    </div>
  )
}

/** The one overall to act on: the struggling one, else where the class is. */
export function NextStep({
  progress,
  onFindResources,
  onPlan,
}: {
  progress: ClassProgress
  onFindResources?: (code: string) => void
  onPlan?: () => void
}) {
  const all = progress.strands.flatMap((s) => s.overalls)
  const target = progress.needsWork ?? all.find((o) => o.code === progress.frontier) ?? null
  if (!target) {
    return <p className="text-sm text-muted-foreground">Every expectation is taught and secure.</p>
  }
  const struggling = target === progress.needsWork
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className={`text-xs font-bold uppercase tracking-wide ${struggling ? "text-pop-strong" : "text-muted-foreground"}`}>
        {struggling ? "Needs work" : "Up next"}
      </span>
      <span className="font-display text-base font-semibold leading-tight text-foreground line-clamp-2">
        {target.code} {target.title}
      </span>
      <span className="text-xs text-muted-foreground">
        {struggling && target.lowShare !== null
          ? `${Math.round(target.lowShare * 100)}% at Level 1–2`
          : `${target.taught} of ${target.total} taught`}
      </span>
      <div className="mt-1 flex flex-wrap gap-2">
        {onFindResources && (
          <button
            type="button"
            onClick={() => onFindResources(target.code)}
            className="min-h-9 whitespace-nowrap rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Find resources
          </button>
        )}
        {onPlan && (
          <button
            type="button"
            onClick={onPlan}
            className="min-h-9 whitespace-nowrap rounded-lg border border-border-strong bg-card px-3 text-sm font-semibold text-secondary-strong transition-colors hover:bg-accent"
          >
            Plan a lesson
          </button>
        )}
      </div>
    </div>
  )
}

/** Why there's no progress view for this selection, in one line. */
export function noProgressReason(subject: string, grade: string): string {
  if (!subject) return "Choose a subject and grade to see where your class is."
  if (!grade) return `Choose a grade to see your ${subject} progress.`
  const grades = curriculumGrades(subject)
  if (grades.length === 0) return `${subject} isn't in the curriculum data yet.`
  return `The Ontario ${subject} curriculum here covers Grades ${grades[0]}–${grades[grades.length - 1]}.`
}

/** Desktop row 2 with a subject and grade chosen. */
export function SubjectStrip({
  progress,
  accent,
  onFindResources,
  onPlan,
}: {
  progress: ClassProgress
  accent: string
  onFindResources?: (code: string) => void
  onPlan?: () => void
}) {
  const ongoing = progress.ongoingStrands.map((s) => `${s.code} (${s.label})`).join(", ")
  return (
    <div className="flex items-stretch gap-6">
      <div className="flex flex-shrink-0 items-center gap-3">
        <Gauge taught={progress.taught} total={progress.total} accent={accent} />
        <div className="flex flex-col gap-0.5 text-sm">
          <span className="text-foreground">
            <strong>
              {progress.taught} of {progress.total}
            </strong>{" "}
            taught
          </span>
          <span className="text-xs text-muted-foreground">
            {progress.checked} checked · {progress.lessonCount} {progress.lessonCount === 1 ? "lesson" : "lessons"}
          </span>
          <span className="text-xs text-muted-foreground">Last Quick Check: {formatDay(progress.lastCheckAt)}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <StrandTimeline progress={progress} />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Legend />
          {ongoing && (
            <span className="min-w-0 max-w-full truncate text-xs text-muted-foreground" title={`Ongoing in every lesson: ${ongoing}`}>
              Ongoing in every lesson: {ongoing}
            </span>
          )}
        </div>
      </div>

      <div className="hidden w-72 flex-shrink-0 border-l border-border-strong pl-5 lg:block">
        <NextStep progress={progress} onFindResources={onFindResources} onPlan={onPlan} />
      </div>
    </div>
  )
}

/** Desktop row 2 across all classes (landing page, or no subject chosen). */
export function OverallStrip({ province, note }: { province: string; note?: string }) {
  const summary = useOverallSummary()
  const n = summary.classes.length
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-foreground">
      <span className="font-semibold">{provinceName(province)}</span>
      <span className="text-muted-foreground" aria-hidden="true">·</span>
      <span>
        {n} {n === 1 ? "class" : "classes"}
      </span>
      <span className="text-muted-foreground" aria-hidden="true">·</span>
      <span>
        {summary.lessonsThisWeek} {summary.lessonsThisWeek === 1 ? "lesson" : "lessons"} this week
      </span>
      <span className="text-muted-foreground" aria-hidden="true">·</span>
      <span>Last Quick Check: {formatDay(summary.lastCheckAt)}</span>
      {note && <span className="text-muted-foreground lg:ml-auto">{note}</span>}
    </div>
  )
}

/** Phone sheet: one row per strand, so the names have room. */
export function StrandRows({ progress }: { progress: ClassProgress }) {
  return (
    <ul className="flex flex-col gap-3">
      {progress.strands.map((s) => {
        const hasFrontier = s.overalls.some((o) => o.code === progress.frontier)
        return (
          <li key={s.code} className={`flex flex-col gap-1.5 ${hasFrontier ? "-mx-2 rounded-xl bg-pop-tint px-2 py-2" : ""}`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 font-semibold text-foreground">
                {s.code} {s.label}
                {hasFrontier && <span className="ml-1.5 text-xs font-semibold text-pop-strong">now on {progress.frontier}</span>}
              </span>
              <span className="flex-shrink-0 text-muted-foreground">
                {s.taught}/{s.total}
              </span>
            </div>
            <div className="flex h-2.5 gap-0.5" role="img" aria-label={s.overalls.map(describeOverall).join("; ")}>
              {s.overalls.map((o) => (
                <div key={o.code} className="flex overflow-hidden rounded-sm" style={{ flex: o.total, background: UNTAUGHT }}>
                  <div style={{ width: `${(o.taught / o.total) * 100}%`, background: levelColor(o.level) }} />
                </div>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
