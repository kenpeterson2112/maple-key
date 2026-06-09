"use client"

import { useCallback, useState } from "react"
import { Check, Plus, X } from "lucide-react"
import {
  CLASSROOM_RESOURCE_CATEGORIES,
  CLASSROOM_RESOURCE_OPTIONS,
} from "@/lib/classroom-resources"

interface ClassroomResourcesPickerProps {
  selected: string[]
  onChange: (ids: string[]) => void
  customMaterials: string[]
  onCustomChange: (labels: string[]) => void
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
  "digital-resources": {
    chip: "border-rose-200 text-rose-800 hover:bg-rose-50",
    chipSelected: "bg-rose-100 border-rose-400 text-rose-900",
    header: "text-rose-800",
  },
  "digital-tools": {
    chip: "border-cyan-200 text-cyan-800 hover:bg-cyan-50",
    chipSelected: "bg-cyan-100 border-cyan-400 text-cyan-900",
    header: "text-cyan-800",
  },
}

export default function ClassroomResourcesPicker({
  selected,
  onChange,
  customMaterials,
  onCustomChange,
}: ClassroomResourcesPickerProps) {
  const [customInput, setCustomInput] = useState("")

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
    const existsInCustom = customMaterials.some((m) => m.toLowerCase() === lower)
    const existsInCatalog = CLASSROOM_RESOURCE_OPTIONS.some((o) => o.label.toLowerCase() === lower)
    if (existsInCustom || existsInCatalog) {
      setCustomInput("")
      return
    }
    onCustomChange([...customMaterials, trimmed])
    setCustomInput("")
  }, [customInput, customMaterials, onCustomChange])

  const removeCustom = useCallback(
    (label: string) => {
      onCustomChange(customMaterials.filter((m) => m !== label))
    },
    [customMaterials, onCustomChange]
  )

  const totalSelected = selected.length + customMaterials.length

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
                    <Check
                      size={11}
                      strokeWidth={3}
                      className={isSelected ? "opacity-100" : "opacity-0"}
                    />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-[#8B4513]">
          Custom Materials
        </p>
        {customMaterials.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {customMaterials.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-[#FFE5CC] border-[#E8B894] text-[#8B4513] text-xs font-medium"
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeCustom(label)}
                  className="text-[#8B4513] hover:text-red-600 transition-colors"
                  aria-label={`Remove ${label}`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
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
            placeholder="Add another material (e.g. abacus, dot paper)"
            className="flex-1 px-3 py-1.5 bg-white border-2 border-[#E8D5C4] rounded-full text-[#2C2C2C] text-xs focus:outline-none focus:border-[#8B4513] transition-colors"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#8B4513] hover:bg-[#6B3410] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
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
