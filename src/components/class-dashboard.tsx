"use client"

import { CURRICULUM_DESCRIPTIONS, overallLabel } from "@/lib/curriculum-codes"
import { BAND_META } from "@/lib/assessment-types"
import type { AggregatedResults, BandCounts } from "@/lib/assessment-results"

function total(counts: BandCounts): number {
  return counts.strong + (counts.developing ?? 0) + counts.needsSupport
}

// Sort overalls: most urgent (highest needsSupport share) first
function urgencyScore(counts: BandCounts): number {
  const t = total(counts)
  if (t === 0) return -1
  return counts.needsSupport / t - counts.strong / t
}

function ReadinessBadge({ counts }: { counts: BandCounts }) {
  const t = total(counts)
  if (t === 0) return <span className="text-[11px] font-medium text-[#A8998E]">No data</span>
  const strongRatio = counts.strong / t
  const needsRatio = counts.needsSupport / t

  let label: string, dot: string, bg: string, fg: string
  if (strongRatio >= 0.8) {
    label = "Excelling"; dot = "#166534"; bg = "#DCFCE7"; fg = "#14532D"
  } else if (strongRatio >= 0.5) {
    label = "Strong"; dot = "#16A34A"; bg = "#F0FDF4"; fg = "#15803D"
  } else if (needsRatio >= 0.5) {
    label = "Needs attention"; dot = "#B45309"; bg = "#FEF3C7"; fg = "#92400E"
  } else {
    label = "Developing"; dot = "#D97706"; bg = "#FFFBEB"; fg = "#B45309"
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0"
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
      {label}
    </span>
  )
}

function Bar({ counts, thick = false }: { counts: BandCounts; thick?: boolean }) {
  const t = total(counts)
  const h = thick ? "h-3.5" : "h-2"
  if (t === 0) return <div className={`${h} w-full rounded-full bg-stone-100`} />
  return (
    <div className={`flex ${h} w-full overflow-hidden rounded-full bg-stone-100`}>
      {(["strong", "developing", "needsSupport"] as const).map((band) => {
        const value = counts[band]
        if (!value) return null
        return (
          <div
            key={band}
            className={BAND_META[band].barClass}
            style={{ width: `${(value / t) * 100}%` }}
          />
        )
      })}
    </div>
  )
}

function BandSummary({ counts }: { counts: BandCounts }) {
  const entries = (["strong", "developing", "needsSupport"] as const).filter(b => counts[b] > 0)
  if (entries.length === 0) return null
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mt-1.5">
      {entries.map(band => (
        <span key={band} className={`font-medium ${BAND_META[band].textClass}`}>
          {counts[band]}&nbsp;{band === "strong" ? "strong" : band === "developing" ? "developing" : "needs support"}
        </span>
      ))}
    </p>
  )
}

export default function ClassDashboard({ data }: { data: AggregatedResults }) {
  if (!data.hasData) return null

  const overalls = Object.values(data.overall).sort(
    (a, b) => urgencyScore(b.bands) - urgencyScore(a.bands) || a.overall.localeCompare(b.overall)
  )

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#8B4513]">Expectation Breakdown</p>

      {overalls.map((agg) => {
        const specifics = Object.entries(agg.specifics).sort(([a], [b]) => a.localeCompare(b))
        return (
          <div key={agg.overall} className="rounded-xl border border-[#E8D5C4] bg-white overflow-hidden">

            {/* Overall header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex-shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-600">
                    {agg.overall}
                  </span>
                  <span className="text-sm font-semibold text-[#2C2C2C] truncate">
                    {overallLabel(agg.overall)}
                  </span>
                </div>
                <ReadinessBadge counts={agg.bands} />
              </div>
              <Bar counts={agg.bands} thick />
              <BandSummary counts={agg.bands} />
            </div>

            {/* Specific expectations — always visible, no collapse */}
            {specifics.length > 0 && (
              <div className="border-t border-[#F0E6D8] divide-y divide-[#F5EDE4] bg-[#FDFAF4]">
                {specifics.map(([code, counts]) => (
                  <div key={code} className="px-4 py-3">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="flex-shrink-0 rounded-full border border-[#E8D5C4] bg-white px-1.5 py-0.5 text-[11px] font-bold text-stone-600 mt-px">
                        {code}
                      </span>
                      <p className="text-xs leading-snug text-[#555] line-clamp-2 flex-1">
                        {CURRICULUM_DESCRIPTIONS[code] ?? code}
                      </p>
                    </div>
                    <Bar counts={counts} />
                    <BandSummary counts={counts} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
