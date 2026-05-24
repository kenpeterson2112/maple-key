import { useState } from "react"
import { ChevronDown, ChevronRight, Users } from "lucide-react"
import { CURRICULUM_DESCRIPTIONS, overallLabel } from "@/lib/curriculum-codes"
import { BAND_META, BAND_ORDER } from "@/lib/assessment-types"
import type { AggregatedResults, BandCounts } from "@/lib/assessment-results"

function total(counts: BandCounts): number {
  return counts.strong + counts.needsSupport
}

function DistributionBar({ counts }: { counts: BandCounts }) {
  const t = total(counts)
  if (t === 0) return <div className="h-2.5 rounded-full bg-stone-100" />
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-100">
      {BAND_ORDER.map((band) => {
        const value = counts[band]
        if (value === 0) return null
        return <div key={band} className={BAND_META[band].barClass} style={{ width: `${(value / t) * 100}%` }} />
      })}
    </div>
  )
}

function overallRead(counts: BandCounts): string {
  const t = total(counts)
  if (t === 0) return "Not yet assessed"
  const strongShare = counts.strong / t
  if (strongShare >= 0.67) return "Most of the class shows a strong grasp"
  if (strongShare <= 0.33) return "Several students need more support"
  return "Mixed understanding across the class"
}

export default function ClassDashboard({ data }: { data: AggregatedResults }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const overalls = Object.values(data.overall).sort((a, b) => a.overall.localeCompare(b.overall))

  if (!data.hasData || overalls.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#E8D5C4] bg-white p-8 text-center">
        <Users size={28} className="mx-auto mb-3 text-[#A8998E]" />
        <p className="text-sm font-medium text-[#2C2C2C]">No results recorded yet</p>
        <p className="mt-1 text-xs text-[#888]">Record a few students&apos; quick checks to see the class signal.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {overalls.map((agg) => {
        const isOpen = expanded[agg.overall] ?? false
        const specifics = Object.entries(agg.specifics).sort((a, b) => a[0].localeCompare(b[0]))
        return (
          <div key={agg.overall} className="overflow-hidden rounded-xl border border-[#E8D5C4] bg-white">
            <button
              onClick={() => setExpanded((p) => ({ ...p, [agg.overall]: !isOpen }))}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FAF3E0]"
            >
              {isOpen ? (
                <ChevronDown size={16} className="flex-shrink-0 text-[#A8998E]" />
              ) : (
                <ChevronRight size={16} className="flex-shrink-0 text-[#A8998E]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700">{agg.overall}</span>
                  <span className="truncate text-sm font-semibold text-[#2C2C2C]">{overallLabel(agg.overall)}</span>
                </div>
                <DistributionBar counts={agg.bands} />
                <p className="mt-1.5 text-xs text-[#888]">{overallRead(agg.bands)}</p>
              </div>
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-[#F0E6D8] bg-[#FDFAF4] px-4 py-3">
                {specifics.map(([code, counts]) => (
                  <div key={code}>
                    <div className="mb-1.5 flex items-start gap-2">
                      <span className="flex-shrink-0 rounded-full border border-[#E8D5C4] bg-white px-1.5 py-0.5 text-[11px] font-bold text-stone-700">
                        {code}
                      </span>
                      <span className="text-xs leading-snug text-[#666]">{CURRICULUM_DESCRIPTIONS[code] ?? code}</span>
                    </div>
                    <DistributionBar counts={counts} />
                    <p className="mt-1.5 text-xs">
                      <span className={`font-semibold ${BAND_META.strong.textClass}`}>{counts.strong}</span>
                      <span className="text-[#888]"> students {BAND_META.strong.phrase} · </span>
                      <span className={`font-semibold ${BAND_META.needsSupport.textClass}`}>{counts.needsSupport}</span>
                      <span className="text-[#888]"> {BAND_META.needsSupport.phrase}</span>
                    </p>
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
