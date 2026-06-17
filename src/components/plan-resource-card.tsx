"use client"

import { useState } from "react"
import { ExternalLink, Check, ChevronDown } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { coverageForResource, type LevelCounts } from "@/lib/assessment-results"
import { overallLabel } from "@/lib/curriculum-codes"
import type { Resource } from "@/lib/types"

const TYPE_STYLES: { match: (modality: string, resourceType: string) => boolean; label: string; color: string }[] = [
  { match: (m, t) => m.includes("curriculum") || t.includes("curriculum"), label: "Curriculum Document", color: "#16A34A" },
  { match: (m, t) => m.includes("interactive") || t.includes("interactive"), label: "Interactive Tool", color: "#D4621A" },
  { match: (m, t) => m.includes("video") || m.includes("film") || t.includes("video"), label: "Video", color: "#9333EA" },
  { match: (m, t) => m.includes("activity") || m.includes("game") || m.includes("project") || t.includes("activity"), label: "Classroom Activity", color: "#2563EB" },
]

function getResourceTypeInfo(resource: Resource) {
  const modality = (Array.isArray(resource.modality) ? resource.modality.join(", ") : resource.modality ?? "").toLowerCase()
  const resourceType = (resource.resource_type ?? "").toLowerCase()
  const found = TYPE_STYLES.find((t) => t.match(modality, resourceType))
  if (found) return found
  return { label: resource.resource_type || resource.modality?.[0] || "Resource", color: "#8B4513" }
}

const PILL_STYLES = {
  met: { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC", label: "Expectation met" },
  partial: { bg: "#FEF9C3", text: "#92400E", border: "#FCD34D", label: "Expectation partially addressed" },
  new: { bg: "#F1F5F9", text: "#64748B", border: "#CBD5E1", label: "New expectation" },
}

interface PlanResourceCardProps {
  resource: Resource
  codeProgress: Record<string, LevelCounts>
  isAdded: boolean
  onToggleAdd: () => void
}

export default function PlanResourceCard({ resource, codeProgress, isAdded, onToggleAdd }: PlanResourceCardProps) {
  const typeInfo = getResourceTypeInfo(resource)
  const title = resource.topic_title || "Untitled resource"
  const coverage = coverageForResource(resource.curriculum_expectations || [], codeProgress)
  const [expanded, setExpanded] = useState(false)
  const hasDescription = Boolean(resource.description)

  return (
    <div
      className={`rounded-2xl border p-3 transition-colors ${
        isAdded ? "border-[#86EFAC] bg-[#F0FDF4]" : "border-[#E8D5C4] bg-white hover:border-[#D8C7B8]"
      }`}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: typeInfo.color, fontFamily: "var(--font-mono, monospace)" }}>
        {typeInfo.label}
      </div>

      {/* Title + accordion toggle. The description is collapsed by default to keep
          the card vertically tight; the chevron reveals it on demand. */}
      <div className="flex items-start justify-between gap-1.5">
        <h3 className="min-w-0 text-sm font-semibold leading-snug text-[#2C2C2C]">{title}</h3>
        {hasDescription && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-label={expanded ? "Hide description" : "Show description"}
            className="-mr-1 mt-0.5 flex-shrink-0 rounded-md p-0.5 text-[#A8998E] transition-colors hover:bg-[#FFF5ED] hover:text-[#8B4513] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-1"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && hasDescription && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className="pt-1.5 text-xs leading-relaxed text-[#888]">{resource.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1">
          {coverage.map((c) => {
            const bucket = c.level === null ? "new" : c.level === "good" || c.level === "great" ? "met" : "partial"
            const style = PILL_STYLES[bucket]
            return (
              <span
                key={c.overall}
                title={`${c.overall} ${overallLabel(c.overall)} — ${style.label}`}
                className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`, fontFamily: "var(--font-mono, monospace)" }}
              >
                {c.overall}
              </span>
            )
          })}
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => resource.url && window.open(resource.url, "_blank", "noopener,noreferrer")}
            disabled={!resource.url}
            aria-label={`View ${title} resource`}
            className="flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-1"
          >
            View
            <ExternalLink size={11} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggleAdd}
            aria-pressed={isAdded}
            aria-label={isAdded ? `${title} already added to lesson` : `Add ${title} to lesson`}
            disabled={isAdded}
            className={`flex min-w-[62px] items-center justify-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
              isAdded
                ? "cursor-default border-[#86EFAC] bg-[#DCFCE7] text-[#15803D] focus-visible:ring-[#86EFAC]"
                : "border-[#FF6B35] bg-white text-[#FF6B35] hover:bg-[#FF6B35] hover:text-white focus-visible:ring-[#FF6B35]"
            }`}
          >
            {isAdded ? (
              <>
                <Check size={11} aria-hidden="true" />
                Added
              </>
            ) : (
              "+ Add"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
