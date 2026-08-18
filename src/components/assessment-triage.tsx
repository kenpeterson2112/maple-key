import { useMemo } from "react"
import { AlertTriangle, ArrowRight, CircleHelp, Search } from "lucide-react"
import type { CoverageNode, LessonTally } from "@/lib/assessment-results"
import { buildTriage, MOVE_META, type TriageItem } from "@/lib/triage"
import { describeCode, overallCodeOf, overallTitle } from "@/lib/curriculum-codes"
import EvidenceCapsule from "@/components/ui/evidence-capsule"

interface AssessmentTriageProps {
  nodes: CoverageNode[]
  latest: LessonTally | null
  subject: string
  grade: string
  onFindResources: (code: string) => void
}

function relativeDay(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days <= 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  return new Date(ts).toLocaleDateString("en-CA", { month: "short", day: "numeric" })
}

function TriageRow({
  item,
  subject,
  grade,
  onFindResources,
}: {
  item: TriageItem
  subject: string
  grade: string
  onFindResources: (code: string) => void
}) {
  // Specific-expectation descriptions exist for only a few subjects, so fall
  // back to the overall's title (itself degrading to the strand name, then the
  // bare code) rather than printing a placeholder word on every Science row.
  const description = describeCode(subject, item.code, grade) ?? overallTitle(subject, overallCodeOf(item.code), grade)
  const meta = MOVE_META[item.move]

  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
          {item.code}
        </span>
        <span className="flex-1 text-sm font-medium leading-snug text-foreground">
          {description}
        </span>
        <span className="flex-shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-foreground">
          {meta.label}
        </span>
      </div>

      <EvidenceCapsule bands={item.counts} evidence={item.evidence} className="mt-2" />

      <p className="mt-1 text-xs leading-snug text-muted-foreground">{meta.blurb}</p>

      {item.hedge && (
        <p className="mt-1 flex items-start gap-1.5 text-xs leading-snug text-signal-1-foreground">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
          {item.hedge}
        </p>
      )}

      <button
        type="button"
        onClick={() => onFindResources(item.code)}
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
      >
        <Search size={12} />
        Find resources for {item.code}
      </button>
    </li>
  )
}

/**
 * The between-periods view: what today's check said, what needs a teaching
 * move, and what was taught but never checked.
 *
 * Deliberately absent: any percentage of the curriculum "covered". Coverage
 * here can only be measured against what our own lessons declared they taught,
 * not against the Ontario curriculum as a whole, and a progress bar reading
 * "57% covered" would state something the data cannot support.
 */
export default function AssessmentTriage({ nodes, latest, subject, grade, onFindResources }: AssessmentTriageProps) {
  const { attention, unchecked, onTrack } = useMemo(() => buildTriage(nodes), [nodes])

  if (attention.length === 0 && unchecked.length === 0 && onTrack.length === 0) return null

  return (
    <section className="space-y-4">
      {latest && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest quick check</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{latest.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {relativeDay(latest.updatedAt)} · {latest.attempts} {latest.attempts === 1 ? "response" : "responses"}
            {latest.events !== undefined && latest.events !== latest.attempts && (
              <> · {latest.events} {latest.events === 1 ? "entry" : "entries"}</>
            )}
          </p>
        </div>
      )}

      {attention.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
            Needs a teaching move ({attention.length})
          </p>
          <ul className="space-y-2">
            {attention.map((item) => (
              <TriageRow key={item.code} item={item} subject={subject} grade={grade} onFindResources={onFindResources} />
            ))}
          </ul>
        </div>
      )}

      {unchecked.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleHelp size={13} />
            Taught but never checked ({unchecked.length})
          </p>
          <ul className="space-y-2">
            {unchecked.map((item) => (
              <li key={item.code} className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-card px-3 py-2">
                <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  {item.code}
                </span>
                <span className="flex-1 truncate text-sm text-foreground">
                  {describeCode(subject, item.code, grade) ?? overallTitle(subject, overallCodeOf(item.code), grade)}
                </span>
                <button
                  type="button"
                  onClick={() => onFindResources(item.code)}
                  className="flex-shrink-0 text-xs font-semibold text-primary"
                  aria-label={`Find resources for ${item.code}`}
                >
                  <ArrowRight size={14} />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Run a quick check from the lesson that taught these to get evidence either way.
          </p>
        </div>
      )}

      {onTrack.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {onTrack.length} {onTrack.length === 1 ? "expectation is" : "expectations are"} clear to move on from.
        </p>
      )}
    </section>
  )
}
