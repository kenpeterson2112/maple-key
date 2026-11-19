"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import useSWR from "swr"
import { Lightbulb, RotateCcw, Sparkles } from "lucide-react"
import { useClassData } from "@/components/context-strip"
import { SUBJECTS } from "@/components/hero-personalize"
import { buildNextStep, type NextStep, type ScopeSequence } from "@/lib/next-step"
import { getScopeSequence } from "@/lib/scope-sequence"
import { buildOverallSummary, isSameClass } from "@/lib/class-progress"
import { overallCodeOf, overallTitle } from "@/lib/curriculum-codes"
import { useCurriculumText } from "@/lib/curriculum-text"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import type { Resource } from "@/lib/types"
import { withBasePath } from "@/lib/base-path"
import { fetchJson } from "@/lib/fetch-json"
import { normalizeGrades } from "@/lib/utils"

// Layer 3 of the top nav: one suggestion, the reason for it, and the way to act
// on it. The suggestion comes from rules over the class's own lessons and
// Quick Checks and a scope and sequence (src/lib/next-step.ts); the rationale
// only states things the teacher can see elsewhere in the app.

export interface NextStepHandlers {
  /** Open the planner for this class, seeded with the expectation. */
  onPlan: (subject: string, grade: string, code: string, label: string) => void
  /** Search this class's resources for the expectation. */
  onFindResources: (subject: string, grade: string, code: string) => void
  /** Run a Quick Check on a saved lesson. */
  onQuickCheck: (lesson: LessonMetadata) => void
}

interface ClassStep {
  subject: string
  grade: string
  step: NextStep
  sequence: ScopeSequence
}

// ---- Data ----

/** How many active resources a class has tagged with a code (or under it, for an overall). */
function useResourceCounter() {
  const { data } = useSWR<{ resources: Resource[] }>(withBasePath("/resources.json"), fetchJson, { revalidateOnFocus: false })
  return useMemo(() => {
    const resources = (data?.resources ?? []).filter((r) => !r.is_collection && !r.suppressed)
    return (subject: string, grade: string, code: string): number | null => {
      if (!data) return null
      return resources.filter(
        (r) =>
          r.subject === subject &&
          normalizeGrades(r.grade_level).includes(grade) &&
          (r.curriculum_expectations ?? []).some((c) => c === code || c.startsWith(`${code}.`)),
      ).length
    }
  }, [data])
}

function stepFor(subject: string, grade: string, tallies: Parameters<typeof buildNextStep>[2], lessons: LessonMetadata[]): ClassStep {
  const sequence = getScopeSequence(subject, grade)
  const mine = (x: { subject: string; grade: string }) => isSameClass(subject, grade, x.subject, x.grade)
  return { subject, grade, sequence, step: buildNextStep(sequence, lessons.filter(mine), tallies.filter(mine)) }
}

/** The class's next step, or across classes (landing page / no subject): the
 *  worst reteach, else the class worked on most recently. */
function useNextStep(subject: string, grade: string, acrossClasses: boolean): ClassStep | null {
  const { tallies, lessons } = useClassData()
  return useMemo(() => {
    if (!acrossClasses) {
      return subject && grade && getScopeSequence(subject, grade).codes.length > 0 ? stepFor(subject, grade, tallies, lessons) : null
    }
    const steps = buildOverallSummary(tallies, lessons)
      .classes.filter(
        (c) => (!subject || c.subject === subject) && (!grade || c.grade === grade) && getScopeSequence(c.subject, c.grade).codes.length > 0,
      )
      .map((c) => stepFor(c.subject, c.grade, tallies, lessons))
    const reteach = steps
      .filter((s) => s.step.kind === "reteach")
      .sort((a, b) => (b.step.kind === "reteach" ? b.step.lowShare : 0) - (a.step.kind === "reteach" ? a.step.lowShare : 0))[0]
    if (reteach) return reteach
    const lastAt = (s: ClassStep) => (s.step.kind === "next" ? s.step.after.timestamp : 0)
    return steps.filter((s) => s.step.kind === "next").sort((a, b) => lastAt(b) - lastAt(a))[0] ?? null
  }, [subject, grade, acrossClasses, tallies, lessons])
}

// ---- Wording ----

function day(ts: number): string {
  return new Date(ts).toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" })
}

function listCodes(codes: string[]): string {
  if (codes.length <= 1) return codes[0] ?? ""
  return `${codes.slice(0, -1).join(", ")} and ${codes[codes.length - 1]}`
}

function subjectLabel(subject: string): string {
  return SUBJECTS.find((o) => o.value === subject)?.label ?? subject
}

// ---- View ----

export default function NextStepBar({
  subject,
  grade,
  acrossClasses = false,
  layout = "bar",
  handlers,
}: {
  subject: string
  grade: string
  /** Pick across classes (narrowed by whichever of subject/grade is set) rather
   *  than for exactly one class. */
  acrossClasses?: boolean
  /** "bar": the nav's third row. "stacked": inside the phone sheet. */
  layout?: "bar" | "stacked"
  handlers: NextStepHandlers
}) {
  const choice = useNextStep(subject, grade, acrossClasses)
  const count = useResourceCounter()
  const text = useCurriculumText(choice?.subject, choice?.grade)

  if (!choice) {
    if (!acrossClasses) return null
    return (
      <Shell layout={layout} icon={<Sparkles size={18} aria-hidden="true" />}>
        <p className={`text-sm text-foreground ${layout === "bar" ? "truncate" : ""}`}>
          <strong className="font-display font-semibold">Plan a lesson to get a next step.</strong>{" "}
          <span className="text-muted-foreground">
            Once a class has a lesson, Maple Key suggests what comes next in the curriculum, or what to reteach.
          </span>
        </p>
      </Shell>
    )
  }

  const { step, sequence } = choice
  const cls = `Grade ${choice.grade} ${subjectLabel(choice.subject)}`
  const prefix = acrossClasses ? `${cls} · ` : ""

  if (step.kind === "done") {
    return (
      <Shell layout={layout} icon={<Sparkles size={18} aria-hidden="true" />}>
        <p className={`text-sm text-foreground ${layout === "bar" ? "truncate" : ""}`}>
          <strong className="font-display font-semibold">{prefix}Every expectation has been taught.</strong>{" "}
          <span className="text-muted-foreground">Track shows where the class is secure and where to revisit.</span>
        </p>
      </Shell>
    )
  }

  const label = text?.topicByCode[step.code] ?? overallTitle(choice.subject, overallCodeOf(step.code), choice.grade)
  const n = count(choice.subject, choice.grade, step.code)
  const resourcesLine =
    n === null ? "" : n === 0 ? ` No resources are tagged ${step.code} yet.` : ` ${n} ${n === 1 ? "resource is" : "resources are"} tagged ${step.code}.`

  let headline: string
  let rationale: string
  let icon = <Lightbulb size={18} aria-hidden="true" />
  if (step.kind === "start") {
    headline = `Start with ${step.code} ${label}`
    rationale = `No lessons are planned for ${cls} yet, and ${step.code} comes first in ${sequence.name}.${resourcesLine}`
  } else if (step.kind === "reteach") {
    icon = <RotateCcw size={18} aria-hidden="true" />
    headline = `Reteach ${step.code} ${label} before moving on`
    rationale = `The Quick Check on ${day(step.checkedAt)} had ${Math.round(step.lowShare * 100)}% of responses at Level 1–2 on ${step.code}, from “${step.after.title || "your last lesson"}”.${resourcesLine}`
  } else {
    headline = `Next: ${step.code} ${label}`
    const covered = step.builtOn.length > 0 ? `, covering ${listCodes(step.builtOn)}` : ""
    rationale =
      `Your last lesson, “${step.after.title || "Untitled lesson"}” (${day(step.after.timestamp)})${covered}. ` +
      `${step.code} comes next in ${sequence.name}.${resourcesLine}` +
      (step.unchecked ? " That lesson hasn't been checked yet: a Quick Check first would confirm the class is ready." : "")
  }

  const primary = step.kind === "reteach" ? "Plan a reteach" : "Plan this lesson"
  return (
    <Shell layout={layout} icon={icon}>
      <Message layout={layout} headline={`${prefix}${headline}`} rationale={rationale} />
      <div className={`flex flex-wrap gap-2 ${layout === "bar" ? "flex-shrink-0 lg:flex-nowrap" : ""}`}>
        <button type="button" onClick={() => handlers.onPlan(choice.subject, choice.grade, step.code, label)} className={btn("primary", layout)}>
          {primary}
        </button>
        <button type="button" onClick={() => handlers.onFindResources(choice.subject, choice.grade, step.code)} className={btn("secondary", layout)}>
          See resources
        </button>
        {step.kind === "next" && step.unchecked && (
          <button type="button" onClick={() => handlers.onQuickCheck(step.after)} className={btn("secondary", layout)}>
            Quick Check first
          </button>
        )}
      </div>
    </Shell>
  )
}

function btn(kind: "primary" | "secondary", layout: "bar" | "stacked"): string {
  const size = layout === "bar" ? "min-h-8 px-2.5 text-[13px]" : "min-h-10 px-3 text-sm"
  const look =
    kind === "primary"
      ? "bg-primary text-primary-foreground hover:bg-primary-hover"
      : "border border-border-strong bg-card text-secondary-strong hover:bg-accent"
  return `${size} ${look} whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
}

/** Headline and rationale. In the nav bar they share one line, the rationale
 *  cut short with a "Why?" toggle to read it all; stacked, both show in full. */
function Message({ layout, headline, rationale }: { layout: "bar" | "stacked"; headline: string; rationale: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()

  // Close on Escape or a click anywhere outside the line and its panel.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onDown)
    }
  }, [open])

  if (layout === "stacked") {
    return (
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold leading-snug text-foreground">{headline}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{rationale}</p>
      </div>
    )
  }
  return (
    <div ref={ref} className="flex min-w-0 flex-1 items-baseline gap-2">
      <p className="min-w-0 flex-1 truncate text-sm">
        <strong className="font-display font-semibold text-foreground">{headline}.</strong>{" "}
        <span className="text-muted-foreground">{rationale}</span>
      </p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex-shrink-0 text-xs font-semibold text-secondary-strong underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? "Less" : "Why?"}
      </button>
      {/* Floats over the page rather than growing the bar, so the nav keeps
          its height. Anchored to the bar (Shell is the positioned parent). */}
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Why this next step"
          className="absolute left-0 right-0 top-full z-40 mt-1 rounded-xl border border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg"
        >
          <p className="font-display font-semibold">{headline}</p>
          <p className="mt-1 text-muted-foreground">{rationale}</p>
        </div>
      )}
    </div>
  )
}

function Shell({ layout, icon, children }: { layout: "bar" | "stacked"; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={layout === "bar" ? "relative flex items-center gap-3" : "flex flex-col gap-3"}>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-pop-tint text-pop-strong max-md:hidden [&>svg]:h-4 [&>svg]:w-4">
        {icon}
      </span>
      {children}
    </div>
  )
}
