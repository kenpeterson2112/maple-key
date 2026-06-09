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
    iconBg: "bg-[#FF6B35]/10",
    iconColor: "text-[#FF6B35]",
    title: "Find Your Resources",
    body: "Start here to find resources for your next lesson. Filter or search to find what you need.",
    detail: "Find resources → add your favourites → plan a lesson around them.",
  },
  {
    icon: <BookmarkPlus size={28} />,
    iconBg: "bg-[#8B4513]/10",
    iconColor: "text-[#8B4513]",
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

  const current = STEPS[step]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-[#FAF3E0] border-2 border-[#E8D5C4] rounded-2xl shadow-2xl overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#E8D5C4]">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>🍁</span>
              <DialogPrimitive.Title className="text-base font-semibold text-[#2C2C2C]">
                How Maple Key Works
              </DialogPrimitive.Title>
            </div>
            <div className="flex items-center gap-3">
              <StepDots current={step} total={4} />
              <DialogPrimitive.Close
                onClick={handleClose}
                className="p-1 rounded-lg text-[#888] hover:text-[#2C2C2C] hover:bg-black/5 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Step label */}
          <div className="px-6 pt-4 pb-0">
            <span className="text-xs font-semibold uppercase tracking-widest text-[#FF6B35]">
              Step {step + 1} of 4
            </span>
          </div>

          {/* Body */}
          <div className="px-6 pt-3 pb-5 space-y-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${current.iconBg}`}>
              <span className={current.iconColor}>{current.icon}</span>
            </div>

            <h2 className="text-xl font-bold text-[#2C2C2C] leading-snug">{current.title}</h2>

            <p className="text-sm text-[#444] leading-relaxed">{current.body}</p>

            <div className="flex items-start gap-2.5 bg-white/60 border border-[#E8D5C4] rounded-xl px-4 py-3">
              <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#FF6B35] mt-1.5" />
              <p className="text-xs text-[#666] leading-relaxed">{current.detail}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8D5C4] bg-white/40">
            <button
              type="button"
              onClick={() => step > 0 && setStep((s) => (s - 1) as Step)}
              disabled={step === 0}
              className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#2C2C2C] disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              Back
            </button>

            <div className="flex items-center gap-3">
              {step < 3 && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-2 text-sm text-[#888] hover:text-[#2C2C2C] transition-colors"
                >
                  Skip
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-xl text-sm hover:bg-[#E85A24] transition-colors"
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
            i === current ? "w-6 bg-[#FF6B35]" : i < current ? "w-1.5 bg-[#FF6B35]/40" : "w-1.5 bg-[#E8D5C4]"
          }`}
        />
      ))}
    </div>
  )
}
