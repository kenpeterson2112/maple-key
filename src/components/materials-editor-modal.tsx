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
      <SheetContent side="top" className="bg-[#FAF3E0] border-b-2 border-[#E8D5C4] max-h-[85vh] overflow-y-auto z-[70]">
        <SheetHeader className="pb-3 border-b border-[#E8D5C4]">
          <SheetTitle className="text-xl font-bold text-[#2C2C2C] flex items-center gap-2">
            <School size={18} className="text-[#8B4513]" />
            My Classroom Materials
          </SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-5">
          <p className="text-xs text-[#888]">
            Edits here update your classroom materials immediately. Closing this panel keeps you in the lesson planner — your planning progress isn't lost.
          </p>
          <ClassroomResourcesPicker
            selected={selected}
            onChange={setSelected}
            customMaterials={custom}
            onCustomChange={setCustom}
          />

          <div className="flex justify-end gap-2 border-t border-[#E8D5C4] pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border-2 border-[#E8D5C4] text-[#8B4513] text-sm font-semibold rounded-xl hover:bg-[#FFF5ED] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-[#8B4513] hover:bg-[#6B3410] text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
