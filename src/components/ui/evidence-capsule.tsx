import { useId, useMemo } from "react"
import type { Evidence, LevelCounts } from "@/lib/assessment-results"
import { evidenceStrength } from "@/lib/assessment-results"
import { levelProportions, totalOf } from "@/lib/orb-math"

export type CapsuleSize = "sm" | "md"

const BAR_HEIGHT: Record<CapsuleSize, number> = { sm: 8, md: 12 }

const SIGNAL_VAR = ["var(--signal-1)", "var(--signal-2)", "var(--signal-3)", "var(--signal-4)"] as const

interface EvidenceCapsuleProps {
  bands: LevelCounts
  evidence: Evidence
  size?: CapsuleSize
  /** Hide the count line when a parent row already states it. */
  showLabel?: boolean
  className?: string
}

// Only name the entry count when it diverges from the response count — that is
// exactly when the two mean different things (group entry was used) and the
// teacher needs to know the number rests on fewer answer sets than students.
export function describeEvidence(evidence: Evidence): string {
  const strength = evidenceStrength(evidence)
  if (strength === "none") return "Not yet checked"
  const responses = `${evidence.responses} ${evidence.responses === 1 ? "response" : "responses"}`
  if (strength === "unknown") return `${responses} · evidence unknown`
  if (evidence.events === evidence.responses) return responses
  return `${responses} · ${evidence.events} ${evidence.events === 1 ? "entry" : "entries"}`
}

function evidenceSentence(evidence: Evidence): string {
  const strength = evidenceStrength(evidence)
  if (strength === "none") return "Not yet checked."
  if (strength === "unknown") return `${evidence.responses} responses recorded before entries were tracked, so how independent they are is unknown.`
  const entries = `${evidence.events} separate ${evidence.events === 1 ? "entry" : "entries"}`
  if (strength === "thin") return `${evidence.responses} responses from ${entries} — thin evidence.`
  if (strength === "medium") return `${evidence.responses} responses from ${entries}.`
  return `${evidence.responses} responses from ${entries} — strong evidence.`
}

/**
 * Proficiency mix, coverage, and evidence strength in one row.
 *
 * The mix is a left-to-right segmented bar (level 1 → level 4). Whether the
 * expectation was checked at all is carried by the bar's own treatment —
 * dashed and empty when taught but never assessed — rather than a separate
 * indicator. Evidence strength hatches the bar: a result resting on one or two
 * answer sets reads as provisional at a glance, which matters most for group
 * entry, where a single tap can carry a whole class's worth of responses.
 */
export default function EvidenceCapsule({
  bands,
  evidence,
  size = "md",
  showLabel = true,
  className,
}: EvidenceCapsuleProps) {
  const id = useId()
  const hatchId = `capsule-hatch-${id}`
  const height = BAR_HEIGHT[size]
  const strength = evidenceStrength(evidence)
  const assessed = totalOf(bands) > 0

  const segments = useMemo(() => {
    const props = levelProportions(bands)
    let x = 0
    return ([1, 2, 3, 4] as const).map((n) => {
      const width = props[`level${n}` as keyof typeof props] * 100
      const seg = { x, width, fill: SIGNAL_VAR[n - 1] }
      x += width
      return seg
    })
  }, [bands])

  const provisional = strength === "thin" || strength === "unknown"

  return (
    <div className={className}>
      <svg
        width="100%"
        height={height}
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        role="img"
        aria-label={evidenceSentence(evidence)}
        className="block"
      >
        <title>{evidenceSentence(evidence)}</title>
        <defs>
          <clipPath id={`${hatchId}-clip`}>
            <rect x="0" y="0" width="100" height="10" rx="5" ry="5" />
          </clipPath>
          {provisional && (
            <pattern id={hatchId} width="3" height="10" patternUnits="userSpaceOnUse" patternTransform="skewX(-20)">
              <rect x="0" y="0" width="1.2" height="10" fill="var(--card)" opacity="0.55" />
            </pattern>
          )}
        </defs>

        {assessed ? (
          <g clipPath={`url(#${hatchId}-clip)`}>
            {segments.map((seg, i) => (
              <rect key={i} x={seg.x} y="0" width={seg.width} height="10" fill={seg.fill} />
            ))}
            {provisional && <rect x="0" y="0" width="100" height="10" fill={`url(#${hatchId})`} />}
          </g>
        ) : (
          // Taught but never checked — an empty outline, not a zero score.
          <rect
            x="0.5"
            y="0.5"
            width="99"
            height="9"
            rx="4.5"
            ry="4.5"
            fill="var(--muted)"
            fillOpacity="0.4"
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        )}
      </svg>

      {showLabel && (
        <p className={`mt-1 text-[11px] font-medium ${provisional ? "text-signal-1-foreground" : "text-muted-foreground"}`}>
          {describeEvidence(evidence)}
        </p>
      )}
    </div>
  )
}
