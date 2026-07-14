"use client"

import { useState, useRef, useMemo } from "react"
import * as Popover from "@radix-ui/react-popover"
import { AnimatePresence, motion } from "framer-motion"
import { overallLabel } from "@/lib/curriculum-codes"
import {
  coverageForResource,
  type OverallCoverage,
  type LevelCounts,
  type ReadinessLevel,
} from "@/lib/assessment-results"

// Readiness levels map onto the shared signal-distribution tokens (--signal-1…4)
// rather than carrying their own hex, so the pills track the same proficiency
// scale used across the dashboards. See src/index.css.
export const READINESS_TOKENS: Record<ReadinessLevel, { token: string; label: string }> = {
  poor: { token: "--signal-1", label: "Needs Support" },
  okay: { token: "--signal-2", label: "Developing" },
  good: { token: "--signal-3", label: "Strong" },
  great: { token: "--signal-4", label: "Excelling" },
}

// The signal tokens are tuned as solid fills; on a light tinted pill we want a
// vivid dot, a faint background, and a darker readable label drawn from the same
// hue. color-mix keeps everything anchored to the one token.
export function pillSurface(varName: string) {
  return {
    borderColor: `color-mix(in oklch, var(${varName}) 35%, transparent)`,
    backgroundColor: `color-mix(in oklch, var(${varName}) 14%, transparent)`,
  }
}
export function pillText(varName: string) {
  return `color-mix(in oklch, var(${varName}) 70%, black)`
}

// One pill per overall expectation (e.g. "D1") the resource covers.
//
// When the class has recorded data for the overall, the pill is colored by the
// rolled-up readiness of its children, and hover (desktop) / tap (mobile) opens
// a portaled panel with the per-child color-coded breakdown.
//
// When there's no recorded data (data.level === null) — the common case until a
// class runs assessments — the pill is rendered as a neutral, non-interactive
// chip so the card still surfaces every expectation the resource covers.
export function OverallReadinessPill({ data, subject, grade }: { data: OverallCoverage; subject: string; grade?: string }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  if (data.level === null) {
    const label = overallLabel(subject, data.overall, grade)
    const friendly = label !== data.overall ? label : null
    return (
      <span
        className="flex items-center gap-1 px-2 py-0.5 rounded-full border"
        style={{ borderColor: "var(--border)", backgroundColor: "color-mix(in oklch, var(--muted-foreground) 7%, transparent)" }}
        title={friendly ?? undefined}
        aria-label={`${data.overall}${friendly ? ` ${friendly}` : ""} — not yet assessed`}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--muted)" }} />
        <span className="text-[10px] font-semibold text-muted-foreground">{data.overall}</span>
      </span>
    )
  }

  const v = READINESS_TOKENS[data.level].token

  const openNow = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  // Small delay so moving the cursor from the pill into the panel doesn't flicker it shut.
  const closeSoon = () => {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 80)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          style={pillSurface(v)}
          aria-label={`${data.overall} ${overallLabel(subject, data.overall, grade)} — ${READINESS_TOKENS[data.level].label}`}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: `var(${v})` }} />
          <span className="text-[10px] font-semibold" style={{ color: pillText(v) }}>{data.overall}</span>
        </button>
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content
              asChild
              sideOffset={6}
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onMouseEnter={openNow}
              onMouseLeave={closeSoon}
            >
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="z-[100] w-64 rounded-2xl border border-border bg-popover p-3 shadow-xl"
              >
                <p className="text-[11px] font-bold text-popover-foreground mb-2">
                  {data.overall} · {overallLabel(subject, data.overall, grade)}
                </p>
                <ul className="space-y-1.5">
                  {data.children.map((child) => {
                    const cv = child.level ? READINESS_TOKENS[child.level].token : null
                    return (
                      <li key={child.code} className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cv ? `var(${cv})` : "var(--muted)" }}
                        />
                        <span
                          className="text-[11px] font-semibold flex-shrink-0"
                          style={{ color: cv ? pillText(cv) : "var(--muted-foreground)" }}
                        >
                          {child.code}
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {child.level ? READINESS_TOKENS[child.level].label : "Not assessed"}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}

// Renders the row of readiness pills a resource earns — one per overall
// expectation it covers, capped at `maxPills` with a "+N" overflow chip. Shared
// by the full resource browser card and the in-plan picker cards so both surface
// curriculum coverage with the same color-coded, assessment-aware treatment.
export function ReadinessPillRow({
  expectations,
  codeProgress,
  subject,
  grade,
  maxPills = 4,
}: {
  expectations: string[]
  codeProgress?: Record<string, LevelCounts>
  subject: string
  grade?: string
  maxPills?: number
}) {
  // Collapse the resource's specific expectations into overalls (D1.1… → D1).
  // Always lists every overall the resource covers; each carries a readiness
  // level when the class has data for it, or null (neutral pill) when it doesn't.
  const overallCoverage = useMemo(
    () => coverageForResource(expectations || [], codeProgress ?? {}),
    [expectations, codeProgress],
  )
  const visiblePills = overallCoverage.slice(0, maxPills)
  const overflowPills = overallCoverage.length - visiblePills.length

  return (
    <>
      {visiblePills.map((o) => (
        <OverallReadinessPill key={o.overall} data={o} subject={subject} grade={grade} />
      ))}
      {overflowPills > 0 && (
        <span
          className="px-2 py-0.5 rounded-full border border-border text-[10px] font-semibold text-muted-foreground"
          title={`${overflowPills} more expectation${overflowPills > 1 ? "s" : ""}`}
        >
          +{overflowPills}
        </span>
      )}
    </>
  )
}
