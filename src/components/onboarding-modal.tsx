"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import ClassroomResourcesPicker from "@/components/classroom-resources-picker"
import { setOnboarded } from "@/lib/personalization"
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

export default function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [resources, setResources] = React.useState<string[]>(() => getClassroomResources())
  const [customMaterials, setCustomMaterials] = React.useState(() => getCustomClassroomResources())
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const finish = () => {
    if (isSubmitting) return
    setIsSubmitting(true)
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
          className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-background border-2 border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>🍁</span>
              <DialogPrimitive.Title className="text-xl font-bold text-foreground">
                What's in your classroom?
              </DialogPrimitive.Title>
            </div>
            <button
              type="button"
              onClick={finish}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
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

          <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-card/40">
            <button
              type="button"
              onClick={finish}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Get Started
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
