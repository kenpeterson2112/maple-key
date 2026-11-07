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
    chip: "border-hue-green/40 text-hue-green hover:bg-hue-green/10",
    chipSelected: "bg-hue-green/10 border-hue-green text-hue-green",
    header: "text-hue-green",
    customPill: "bg-hue-green/10 border-hue-green/40 text-hue-green",
  },
  technology: {
    chip: "border-hue-blue/40 text-hue-blue hover:bg-hue-blue/10",
    chipSelected: "bg-hue-blue/10 border-hue-blue text-hue-blue",
    header: "text-hue-blue",
    customPill: "bg-hue-blue/10 border-hue-blue/40 text-hue-blue",
  },
  spaces: {
    chip: "border-hue-amber/40 text-hue-amber hover:bg-hue-amber/10",
    chipSelected: "bg-hue-amber/10 border-hue-amber text-hue-amber",
    header: "text-hue-amber",
    customPill: "bg-hue-amber/10 border-hue-amber/40 text-hue-amber",
  },
  supplies: {
    chip: "border-hue-violet/40 text-hue-violet hover:bg-hue-violet/10",
    chipSelected: "bg-hue-violet/10 border-hue-violet text-hue-violet",
    header: "text-hue-violet",
    customPill: "bg-hue-violet/10 border-hue-violet/40 text-hue-violet",
  },
  "print-resources": {
    chip: "border-hue-orange/40 text-hue-orange hover:bg-hue-orange/10",
    chipSelected: "bg-hue-orange/10 border-hue-orange text-hue-orange",
    header: "text-hue-orange",
    customPill: "bg-hue-orange/10 border-hue-orange/40 text-hue-orange",
  },
  "digital-resources": {
    chip: "border-hue-rose/40 text-hue-rose hover:bg-hue-rose/10",
    chipSelected: "bg-hue-rose/10 border-hue-rose text-hue-rose",
    header: "text-hue-rose",
    customPill: "bg-hue-rose/10 border-hue-rose/40 text-hue-rose",
  },
  "digital-tools": {
    chip: "border-hue-cyan/40 text-hue-cyan hover:bg-hue-cyan/10",
    chipSelected: "bg-hue-cyan/10 border-hue-cyan text-hue-cyan",
    header: "text-hue-cyan",
    customPill: "bg-hue-cyan/10 border-hue-cyan/40 text-hue-cyan",
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
                      isSelected ? styles.chipSelected : `bg-card ${styles.chip}`
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
                    className="hover:text-destructive transition-colors"
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

      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 text-foreground">
          Add a custom material
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className="px-3 py-1.5 bg-card border-2 border-border rounded-full text-foreground text-xs focus:outline-none focus:border-ring transition-colors cursor-pointer"
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
            className="flex-1 px-3 py-1.5 bg-card border-2 border-border rounded-full text-foreground text-xs focus:outline-none focus:border-ring transition-colors"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim()}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-full bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-semibold transition-colors"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>

      {totalSelected > 0 && (
        <p className="text-xs text-muted-foreground">
          {totalSelected} material{totalSelected !== 1 ? "s" : ""} selected — these will be used to inform lesson suggestions.
        </p>
      )}
    </div>
  )
}
