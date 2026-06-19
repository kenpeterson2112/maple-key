"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Search, BookmarkPlus, PenLine, BarChart3, X } from "lucide-react"
import { setResourceTourSeen } from "@/lib/personalization"

interface ResourceOnboardingModalProps {
  open: boolean
  onClose: () => void
}

type Step = 0 | 1 | 2 | 3

const STEPS: {
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  title: string
  body: string
  detail: string
}[] = [
  {
    icon: <Search size={28} />,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Find Your Resources",
    body: "Start here to find resources for your next lesson. Filter or search to find what you need.",
    detail: "Find resources → add your favourites → plan a lesson around them.",
  },
  {
    icon: <BookmarkPlus size={28} />,
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
    title: "Review & Add Your Own",
    body: "Browse the curated list, bookmark resources that resonate, and bring in materials you already love. Add notes about the lesson theme or learning goals you have in mind — this context shapes what gets generated.",
    detail: "Your bookmarks and notes travel with you into the lesson planner.",
  },
  {
    icon: <PenLine size={28} />,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    title: "Shape the Lesson",
    body: "Answer a few quick design questions — pacing, format, differentiation needs — then Maple Key drafts the lesson plan. Modify it directly until it reflects the true shape of your classroom.",
    detail: "You stay in control and have the final say on everything in your lesson.",
  },
  {
    icon: <BarChart3 size={28} />,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    title: "Deliver & Plan What's Next",
    body: "After the lesson, review outcomes and check understanding by expectation. Maple Key surfaces what landed and what needs reinforcement — so your next lesson starts exactly where your students are.",
    detail: "Assessment by expectation feeds directly into the next planning cycle.",
  },
]

export default function ResourceOnboardingModal({ open, onClose }: ResourceOnboardingModalProps) {
  const [step, setStep] = React.useState<Step>(0)

  const handleClose = () => {
    setResourceTourSeen()
    onClose()
  }

  const handleNext = () => {
    if (step < 3) {
      setStep((s) => (s + 1) as Step)
    } else {
      handleClose()
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-background border-2 border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>🍁</span>
              <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                How Maple Key Works
              </DialogPrimitive.Title>
            </div>
            <div className="flex items-center gap-3">
              <StepDots current={step} total={4} />
              <DialogPrimitive.Close
                onClick={handleClose}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/5 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Step label */}
          <div className="px-6 pt-4 pb-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">
              Step {step + 1} of 4
            </span>
          </div>

          {/* Body */}
          {/* All steps stack in the same grid cell so the modal height is
              locked to the tallest step, regardless of which is active. */}
          <div className="px-6 pt-3 pb-5 grid">
            {STEPS.map((s, i) => (
              <div
                key={i}
                aria-hidden={i !== step}
                className={`col-start-1 row-start-1 space-y-4 ${i === step ? "" : "invisible"}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.iconBg}`}>
                  <span className={s.iconColor}>{s.icon}</span>
                </div>

                <h2 className="text-xl font-bold text-foreground leading-snug">{s.title}</h2>

                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>

                <div className="flex items-start gap-2.5 bg-card/60 border border-border rounded-xl px-4 py-3">
                  <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/40">
            <button
              type="button"
              onClick={() => step > 0 && setStep((s) => (s - 1) as Step)}
              disabled={step === 0}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              {step < 3 && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-colors"
              >
                {step < 3 ? "Next" : "Get Started"}
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-6 bg-primary" : i < current ? "w-1.5 bg-primary/40" : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  )
}
