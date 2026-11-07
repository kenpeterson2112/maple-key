"use client"

import { useEffect, useState } from "react"
import { School } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import ClassroomResourcesPicker from "@/components/classroom-resources-picker"
import {
  getClassroomResources,
  setClassroomResources,
  getCustomClassroomResources,
  setCustomClassroomResources,
  type CustomClassroomResource,
} from "@/lib/classroom-resources"

interface MaterialsEditorModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
}

export default function MaterialsEditorModal({ isOpen, onClose, onSaved }: MaterialsEditorModalProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [custom, setCustom] = useState<CustomClassroomResource[]>([])

  // Re-hydrate from storage every time the modal opens so concurrent edits elsewhere don't get lost.
  useEffect(() => {
    if (!isOpen) return
    setSelected(getClassroomResources())
    setCustom(getCustomClassroomResources())
  }, [isOpen])

  const handleSave = () => {
    setClassroomResources(selected)
    setCustomClassroomResources(custom)
    onSaved?.()
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="top" className="bg-muted border-b-2 border-border max-h-[85vh] overflow-y-auto z-[70]">
        <SheetHeader className="pb-3 border-b border-border">
          <SheetTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <School size={18} className="text-foreground" />
            My Classroom Materials
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-5">
          <p className="text-xs text-muted-foreground">
            Edits here update your classroom materials immediately. Closing this panel keeps you in the lesson planner — your planning progress isn't lost.
          </p>
          <ClassroomResourcesPicker
            selected={selected}
            onChange={setSelected}
            customMaterials={custom}
            onCustomChange={setCustom}
          />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-card border-2 border-border text-secondary-strong text-sm font-semibold rounded-xl hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-semibold rounded-xl transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
