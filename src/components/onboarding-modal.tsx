"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { MapPin, Compass, Check } from "lucide-react"
import ClassroomResourcesPicker from "@/components/classroom-resources-picker"
import {
  getPrefs,
  setPrefs,
  setOnboarded,
  getUserEmail,
  setUserEmail,
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = React.useState<0 | 1 | 2>(0)
  const [email, setEmail] = React.useState<string>(() => getUserEmail())
  const [emailTouched, setEmailTouched] = React.useState(false)
  const [province, setProvince] = React.useState<string>(() => getPrefs().province)
  const [resources, setResources] = React.useState<string[]>(() => getClassroomResources())
  const [customMaterials, setCustomMaterials] = React.useState(() => getCustomClassroomResources())
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const emailValid = email.trim() === "" || EMAIL_PATTERN.test(email.trim())

  const finish = () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    const prefs = getPrefs()
    setPrefs({
      province,
      grade: prefs.grade,
      subject: prefs.subject,
      strand: prefs.strand ?? "",
    })
    setClassroomResources(resources)
    setCustomClassroomResources(customMaterials)
    setUserEmail(email)
    setOnboarded()
    onComplete()
  }

  const goNext = () => {
    if (step === 0 && !emailValid) {
      setEmailTouched(true)
      return
    }
    setStep((s) => (s + 1) as 1 | 2)
  }

  const nextDisabled = step === 0 ? !emailValid : step === 1 ? !province : false

  const preventClose = (e: Event) => e.preventDefault()

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onPointerDownOutside={preventClose}
          onEscapeKeyDown={preventClose}
          onInteractOutside={preventClose}
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-background border-2 border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>🍁</span>
              <DialogPrimitive.Title className="text-xl font-bold text-foreground">
                {step === 0 && "Welcome to Maple Key"}
                {step === 1 && "Which province do you teach in?"}
                {step === 2 && "What's in your classroom?"}
              </DialogPrimitive.Title>
            </div>
            <div className="flex items-center gap-3">
              <StepDots current={step} />
              {step < 2 && (
                <button
                  type="button"
                  onClick={finish}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === 0 && (
              <div className="space-y-4 text-foreground">
                <div className="flex justify-center pt-2">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Compass size={28} className="text-primary" />
                  </div>
                </div>
                <p className="text-center text-base">
                  Help us personalize your experience.
                </p>
                <div className="pt-2">
                  <label htmlFor="onboarding-email" className="block text-sm font-medium text-foreground mb-1.5">
                    Your email <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <input
                    id="onboarding-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    placeholder="you@school.ca"
                    aria-invalid={emailTouched && !emailValid}
                    aria-describedby="onboarding-email-hint"
                    className={`w-full px-3.5 py-2.5 rounded-xl border-2 bg-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none transition-colors ${
                      emailTouched && !emailValid
                        ? "border-destructive focus:border-destructive"
                        : "border-border focus:border-primary"
                    }`}
                  />
                  <p id="onboarding-email-hint" className="text-xs text-muted-foreground mt-1.5">
                    {emailTouched && !emailValid
                      ? "That doesn't look like a valid email address."
                      : "Only used so we know who's using Maple Key during beta."}
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
                  <MapPin size={14} className="text-secondary" />
                  We'll align curriculum to your province.
                </p>
                <div
                  role="radiogroup"
                  aria-label="Province or territory"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2"
                >
                  {PROVINCES.map((p) => {
                    const selected = province === p.code
                    return (
                      <button
                        key={p.code}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setProvince(p.code)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-medium text-left transition-colors ${
                          selected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "bg-card border-border text-foreground hover:border-secondary"
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
                <p className="text-sm text-muted-foreground mb-4">
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

          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/40">
            <button
              type="button"
              onClick={() => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1) : s))}
              disabled={step === 0}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              Back
            </button>

            {step < 2 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={nextDisabled}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            i === current ? "w-6 bg-primary" : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  )
}
