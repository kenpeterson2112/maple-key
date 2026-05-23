"use client"

import { User, Mail, Globe, School } from "lucide-react"
import { useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import ClassroomResourcesPicker from "@/components/classroom-resources-picker"
import { getClassroomResources, setClassroomResources } from "@/lib/classroom-resources"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [name, setName] = useState("Ken Peterson")
  const [email, setEmail] = useState("ken.peterson@maplekey.edu")
  const [language, setLanguage] = useState("English")
  const [classroomResources, setClassroomResourcesState] = useState<string[]>(() =>
    getClassroomResources()
  )

  const handleSave = () => {
    setClassroomResources(classroomResources)
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="top" className="bg-[#FAF3E0] border-b-2 border-[#E8D5C4] max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-3 border-b border-[#E8D5C4]">
          <SheetTitle className="text-xl font-bold text-[#2C2C2C]">Settings</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-6">
          {/* Profile fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#333]">
                <User size={14} className="text-[#8B4513]" />
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-[#E8D5C4] rounded-xl text-[#2C2C2C] text-sm focus:outline-none focus:border-[#8B4513] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#333]">
                <Mail size={14} className="text-[#8B4513]" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-[#E8D5C4] rounded-xl text-[#2C2C2C] text-sm focus:outline-none focus:border-[#8B4513] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#333]">
                <Globe size={14} className="text-[#8B4513]" />
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-white border-2 border-[#E8D5C4] rounded-xl text-[#2C2C2C] text-sm focus:outline-none focus:border-[#8B4513] transition-colors cursor-pointer"
              >
                <option value="English">English</option>
                <option value="French">French</option>
              </select>
            </div>
          </div>

          {/* Classroom Resources */}
          <div className="bg-white border-2 border-[#E8D5C4] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <School size={16} className="text-[#8B4513]" />
              <h3 className="text-sm font-semibold text-[#2C2C2C]">My Classroom Resources</h3>
            </div>
            <p className="text-xs text-[#888] mb-4">
              Select the tools, technology, and spaces available in your classroom. Maple Key will use these to tailor lesson suggestions.
            </p>
            <ClassroomResourcesPicker
              selected={classroomResources}
              onChange={setClassroomResourcesState}
            />
          </div>

          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[#8B4513] hover:bg-[#6B3410] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Save Changes
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
