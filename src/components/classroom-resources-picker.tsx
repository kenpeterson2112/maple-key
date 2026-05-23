"use client"

import { useState, useCallback } from "react"
import { Check } from "lucide-react"
import {
  CLASSROOM_RESOURCE_CATEGORIES,
  CLASSROOM_RESOURCE_OPTIONS,
} from "@/lib/classroom-resources"

interface ClassroomResourcesPickerProps {
  selected: string[]
  onChange: (ids: string[]) => void
}

const CATEGORY_STYLES: Record<string, { chip: string; chipSelected: string; header: string }> = {
  "math-manipulatives": {
    chip: "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
    chipSelected: "bg-emerald-100 border-emerald-400 text-emerald-900",
    header: "text-emerald-800",
  },
  technology: {
    chip: "border-blue-200 text-blue-800 hover:bg-blue-50",
    chipSelected: "bg-blue-100 border-blue-400 text-blue-900",
    header: "text-blue-800",
  },
  spaces: {
    chip: "border-amber-200 text-amber-800 hover:bg-amber-50",
    chipSelected: "bg-amber-100 border-amber-400 text-amber-900",
    header: "text-amber-800",
  },
  supplies: {
    chip: "border-violet-200 text-violet-800 hover:bg-violet-50",
    chipSelected: "bg-violet-100 border-violet-400 text-violet-900",
    header: "text-violet-800",
  },
}

export default function ClassroomResourcesPicker({ selected, onChange }: ClassroomResourcesPickerProps) {
  const toggle = useCallback(
    (id: string) => {
      onChange(
        selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
      )
    },
    [selected, onChange]
  )

  return (
    <div className="space-y-5">
      {CLASSROOM_RESOURCE_CATEGORIES.map((cat) => {
        const options = CLASSROOM_RESOURCE_OPTIONS.filter((o) => o.category === cat.id)
        const styles = CATEGORY_STYLES[cat.id]
        return (
          <div key={cat.id}>
            <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${styles.header}`}>
              {cat.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => {
                const isSelected = selected.includes(opt.id)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-150 cursor-pointer ${
                      isSelected ? styles.chipSelected : `bg-white ${styles.chip}`
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {selected.length > 0 && (
        <p className="text-xs text-[#888]">
          {selected.length} resource{selected.length !== 1 ? "s" : ""} selected — these will be used to inform lesson suggestions.
        </p>
      )}
    </div>
  )
}
