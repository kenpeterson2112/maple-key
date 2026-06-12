"use client"

import { useCallback, useState } from "react"
import { Check, Plus, X } from "lucide-react"
import {
  CLASSROOM_RESOURCE_CATEGORIES,
  CLASSROOM_RESOURCE_OPTIONS,
  type CustomClassroomResource,
} from "@/lib/classroom-resources"

interface ClassroomResourcesPickerProps {
  selected: string[]
  onChange: (ids: string[]) => void
  customMaterials: CustomClassroomResource[]
  onCustomChange: (items: CustomClassroomResource[]) => void
}

const CATEGORY_STYLES: Record<string, { chip: string; chipSelected: string; header: string; customPill: string }> = {
  "math-manipulatives": {
    chip: "border-emerald-200 text-emerald-800 hover:bg-emerald-50",
    chipSelected: "bg-emerald-100 border-emerald-400 text-emerald-900",
    header: "text-emerald-800",
    customPill: "bg-emerald-50 border-emerald-300 text-emerald-900",
  },
  technology: {
    chip: "border-blue-200 text-blue-800 hover:bg-blue-50",
    chipSelected: "bg-blue-100 border-blue-400 text-blue-900",
    header: "text-blue-800",
    customPill: "bg-blue-50 border-blue-300 text-blue-900",
  },
  spaces: {
    chip: "border-amber-200 text-amber-800 hover:bg-amber-50",
    chipSelected: "bg-amber-100 border-amber-400 text-amber-900",
    header: "text-amber-800",
    customPill: "bg-amber-50 border-amber-300 text-amber-900",
  },
  supplies: {
    chip: "border-violet-200 text-violet-800 hover:bg-violet-50",
    chipSelected: "bg-violet-100 border-violet-400 text-violet-900",
    header: "text-violet-800",
    customPill: "bg-violet-50 border-violet-300 text-violet-900",
  },
  "digital-resources": {
    chip: "border-rose-200 text-rose-800 hover:bg-rose-50",
    chipSelected: "bg-rose-100 border-rose-400 text-rose-900",
    header: "text-rose-800",
    customPill: "bg-rose-50 border-rose-300 text-rose-900",
  },
  "digital-tools": {
    chip: "border-cyan-200 text-cyan-800 hover:bg-cyan-50",
    chipSelected: "bg-cyan-100 border-cyan-400 text-cyan-900",
    header: "text-cyan-800",
    customPill: "bg-cyan-50 border-cyan-300 text-cyan-900",
  },
}

export default function ClassroomResourcesPicker({
  selected,
  onChange,
  customMaterials,
  onCustomChange,
}: ClassroomResourcesPickerProps) {
  const [customInput, setCustomInput] = useState("")
  const [customCategory, setCustomCategory] = useState<string>(CLASSROOM_RESOURCE_CATEGORIES[0].id)

  const toggle = useCallback(
    (id: string) => {
      onChange(
        selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
      )
    },
    [selected, onChange]
  )

  const addCustom = useCallback(() => {
    const trimmed = customInput.trim()
    if (!trimmed) return
    const lower = trimmed.toLowerCase()
    const existsInCustom = customMaterials.some((m) => m.label.toLowerCase() === lower)
    const existsInCatalog = CLASSROOM_RESOURCE_OPTIONS.some((o) => o.label.toLowerCase() === lower)
    if (existsInCustom || existsInCatalog) {
      setCustomInput("")
      return
    }
    onCustomChange([...customMaterials, { label: trimmed, category: customCategory }])
    setCustomInput("")
  }, [customInput, customCategory, customMaterials, onCustomChange])

  const removeCustom = useCallback(
    (label: string, category: string) => {
      onCustomChange(customMaterials.filter((m) => !(m.label === label && m.category === category)))
    },
    [customMaterials, onCustomChange]
  )

  const totalSelected = selected.length + customMaterials.length

  return (
    <div className="space-y-5">
      {CLASSROOM_RESOURCE_CATEGORIES.map((cat) => {
        const options = CLASSROOM_RESOURCE_OPTIONS.filter((o) => o.category === cat.id)
        const customsInCat = customMaterials.filter((c) => c.category === cat.id)
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
                    <Check
                      size={11}
                      strokeWidth={3}
                      className={isSelected ? "opacity-100" : "opacity-0"}
                    />
                    {opt.label}
                  </button>
                )
              })}
              {customsInCat.map((c) => (
                <span
                  key={`custom-${c.label}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${styles.customPill}`}
                >
                  {c.label}
                  <button
                    type="button"
                    onClick={() => removeCustom(c.label, c.category)}
                    className="hover:text-red-600 transition-colors"
                    aria-label={`Remove ${c.label}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )
      })}

      <div className="border-t border-[#E8D5C4] pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-[#8B4513]">
          Add a custom material
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="px-3 py-1.5 bg-white border-2 border-[#E8D5C4] rounded-full text-[#2C2C2C] text-xs focus:outline-none focus:border-[#8B4513] transition-colors cursor-pointer"
          >
            {CLASSROOM_RESOURCE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addCustom()
              }
            }}
            placeholder="e.g. abacus, dot paper, Quizlet"
            className="flex-1 px-3 py-1.5 bg-white border-2 border-[#E8D5C4] rounded-full text-[#2C2C2C] text-xs focus:outline-none focus:border-[#8B4513] transition-colors"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-[#8B4513] hover:bg-[#6B3410] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>

      {totalSelected > 0 && (
        <p className="text-xs text-[#888]">
          {totalSelected} material{totalSelected !== 1 ? "s" : ""} selected — these will be used to inform lesson suggestions.
        </p>
      )}
    </div>
  )
}
