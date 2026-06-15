"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Flag } from "lucide-react"
import { LEVEL_META, type ProficiencyLevel } from "@/lib/assessment-types"
import { computeReadinessLevel, type LevelCounts, type ReadinessLevel } from "@/lib/assessment-results"
import { dominantLevel, totalOf } from "@/lib/orb-math"
import ProficiencyOrb from "@/components/ui/proficiency-orb"

interface CurriculumOrbDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  code: string
  title: string
  description?: string
  bands: LevelCounts
  coverageFraction: number
  showTiers: boolean
}

const READINESS_META: Record<ReadinessLevel, { label: string; level: ProficiencyLevel }> = {
  poor: { label: "Needs attention", level: "level1" },
  okay: { label: "Developing", level: "level2" },
  good: { label: "Strong", level: "level3" },
  great: { label: "Excelling", level: "level4" },
}

const STORY_TEMPLATES: Record<ProficiencyLevel | "none", { narrative: string; nextStep: string }> = {
  none: {
    narrative: "No assessment data has been recorded for this expectation yet.",
    nextStep: "Run a Quick Check during an upcoming lesson to start tracking this expectation.",
  },
  level1: {
    narrative: "Most recorded responses show students need critical support here — plan a re-teach with concrete modelling.",
    nextStep: "Flag this expectation for re-teaching and pair students for peer support.",
  },
  level2: {
    narrative: "Students are showing some understanding but most are still approaching the standard.",
    nextStep: "Plan a focused mini-lesson revisiting the key concept before moving on.",
  },
  level3: {
    narrative: "Most recorded responses meet the provincial standard — students have a solid grasp of this expectation.",
    nextStep: "Reinforce with a short independent practice task to consolidate understanding.",
  },
  level4: {
    narrative: "Most recorded responses surpass the provincial standard — students are excelling here.",
    nextStep: "Consider an extension or enrichment task to deepen and challenge this group.",
  },
}

export default function CurriculumOrbDetailModal({
  open,
  onOpenChange,
  code,
  title,
  description,
  bands,
  coverageFraction,
  showTiers,
}: CurriculumOrbDetailModalProps) {
  const hasData = totalOf(bands) > 0
  const readiness = hasData ? computeReadinessLevel(bands) : null
  const storyKey = hasData ? dominantLevel(bands) ?? "none" : "none"
  const story = STORY_TEMPLATES[storyKey]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[60] w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-border bg-card p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex flex-shrink-0 items-center justify-center">
              <ProficiencyOrb bands={bands} coverageFraction={coverageFraction} showTiers={showTiers} size="xl" />
            </div>

            <div className="flex-1 space-y-3">
              <DialogPrimitive.Title className="text-base font-bold text-foreground">
                {code} — {description ?? title}
              </DialogPrimitive.Title>

              {readiness ? (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${LEVEL_META[READINESS_META[readiness].level].barClass} ${LEVEL_META[READINESS_META[readiness].level].textClass}`}>
                  {READINESS_META[readiness].label}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  Not yet assessed
                </span>
              )}

              <p className="text-sm leading-snug text-muted-foreground">{story.narrative}</p>

              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actionable Next Step</p>
                <p className="mt-1 text-sm text-foreground">{story.nextStep}</p>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
              >
                <Flag size={12} />
                Flag for re-teaching
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
