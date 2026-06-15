import { useId, useMemo } from "react"
import { motion } from "framer-motion"
import type { LevelCounts } from "@/lib/assessment-results"
import { levelProportions } from "@/lib/orb-math"

export type OrbSize = "sm" | "md" | "lg" | "xl"

export const SIZE_PX: Record<OrbSize, number> = { sm: 30, md: 55, lg: 80, xl: 160 }

const SIGNAL_VAR = ["var(--signal-1)", "var(--signal-2)", "var(--signal-3)", "var(--signal-4)"] as const

interface ProficiencyOrbProps {
  bands: LevelCounts
  /** Fraction (0..1) of the orb filled from the bottom — un-covered space stays muted at the top. */
  coverageFraction: number
  /** Smooth blended gradient (false) vs hard color bands (true). */
  showTiers: boolean
  size?: OrbSize | number
  className?: string
}

const TRANSITION = { duration: 0.5, ease: "easeOut" as const }

export default function ProficiencyOrb({ bands, coverageFraction, showTiers, size = "md", className }: ProficiencyOrbProps) {
  const id = useId()
  const clipId = `orb-clip-${id}`
  const px = typeof size === "number" ? size : SIZE_PX[size]
  const fraction = Math.max(0, Math.min(1, coverageFraction))

  // Cumulative proportions from the bottom of the orb (c1 <= c2 <= c3 <= 1).
  const { p1, p2, p3, p4, c1, c2, c3, top, height } = useMemo(() => {
    const props = levelProportions(bands)
    const c1 = props.level1
    const c2 = c1 + props.level2
    const c3 = c2 + props.level3
    const height = fraction * 100
    const top = 100 - height
    return { p1: props.level1, p2: props.level2, p3: props.level3, p4: props.level4, c1, c2, c3, top, height }
  }, [bands, fraction])

  return (
    <svg width={px} height={px} viewBox="0 0 100 100" className={className} role="img" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
        {!showTiers && (
          <linearGradient id={`${clipId}-gradient`} gradientUnits="objectBoundingBox" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={SIGNAL_VAR[0]} />
            <motion.stop animate={{ offset: c1 }} transition={TRANSITION} stopColor={SIGNAL_VAR[0]} />
            <motion.stop animate={{ offset: c1 }} transition={TRANSITION} stopColor={SIGNAL_VAR[1]} />
            <motion.stop animate={{ offset: c2 }} transition={TRANSITION} stopColor={SIGNAL_VAR[1]} />
            <motion.stop animate={{ offset: c2 }} transition={TRANSITION} stopColor={SIGNAL_VAR[2]} />
            <motion.stop animate={{ offset: c3 }} transition={TRANSITION} stopColor={SIGNAL_VAR[2]} />
            <motion.stop animate={{ offset: c3 }} transition={TRANSITION} stopColor={SIGNAL_VAR[3]} />
            <stop offset="1" stopColor={SIGNAL_VAR[3]} />
          </linearGradient>
        )}
      </defs>

      {/* Base circle: muted "not yet assessed" space */}
      <circle cx="50" cy="50" r="48" fill="var(--muted)" stroke="var(--border)" strokeWidth="2" opacity={fraction > 0 ? 1 : 0.6} />

      {/* Assessed fill, clipped to the orb's circular boundary, stacked bottom-up */}
      {fraction > 0 && (
        <g clipPath={`url(#${clipId})`}>
          {showTiers ? (
            <>
              <motion.rect x="0" width="100" fill={SIGNAL_VAR[0]} animate={{ y: top + (1 - c1) * height, height: p1 * height }} transition={TRANSITION} />
              <motion.rect x="0" width="100" fill={SIGNAL_VAR[1]} animate={{ y: top + (1 - c2) * height, height: p2 * height }} transition={TRANSITION} />
              <motion.rect x="0" width="100" fill={SIGNAL_VAR[2]} animate={{ y: top + (1 - c3) * height, height: p3 * height }} transition={TRANSITION} />
              <motion.rect x="0" width="100" fill={SIGNAL_VAR[3]} animate={{ y: top, height: p4 * height }} transition={TRANSITION} />
            </>
          ) : (
            <motion.rect x="0" width="100" fill={`url(#${clipId}-gradient)`} animate={{ y: top, height }} transition={TRANSITION} />
          )}
        </g>
      )}
    </svg>
  )
}
