"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { MapPin, Sparkles, Check } from "lucide-react"
import ClassroomResourcesPicker from "@/components/classroom-resources-picker"
import {
  getPrefs,
  setPrefs,
  setOnboarded,
} from "@/lib/personalization"
import {
  getClassroomResources,
  setClassroomResources,
  getCustomClassroomResources,
  setCustomClassroomResources,
} from "@/lib/classroom-resources"

interface OnboardingModalProps {
  open: boolean
  onComplete: () => void
}

const PROVINCES: { code: string; name: string }[] = [
  { code: "ON", name: "Ontario" },
  { code: "QC", name: "Quebec" },
  { code: "BC", name: "British Columbia" },
  { code: "AB", name: "Alberta" },
  { code: "MB", name: "Manitoba" },
  { code: "SK", name: "Saskatchewan" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "YT", name: "Yukon" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
]

export default function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = React.useState<0 | 1 | 2>(0)
  const [province, setProvince] = React.useState<string>(() => getPrefs().province)
  const [resources, setResources] = React.useState<string[]>(() => getClassroomResources())
  const [customMaterials, setCustomMaterials] = React.useState(() => getCustomClassroomResources())

  const handleFinish = () => {
    const prefs = getPrefs()
    setPrefs({
      province,
      grade: prefs.grade,
      subject: prefs.subject,
      strand: prefs.strand ?? "",
    })
    setClassroomResources(resources)
    setCustomClassroomResources(customMaterials)
    setOnboarded()
    onComplete()
  }

  const preventClose = (e: Event) => e.preventDefault()

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={preventClose}
          onEscapeKeyDown={preventClose}
          onInteractOutside={preventClose}
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-[#FAF3E0] border-2 border-[#E8D5C4] rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#E8D5C4]">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>🍁</span>
              <DialogPrimitive.Title className="text-xl font-bold text-[#2C2C2C]">
                {step === 0 && "Welcome to Maple Key"}
                {step === 1 && "Which province do you teach in?"}
                {step === 2 && "What's in your classroom?"}
              </DialogPrimitive.Title>
            </div>
            <StepDots current={step} />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === 0 && (
              <div className="space-y-4 text-[#2C2C2C]">
                <div className="flex justify-center pt-2">
                  <div className="w-14 h-14 rounded-2xl bg-[#FF6B35]/10 flex items-center justify-center">
                    <Sparkles size={28} className="text-[#FF6B35]" />
                  </div>
                </div>
                <p className="text-center text-base">
                  Help us personalize your experience.
                </p>
                <p className="text-center text-sm text-[#666] max-w-md mx-auto">
                  We'll ask two quick questions — your province and the classroom resources
                  you have on hand — so the lessons and materials we surface fit your
                  classroom from the very first search.
                </p>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-sm text-[#666] mb-4 flex items-center gap-1.5">
                  <MapPin size={14} className="text-[#8B4513]" />
                  We'll align curriculum to your province.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROVINCES.map((p) => {
                    const selected = province === p.code
                    return (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => setProvince(p.code)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition-colors ${
                          selected
                            ? "bg-[#FF6B35] border-[#FF6B35] text-white"
                            : "bg-white border-[#E8D5C4] text-[#2C2C2C] hover:border-[#8B4513]"
                        }`}
                      >
                        <span>{p.name}</span>
                        <Check
                          size={16}
                          strokeWidth={3}
                          className={selected ? "opacity-100 shrink-0" : "opacity-0 shrink-0"}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-sm text-[#666] mb-4">
                  Pick what you have access to. You can change these any time in Settings.
                </p>
                <ClassroomResourcesPicker
                  selected={resources}
                  onChange={setResources}
                  customMaterials={customMaterials}
                  onCustomChange={setCustomMaterials}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E8D5C4] bg-white/40">
            <button
              type="button"
              onClick={() => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1) : s))}
              disabled={step === 0}
              className="px-4 py-2 text-sm font-medium text-[#666] hover:text-[#2C2C2C] disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              Back
            </button>

            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((s) => ((s + 1) as 1 | 2))}
                disabled={step === 1 && !province}
                className="px-6 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-xl text-sm hover:bg-[#E85A24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {step === 0 ? "Next" : "Next"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-xl text-sm hover:bg-[#E85A24] transition-colors"
              >
                Get Started
              </button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function StepDots({ current }: { current: 0 | 1 | 2 }) {
  return (
    <div className="flex items-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i === current ? "w-6 bg-[#FF6B35]" : "w-1.5 bg-[#E8D5C4]"
          }`}
        />
      ))}
    </div>
  )
}
