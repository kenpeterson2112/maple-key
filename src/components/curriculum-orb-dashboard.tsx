import { useMemo, useState } from "react"
import { ChevronRight, ChevronDown } from "lucide-react"
import {
  buildOverallCoverage,
  buildStrandCoverage,
  type LessonTally,
  type CoverageNode,
  type SpecificCoverage,
} from "@/lib/assessment-results"
import { strandCodeOf, describeCode } from "@/lib/curriculum-codes"
import { urgencyScore } from "@/lib/orb-math"
import ProficiencyOrb from "@/components/ui/proficiency-orb"
import CurriculumOrbDetailModal from "@/components/curriculum-orb-detail-modal"

interface ModalTarget {
  code: string
  title: string
  description?: string
  bands: CoverageNode["bands"] | SpecificCoverage["counts"]
  coverageFraction: number
}

function sortByUrgency(nodes: CoverageNode[]): CoverageNode[] {
  return [...nodes].sort((a, b) => urgencyScore(b) - urgencyScore(a) || a.code.localeCompare(b.code, undefined, { numeric: true }))
}

function TiersToggle({ checked, onChange }: { checked: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
    >
      <span className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full px-0.5 transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
        <span
          className={`h-3 w-3 rounded-full bg-card transition-transform ${checked ? "translate-x-3" : "translate-x-0"}`}
        />
      </span>
      Show Performance Tiers
    </button>
  )
}

function SpecificCell({
  spec,
  showTiers,
  onSelect,
}: {
  spec: SpecificCoverage
  showTiers: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-center gap-1 rounded-lg p-1 text-center transition-colors hover:bg-muted/50"
      aria-label={`${spec.code} — ${spec.assessed ? "assessed" : "not yet assessed"}`}
    >
      <ProficiencyOrb bands={spec.counts} coverageFraction={spec.assessed ? 1 : 0} showTiers={showTiers} size="sm" />
      <span className="text-[11px] font-semibold text-muted-foreground">{spec.code}</span>
    </button>
  )
}

function OverallRow({
  node,
  expanded,
  onToggle,
  showTiers,
  onSelect,
  onSelectSpecific,
}: {
  node: CoverageNode
  expanded: boolean
  onToggle: () => void
  showTiers: boolean
  onSelect: () => void
  onSelectSpecific: (spec: SpecificCoverage) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 px-3 py-2">
        <button type="button" onClick={onSelect} className="flex-shrink-0" aria-label={`${node.code} details`}>
          <ProficiencyOrb bands={node.bands} coverageFraction={node.coverageFraction} showTiers={showTiers} size="md" />
        </button>
        <button type="button" onClick={onToggle} className="flex flex-1 items-center gap-2 text-left" aria-expanded={expanded}>
          {expanded ? <ChevronDown size={16} className="flex-shrink-0 text-muted-foreground" /> : <ChevronRight size={16} className="flex-shrink-0 text-muted-foreground" />}
          <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{node.code}</span>
          <span className="truncate text-sm font-semibold text-foreground">{node.label}</span>
        </button>
      </div>

      {expanded && (
        <div className="flex flex-wrap gap-1 border-t border-border bg-muted/30 px-3 py-2">
          {node.specifics.map((spec) => (
            <SpecificCell key={spec.code} spec={spec} showTiers={showTiers} onSelect={() => onSelectSpecific(spec)} />
          ))}
        </div>
      )}
    </div>
  )
}

function StrandRow({
  node,
  overalls,
  subject,
  expanded,
  toggle,
  showTiers,
  onSelect,
  onSelectSpecific,
}: {
  node: CoverageNode
  overalls: CoverageNode[]
  subject: string
  expanded: Set<string>
  toggle: (key: string) => void
  showTiers: boolean
  onSelect: (target: ModalTarget) => void
  onSelectSpecific: (target: ModalTarget) => void
}) {
  const key = `strand:${node.code}`
  const isOpen = expanded.has(key)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onSelect({ code: node.code, title: node.label, bands: node.bands, coverageFraction: node.coverageFraction })}
          className="flex-shrink-0"
          aria-label={`${node.code} details`}
        >
          <ProficiencyOrb bands={node.bands} coverageFraction={node.coverageFraction} showTiers={showTiers} size="lg" />
        </button>
        <button type="button" onClick={() => toggle(key)} className="flex flex-1 items-center gap-2 text-left" aria-expanded={isOpen}>
          {isOpen ? <ChevronDown size={18} className="flex-shrink-0 text-muted-foreground" /> : <ChevronRight size={18} className="flex-shrink-0 text-muted-foreground" />}
          <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{node.code}</span>
          <span className="truncate text-base font-semibold text-foreground">{node.label}</span>
        </button>
      </div>

      {isOpen && (
        <div className="space-y-2 border-t border-border bg-muted/20 p-2">
          {overalls.map((overall) => {
            const overallKey = `overall:${overall.code}`
            return (
              <OverallRow
                key={overall.code}
                node={overall}
                expanded={expanded.has(overallKey)}
                onToggle={() => toggle(overallKey)}
                showTiers={showTiers}
                onSelect={() => onSelect({ code: overall.code, title: overall.label, bands: overall.bands, coverageFraction: overall.coverageFraction })}
                onSelectSpecific={(spec) =>
                  onSelectSpecific({
                    code: spec.code,
                    title: overall.label,
                    description: describeCode(subject, spec.code),
                    bands: spec.counts,
                    coverageFraction: spec.assessed ? 1 : 0,
                  })
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CurriculumOrbDashboard({ tallies }: { tallies: LessonTally[] }) {
  const [showTiers, setShowTiers] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalTarget | null>(null)

  // Tallies handed to this dashboard are already filtered to a single subject, so
  // any tally's subject is the subject for labelling.
  const subject = tallies[0]?.subject ?? ""
  const overallNodes = useMemo(() => buildOverallCoverage(tallies, subject), [tallies, subject])
  const strandNodes = useMemo(() => sortByUrgency(buildStrandCoverage(overallNodes, subject)), [overallNodes, subject])

  if (overallNodes.length === 0) return null

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expectation Breakdown</p>
        <TiersToggle checked={showTiers} onChange={setShowTiers} />
      </div>

      <div className="space-y-3">
        {strandNodes.map((strand) => {
          const overalls = sortByUrgency(overallNodes.filter((n) => strandCodeOf(n.code) === strand.code))
          return (
            <StrandRow
              key={strand.code}
              node={strand}
              overalls={overalls}
              subject={subject}
              expanded={expanded}
              toggle={toggle}
              showTiers={showTiers}
              onSelect={setModal}
              onSelectSpecific={setModal}
            />
          )
        })}
      </div>

      {modal && (
        <CurriculumOrbDetailModal
          open
          onOpenChange={(open) => !open && setModal(null)}
          code={modal.code}
          title={modal.title}
          description={modal.description}
          bands={modal.bands}
          coverageFraction={modal.coverageFraction}
          showTiers={showTiers}
        />
      )}
    </div>
  )
}
