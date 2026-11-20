"use client"

import { useMemo } from "react"
import useSWR from "swr"
import { AlertTriangle, ArrowRight, ClipboardCheck, Lightbulb, Search, Sparkles } from "lucide-react"
import { useClassData } from "@/components/context-strip"
import { SUBJECTS } from "@/components/hero-personalize"
import { buildNextStep, type NextStep, type ScopeSequence } from "@/lib/next-step"
import { getScopeSequence } from "@/lib/scope-sequence"
import { isSameClass } from "@/lib/class-progress"
import { recentClasses } from "@/lib/recent-classes"
import { overallCodeOf, overallTitle } from "@/lib/curriculum-codes"
import { useCurriculumText } from "@/lib/curriculum-text"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import type { Resource } from "@/lib/types"
import { withBasePath } from "@/lib/base-path"
import { fetchJson } from "@/lib/fetch-json"
import { normalizeGrades } from "@/lib/utils"

// The landing page's What's next widget: suggestions and next steps, each with
// the reason for it and the way to act on it. It replaces the old third header
// bar. The suggestion comes from rules over the class's own lessons and Quick
// Checks and a scope and sequence (src/lib/next-step.ts); the rationale only
// states things the teacher can see elsewhere in the app.
//
// With a subject and grade picked, it's that class's next step. Otherwise it
// looks across the teacher's classes (narrowed by whichever picker is set):
// gaps first, largest first, then each class's next lesson, most recently
// active first, up to three. A gap is described, never prescribed: no
// "re-teach" in any label (PROGRESS_SPEC.md, decision 8).

export interface NextStepHandlers {
  /** Open the planner for this class, seeded with the expectation. */
  onPlan: (subject: string, grade: string, code: string, label: string) => void
  /** Search this class's resources for the expectation. */
  onFindResources: (subject: string, grade: string, code: string) => void
  /** Run a Quick Check on a saved lesson. */
  onQuickCheck: (lesson: LessonMetadata) => void
  /** Open the planner with nothing chosen (no class has a lesson yet). */
  onPlanBlank: () => void
  /** Open Track (every expectation taught). */
  onOpenTrack: () => void
}

interface ClassStep {
  subject: string
  grade: string
  step: NextStep
  sequence: ScopeSequence
}

const MAX_ACROSS = 3

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

const hasSequence = (subject: string, grade: string) => !!subject && !!grade && getScopeSequence(subject, grade).codes.length > 0

/** The suggestions to show, best first, and whether they're for one class. */
function useNextSteps(subject: string, grade: string): { steps: ClassStep[]; oneClass: boolean } {
  const { tallies, lessons } = useClassData()
  return useMemo(() => {
    if (hasSequence(subject, grade)) return { steps: [stepFor(subject, grade, tallies, lessons)], oneClass: true }
    const steps = recentClasses(tallies, lessons) // most recently active first
      .filter((c) => (!subject || c.subject === subject) && (!grade || c.grade === grade) && hasSequence(c.subject, c.grade))
      .map((c) => stepFor(c.subject, c.grade, tallies, lessons))
      .filter((s) => s.step.kind !== "done" && s.step.kind !== "start")
    const lowShare = (s: ClassStep) => (s.step.kind === "gap" ? s.step.lowShare : 0)
    const gaps = steps.filter((s) => s.step.kind === "gap").sort((a, b) => lowShare(b) - lowShare(a))
    const rest = steps.filter((s) => s.step.kind !== "gap")
    return { steps: [...gaps, ...rest].slice(0, MAX_ACROSS), oneClass: false }
  }, [subject, grade, tallies, lessons])
}

// ---- Wording ----

function day(ts: number): string {
  return new Date(ts).toLocaleDateString("en-CA", { weekday: "long", month: "short", day: "numeric" })
}

function listCodes(codes: string[]): string {
  if (codes.length <= 1) return codes[0] ?? ""
  return `${codes.slice(0, -1).join(", ")} and ${codes[codes.length - 1]}`
}

function subjectMeta(subject: string) {
  const s = SUBJECTS.find((o) => o.value === subject)
  return { label: s?.label ?? subject, color: s?.color ?? "var(--primary)" }
}

interface Wording {
  kind: "gap" | "next"
  headline: string
  rationale: string
  /** The main action's label. */
  planLabel: string
  /** The resources action's label (what used to be "See resources"). */
  resourcesLabel: string
}

/** Headline, the reason for it and the action labels for one class's step. */
function describe(c: ClassStep, label: string, n: number | null): Wording | null {
  const { step, sequence } = c
  if (step.kind === "done") return null
  const cls = `Grade ${c.grade} ${subjectMeta(c.subject).label}`
  const tagged =
    n === null ? "" : n === 0 ? ` No resources are tagged ${step.code} yet.` : ` ${n} ${n === 1 ? "resource is" : "resources are"} tagged ${step.code}.`
  const resourcesLabel = n ? `Browse ${n} ${step.code} resource${n === 1 ? "" : "s"}` : `Search for ${step.code} resources`

  if (step.kind === "gap") {
    return {
      kind: "gap",
      headline: `A gap on ${step.code} ${label}`,
      rationale: `In the Quick Check on ${day(step.checkedAt)}, ${step.low} of ${step.responses} responses were at Level 1–2 on ${step.code}, from “${step.after.title || "your last lesson"}”.${tagged}`,
      planLabel: `Plan a ${step.code} lesson`,
      resourcesLabel,
    }
  }
  const planLabel = `Plan the ${step.code} lesson`
  if (step.kind === "start") {
    return {
      kind: "next",
      headline: `Start with ${step.code} ${label}`,
      rationale: `No lessons are planned for ${cls} yet, and ${step.code} comes first in ${sequence.name}.${tagged}`,
      planLabel,
      resourcesLabel,
    }
  }
  if (step.kind === "continue") {
    return {
      kind: "next",
      headline: `Next up: ${step.code} ${label}`,
      rationale: `Quick Checks for ${cls} reach ${step.furthest}, and ${step.code} comes next in ${sequence.name}.${tagged}`,
      planLabel,
      resourcesLabel,
    }
  }
  const covered = step.builtOn.length > 0 ? `, covering ${listCodes(step.builtOn)}` : ""
  return {
    kind: "next",
    headline: `Next up: ${step.code} ${label}`,
    rationale:
      `Your last lesson was “${step.after.title || "Untitled lesson"}” (${day(step.after.timestamp)})${covered}. ` +
      `${step.code} comes next in ${sequence.name}.${tagged}` +
      (step.unchecked ? " That lesson hasn't been checked yet: a Quick Check first would confirm the class is ready." : ""),
    planLabel,
    resourcesLabel,
  }
}

// ---- View ----

export default function WhatsNextWidget({ subject, grade, handlers }: { subject: string; grade: string; handlers: NextStepHandlers }) {
  const { steps, oneClass } = useNextSteps(subject, grade)
  const done = oneClass && steps[0]?.step.kind === "done"

  return (
    <section aria-labelledby="home-next-heading" className="flex min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 id="home-next-heading" className="font-display text-xl font-semibold text-card-foreground">
        What&rsquo;s next
      </h2>

      {done ? (
        <Empty
          icon={<Sparkles size={18} aria-hidden="true" />}
          headline="Every expectation has been taught."
          body="Track shows where the class is secure and where the gaps are."
          action={{ label: "See where the class is in Track", onClick: handlers.onOpenTrack }}
        />
      ) : steps.length === 0 ? (
        <Empty
          icon={<Sparkles size={18} aria-hidden="true" />}
          headline="Plan a lesson to get a next step."
          body="Once a class has a lesson, Maple Key suggests what comes next in the curriculum, and shows any gaps."
          action={{ label: "Plan a lesson", onClick: handlers.onPlanBlank }}
        />
      ) : (
        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <Suggestion key={`${s.subject}|${s.grade}`} choice={s} featured={i === 0} showClass={!oneClass} handlers={handlers} />
          ))}
        </ol>
      )}
    </section>
  )
}

function Suggestion({
  choice,
  featured,
  showClass,
  handlers,
}: {
  choice: ClassStep
  featured: boolean
  showClass: boolean
  handlers: NextStepHandlers
}) {
  const count = useResourceCounter()
  const text = useCurriculumText(choice.subject, choice.grade)
  const step = choice.step
  if (step.kind === "done") return null
  const label = text?.topicByCode[step.code] ?? overallTitle(choice.subject, overallCodeOf(step.code), choice.grade)
  const w = describe(choice, label, count(choice.subject, choice.grade, step.code))
  if (!w) return null
  const { label: subjectLabel, color } = subjectMeta(choice.subject)
  const quickCheck = step.kind === "next" && step.unchecked ? step.after : null

  return (
    <li className={`flex gap-3 rounded-xl p-4 ${w.kind === "gap" ? "bg-pop-tint" : "bg-muted"}`}>
      <span
        className={`flex size-8 flex-shrink-0 items-center justify-center rounded-full ${w.kind === "gap" ? "bg-card text-pop-strong" : "bg-card text-secondary-strong"}`}
        aria-hidden="true"
      >
        {w.kind === "gap" ? <AlertTriangle size={16} /> : <Lightbulb size={16} />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {showClass && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <span className="size-2 rounded-full" style={{ background: color }} aria-hidden="true" />
            Grade {choice.grade} {subjectLabel}
          </span>
        )}
        <p className={`font-display font-semibold leading-snug text-foreground ${featured ? "text-lg" : "text-base"}`}>{w.headline}</p>
        {featured && <p className="text-sm text-foreground">{w.rationale}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handlers.onPlan(choice.subject, choice.grade, step.code, label)}
            className="flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {w.planLabel}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
          {featured && (
            <button type="button" onClick={() => handlers.onFindResources(choice.subject, choice.grade, step.code)} className={SECONDARY}>
              <Search size={14} aria-hidden="true" />
              {w.resourcesLabel}
            </button>
          )}
          {featured && quickCheck && (
            <button type="button" onClick={() => handlers.onQuickCheck(quickCheck)} className={SECONDARY}>
              <ClipboardCheck size={14} aria-hidden="true" />
              Run a Quick Check first
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

const SECONDARY =
  "flex min-h-10 items-center gap-1.5 rounded-lg border border-border-strong bg-card px-3 text-sm font-semibold text-secondary-strong transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function Empty({
  icon,
  headline,
  body,
  action,
}: {
  icon: React.ReactNode
  headline: string
  body: string
  action: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex gap-3 rounded-xl bg-muted p-4">
      <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-card text-secondary-strong">{icon}</span>
      <div className="flex min-w-0 flex-col items-start gap-2">
        <p className="font-display text-base font-semibold text-foreground">{headline}</p>
        <p className="text-sm text-foreground">{body}</p>
        <button type="button" onClick={action.onClick} className={SECONDARY}>
          {action.label}
        </button>
      </div>
    </div>
  )
}
