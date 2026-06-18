"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, Flag } from "lucide-react"
import {
  describeCode,
  overallTitle,
  hasStrandLabel,
  strandCodeOf,
  strandLabel,
} from "@/lib/curriculum-codes"
import { LEVEL_ORDER, LEVEL_META, type ProficiencyLevel } from "@/lib/assessment-types"
import {
  computeReadinessLevel,
  type AggregatedResults,
  type LevelCounts,
  type OverallAggregate,
  type ReadinessLevel,
} from "@/lib/assessment-results"

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

// Sort order: highest share of level1 (most urgent), lowest share of level4, first.
function urgencyScore(counts: LevelCounts): number {
  const t = total(counts)
  if (t === 0) return -1
  return counts.level1 / t - counts.level4 / t
}

const SHORT_LABEL: Record<ProficiencyLevel, string> = {
  level1: "needs critical attention",
  level2: "approaching",
  level3: "meeting",
  level4: "surpassing",
}

// Text color for the percentage labels rendered inside each bar segment.
const ON_BAR_TEXT: Record<ProficiencyLevel, string> = {
  level1: "text-white",
  level2: "text-stone-700",
  level3: "text-stone-700",
  level4: "text-white",
}

const READINESS_META: Record<ReadinessLevel, { label: string; dot: string; bg: string; fg: string }> = {
  great: { label: "Excelling", dot: "#166534", bg: "#DCFCE7", fg: "#14532D" },
  good: { label: "Strong", dot: "#16A34A", bg: "#F0FDF4", fg: "#15803D" },
  okay: { label: "Developing", dot: "#D97706", bg: "#FFFBEB", fg: "#B45309" },
  poor: { label: "Needs attention", dot: "#B45309", bg: "#FEF3C7", fg: "#92400E" },
}

function ReadinessBadge({ counts }: { counts: LevelCounts }) {
  if (total(counts) === 0) return <span className="text-[11px] font-medium text-[#A8998E]">No data</span>
  const meta = READINESS_META[computeReadinessLevel(counts)]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
      style={{ backgroundColor: meta.bg, color: meta.fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: meta.dot }} />
      {meta.label}
    </span>
  )
}

// Single inline stacked bar split into the 4 signal-level segments.
function Bar({ counts, thick = false }: { counts: LevelCounts; thick?: boolean }) {
  const t = total(counts)
  const h = thick ? "h-3.5" : "h-2.5"
  if (t === 0) return <div className={`${h} w-full rounded-full bg-stone-100`} />
  return (
    <div className={`flex ${h} w-full overflow-hidden rounded-full bg-stone-100`}>
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
          {counts[level]}&nbsp;{SHORT_LABEL[level]}
        </span>
      ))}
    </p>
  )
}

function SpecificRow({ code, counts, subject, grade }: { code: string; counts: LevelCounts; subject: string; grade?: string }) {
  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 rounded-full border border-[#E8D5C4] bg-white px-1.5 py-0.5 text-[11px] font-bold text-stone-600 mt-px">
          {code}
        </span>
        <p className="text-xs leading-snug text-[#555] flex-1">
          {describeCode(subject, code, grade) ?? code}
        </p>
      </div>
      <Bar counts={counts} />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <LevelSummary counts={counts} />
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E8D5C4] bg-white px-2.5 py-1 text-[11px] font-medium text-[#8B4513] transition-colors hover:bg-[#FFF5ED] flex-shrink-0"
        >
          <Flag size={12} />
          Flag for re-teaching
        </button>
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
  const specifics = Object.entries(agg.specifics).sort(([a], [b]) => a.localeCompare(b))
  return (
    <div className={nested ? "rounded-lg border border-[#F0E6D8] bg-white overflow-hidden" : "rounded-xl border border-[#E8D5C4] bg-white overflow-hidden"}>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {expanded ? (
            <ChevronDown size={16} className="text-[#A8998E] flex-shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-[#A8998E] flex-shrink-0" />
          )}
          <span className="flex-shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">
            {agg.overall}
          </span>
          <span className="text-sm font-semibold text-[#2C2C2C] truncate">{overallTitle(subject, agg.overall, grade)}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] text-[#888]">
            {total(agg.bands)} {total(agg.bands) === 1 ? "response" : "responses"}
          </span>
          <div className="w-32 sm:w-44"><Bar counts={agg.bands} /></div>
          <ReadinessBadge counts={agg.bands} />
        </div>
      </button>

      {expanded && specifics.length > 0 && (
        <div className="border-t border-[#F0E6D8] divide-y divide-[#F5EDE4] bg-[#FDFAF4]">
          {specifics.map(([code, counts]) => (
            <SpecificRow key={code} code={code} counts={counts} subject={subject} grade={grade} />
          ))}
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
    .sort((a, b) => urgencyScore(b.bands) - urgencyScore(a.bands) || a.code.localeCompare(b.code))

  return (
    <div className="space-y-3">
      {strands.map((strand) => {
        const key = `strand:${strand.code}`
        const isOpen = expanded.has(key)
        return (
          <div key={key} className="rounded-xl border border-[#E8D5C4] bg-white overflow-hidden">
            <button onClick={() => toggle(key)} className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {isOpen ? (
                  <ChevronDown size={16} className="text-[#A8998E] flex-shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-[#A8998E] flex-shrink-0" />
                )}
                <span className="flex-shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">
                  {strand.code}
                </span>
                <span className="text-sm font-semibold text-[#2C2C2C] truncate">{strandLabel(subject, strand.code, grade)}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[11px] text-[#888]">
                  {total(strand.bands)} {total(strand.bands) === 1 ? "response" : "responses"}
                </span>
                <div className="w-32 sm:w-44"><Bar counts={strand.bands} thick /></div>
                <ReadinessBadge counts={strand.bands} />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-[#F0E6D8] bg-[#FDFAF4] px-2 py-2 space-y-2">
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

  const overalls = Object.values(data.overall).sort(
    (a, b) => urgencyScore(b.bands) - urgencyScore(a.bands) || a.overall.localeCompare(b.overall)
  )
  const hasStrandData = overalls.some((agg) => hasStrandLabel(subject, strandCodeOf(agg.overall), grade))

  return (
    <div className="space-y-3">
      {caption && <p className="text-[11px] font-medium text-[#888]">{caption}</p>}
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
