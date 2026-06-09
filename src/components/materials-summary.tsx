"use client"

import { Pencil } from "lucide-react"
import type { MaterialsSnapshot } from "@/lib/classroom-resources"

const CATEGORY_DOT: Record<string, string> = {
  "math-manipulatives": "bg-emerald-500",
  technology: "bg-blue-500",
  spaces: "bg-amber-500",
  supplies: "bg-violet-500",
  "digital-resources": "bg-rose-500",
  "digital-tools": "bg-cyan-500",
}

interface MaterialsSummaryProps {
  snapshot: MaterialsSnapshot
  onEdit?: () => void
  size?: "sm" | "md"
}

export default function MaterialsSummary({ snapshot, onEdit, size = "md" }: MaterialsSummaryProps) {
  const dotSize = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5"
  const labelText = size === "sm" ? "text-xs" : "text-sm"
  const countText = "text-xs font-semibold tabular-nums"
  const rowPad = size === "sm" ? "px-2 py-1" : "px-3 py-2"

  return (
    <div>
      <div className="space-y-0.5">
        {snapshot.byCategory.map((cat) => {
          const dot = CATEGORY_DOT[cat.id] ?? "bg-stone-400"
          const empty = cat.items.length === 0
          return (
            <div
              key={cat.id}
              title={empty ? "None selected" : cat.items.join(", ")}
              className={`flex items-center gap-3 rounded-lg ${rowPad}`}
            >
              <span className={`${dotSize} rounded-full flex-shrink-0 ${dot} ${empty ? "opacity-30" : ""}`} />
              <span className={`${labelText} flex-1 ${empty ? "text-[#A8998E]" : "text-[#2C2C2C]"}`}>
                {cat.label}
              </span>
              <span className={`${countText} ${empty ? "text-[#C8B8AA]" : "text-[#8B4513]"}`}>
                {cat.items.length}
              </span>
            </div>
          )
        })}
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#FFF5ED] hover:bg-[#FFE5CC] px-3 py-2 text-sm font-semibold text-[#8B4513] transition-colors"
        >
          <Pencil size={14} />
          Edit materials
        </button>
      )}
    </div>
  )
}
