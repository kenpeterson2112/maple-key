"use client"

import { useState } from "react"
import { AlertTriangle, ChevronRight, ChevronDown } from "lucide-react"
import {
  describeCode,
  overallTitle,
  hasStrandLabel,
  strandCodeOf,
  strandLabel,
} from "@/lib/curriculum-codes"
import { useCurriculumText } from "@/lib/curriculum-text"
import { LEVEL_ORDER, LEVEL_META, type ProficiencyLevel } from "@/lib/assessment-types"
import { READINESS_TOKENS, pillSurface, pillText } from "@/components/ui/readiness-pill"
import { isGap } from "@/lib/expectation-status"
import {
  computeReadinessLevel,
  type AggregatedResults,
  type LevelCounts,
  type OverallAggregate,
} from "@/lib/assessment-results"

// Quick Check results: the class's levels by strand, overall and specific
// expectation. Like Progress, it keeps the curriculum's own order and flags a
// gap with the shared rule (expectation-status.ts); it describes, it never
// ranks by urgency or tells the teacher what to do (CLAUDE.md).

function total(counts: LevelCounts): number {
  return counts.level1 + counts.level2 + counts.level3 + counts.level4
}

function emptyCounts(): LevelCounts {
  return { level1: 0, level2: 0, level3: 0, level4: 0 }
}

function sumCounts(items: LevelCounts[]): LevelCounts {
  const out = emptyCounts()
  for (const c of items) {
    out.level1 += c.level1
    out.level2 += c.level2
    out.level3 += c.level3
    out.level4 += c.level4
  }
  return out
}

const byCode = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

// Text color for the percentage labels rendered inside each bar segment. The
// signal fills are the same in both modes, so these are too: white reads best
// on levels 1 and 4, the signal's own foreground on the pale levels 2 and 3.
const ON_BAR_TEXT: Record<ProficiencyLevel, string> = {
  level1: "text-white",
  level2: "text-signal-2-foreground",
  level3: "text-signal-3-foreground",
  level4: "text-white",
}

function ReadinessBadge({ counts }: { counts: LevelCounts }) {
  if (total(counts) === 0) return <span className="text-[11px] font-medium text-muted-foreground">No data</span>
  const meta = READINESS_TOKENS[computeReadinessLevel(counts)]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
      style={{ ...pillSurface(meta.token), color: pillText(meta.token) }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: `var(${meta.token})` }} />
      {meta.label}
    </span>
  )
}

// Single inline stacked bar split into the 4 signal-level segments.
function Bar({ counts, thick = false }: { counts: LevelCounts; thick?: boolean }) {
  const t = total(counts)
  const h = thick ? "h-3.5" : "h-2.5"
  if (t === 0) return <div className={`${h} w-full rounded-full bg-muted`} />
  return (
    <div className={`flex ${h} w-full overflow-hidden rounded-full bg-muted`}>
      {LEVEL_ORDER.map((level) => {
        const value = counts[level]
        if (!value) return null
        const pct = (value / t) * 100
        return (
          <div
            key={level}
            className={`flex items-center justify-center overflow-hidden ${LEVEL_META[level].barClass}`}
            style={{ width: `${pct}%` }}
          >
            {pct >= 15 && (
              <span className={`text-[10px] font-bold leading-none whitespace-nowrap ${ON_BAR_TEXT[level]}`}>
                {Math.round(pct)}%
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function LevelSummary({ counts }: { counts: LevelCounts }) {
  const entries = LEVEL_ORDER.filter((level) => counts[level] > 0)
  if (entries.length === 0) return null
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
      {entries.map((level) => (
        <span key={level} className={`font-medium ${LEVEL_META[level].textClass}`}>
          {counts[level]} at {LEVEL_META[level].label}
        </span>
      ))}
    </p>
  )
}

/** A gap, in the same words as Progress: "7 of 10 responses at Level 1–2". */
function GapNote({ counts }: { counts: LevelCounts }) {
  if (!isGap(counts)) return null
  return (
    <p className="flex items-center gap-1 text-xs font-semibold text-foreground">
      <AlertTriangle size={14} className="flex-shrink-0 text-pop-strong" aria-hidden="true" />
      {counts.level1 + counts.level2} of {total(counts)} responses at Level 1–2
    </p>
  )
}

function SpecificRow({ code, counts, subject, grade }: { code: string; counts: LevelCounts; subject: string; grade?: string }) {
  useCurriculumText(subject, grade)
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 rounded-full border border-border bg-card px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground mt-px">
          {code}
        </span>
        <p className="text-xs leading-snug text-foreground flex-1">
          {describeCode(subject, code, grade) ?? code}
        </p>
      </div>
      <Bar counts={counts} />
      <GapNote counts={counts} />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <LevelSummary counts={counts} />
      </div>
    </div>
  )
}

function OverallRow({
  agg,
  expanded,
  onToggle,
  nested,
  subject,
  grade,
}: {
  agg: OverallAggregate
  expanded: boolean
  onToggle: () => void
  nested: boolean
  subject: string
  grade?: string
}) {
  const specifics = Object.entries(agg.specifics).sort(([a], [b]) => byCode(a, b))
  return (
    <div className={nested ? "rounded-lg border border-border bg-card overflow-hidden" : "rounded-xl border border-border bg-card overflow-hidden"}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 max-sm:basis-full">
          {expanded ? (
            <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
          )}
          <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
            {agg.overall}
          </span>
          <span className="text-sm font-semibold text-foreground truncate">{overallTitle(subject, agg.overall, grade)}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 max-sm:w-full">
          <span className="text-[11px] text-muted-foreground">
            {total(agg.bands)} {total(agg.bands) === 1 ? "response" : "responses"}
          </span>
          <div className="w-32 sm:w-44 max-sm:w-auto max-sm:min-w-0 max-sm:flex-1"><Bar counts={agg.bands} /></div>
          <ReadinessBadge counts={agg.bands} />
        </div>
      </button>

      {isGap(agg.bands) && (
        <div className="px-4 pb-3">
          <GapNote counts={agg.bands} />
        </div>
      )}

      {expanded && (
        <div className="border-t border-border divide-y divide-border bg-muted">
          {specifics.map(([code, counts]) => (
            <SpecificRow key={code} code={code} counts={counts} subject={subject} grade={grade} />
          ))}
          {/* An option, not a suggestion: the full picture for this overall. */}
          <div className="px-4 py-2.5">
            <a
              href={`#progress/${encodeURIComponent(agg.overall)}`}
              className="inline-flex min-h-8 items-center gap-1 rounded text-xs font-semibold text-secondary-strong underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              See {agg.overall} on Progress
              <ChevronRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function StrandAccordion({
  overalls,
  expanded,
  toggle,
  subject,
  grade,
}: {
  overalls: OverallAggregate[]
  expanded: Set<string>
  toggle: (key: string) => void
  subject: string
  grade?: string
}) {
  const groups = new Map<string, OverallAggregate[]>()
  for (const agg of overalls) {
    const code = strandCodeOf(agg.overall)
    const arr = groups.get(code)
    if (arr) arr.push(agg)
    else groups.set(code, [agg])
  }

  const strands = Array.from(groups.entries())
    .map(([code, children]) => ({ code, children, bands: sumCounts(children.map((c) => c.bands)) }))
    .sort((a, b) => byCode(a.code, b.code))

  return (
    <div className="space-y-3">
      {strands.map((strand) => {
        const key = `strand:${strand.code}`
        const isOpen = expanded.has(key)
        return (
          <div key={key} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => toggle(key)}
              aria-expanded={isOpen}
              className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 max-sm:basis-full">
                {isOpen ? (
                  <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                )}
                <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">
                  {strand.code}
                </span>
                <span className="text-sm font-semibold text-foreground truncate">{strandLabel(subject, strand.code, grade)}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 max-sm:w-full">
                <span className="text-[11px] text-muted-foreground">
                  {total(strand.bands)} {total(strand.bands) === 1 ? "response" : "responses"}
                </span>
                <div className="w-32 sm:w-44 max-sm:w-auto max-sm:min-w-0 max-sm:flex-1"><Bar counts={strand.bands} thick /></div>
                <ReadinessBadge counts={strand.bands} />
              </div>
            </button>

            {isGap(strand.bands) && (
              <div className="px-4 pb-3">
                <GapNote counts={strand.bands} />
              </div>
            )}

            {isOpen && (
              <div className="border-t border-border bg-muted px-2 py-2 space-y-2">
                {strand.children.map((agg) => {
                  const overallKey = `overall:${agg.overall}`
                  return (
                    <OverallRow
                      key={agg.overall}
                      agg={agg}
                      expanded={expanded.has(overallKey)}
                      onToggle={() => toggle(overallKey)}
                      nested
                      subject={subject}
                      grade={grade}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ClassDashboard({
  data,
  subject,
  grade,
  caption,
}: {
  data: AggregatedResults | null
  subject: string
  grade?: string
  caption?: string
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  if (!data?.hasData) return null

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const overalls = Object.values(data.overall).sort((a, b) => byCode(a.overall, b.overall))
  const hasStrandData = overalls.some((agg) => hasStrandLabel(subject, strandCodeOf(agg.overall), grade))

  return (
    <div className="space-y-3">
      {caption && <p className="text-[11px] font-medium text-muted-foreground">{caption}</p>}
      {hasStrandData ? (
        <StrandAccordion overalls={overalls} expanded={expanded} toggle={toggle} subject={subject} grade={grade} />
      ) : (
        <div className="space-y-3">
          {overalls.map((agg) => {
            const key = `overall:${agg.overall}`
            return (
              <OverallRow
                key={agg.overall}
                agg={agg}
                expanded={expanded.has(key)}
                onToggle={() => toggle(key)}
                nested={false}
                subject={subject}
                grade={grade}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
