"use client"

import { useState } from "react"
import { ExternalLink, Check, ChevronDown } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { type LevelCounts } from "@/lib/assessment-results"
import { ReadinessPillRow } from "@/components/ui/readiness-pill"
import type { Resource } from "@/lib/types"

const TYPE_STYLES: { match: (modality: string, resourceType: string) => boolean; label: string; className: string }[] = [
  { match: (m, t) => m.includes("curriculum") || t.includes("curriculum"), label: "Curriculum Document", className: "text-success" },
  { match: (m, t) => m.includes("interactive") || t.includes("interactive"), label: "Interactive Tool", className: "text-primary" },
  { match: (m, t) => m.includes("video") || m.includes("film") || t.includes("video"), label: "Video", className: "text-pop-strong" },
  { match: (m, t) => m.includes("activity") || m.includes("game") || m.includes("project") || t.includes("activity"), label: "Classroom Activity", className: "text-secondary-strong" },
]

function getResourceTypeInfo(resource: Resource) {
  const modality = (Array.isArray(resource.modality) ? resource.modality.join(", ") : resource.modality ?? "").toLowerCase()
  const resourceType = (resource.resource_type ?? "").toLowerCase()
  const found = TYPE_STYLES.find((t) => t.match(modality, resourceType))
  if (found) return found
  return { label: resource.resource_type || resource.modality?.[0] || "Resource", className: "text-muted-foreground" }
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
  const [expanded, setExpanded] = useState(false)
  const hasDescription = Boolean(resource.description)

  return (
    <div
      className={`rounded-2xl border p-3 transition-colors ${
        isAdded ? "border-success/40 bg-success-tint/50" : "border-border bg-card hover:border-border-strong"
      }`}
    >
      {/* Title row: title on the left with the accordion toggle sitting just to
          its right; the modality/type tag is anchored at the far right. The
          description is collapsed by default to keep the card vertically tight. */}
      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <h3 className="min-w-0 text-sm font-semibold leading-snug text-foreground">{title}</h3>
          {hasDescription && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              aria-expanded={expanded}
              aria-label={expanded ? "Hide description" : "Show description"}
              className="flex-shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-secondary-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
        <span
          className={`mt-0.5 flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide ${typeInfo.className}`}
          style={{ fontFamily: "var(--font-mono, monospace)" }}
        >
          {typeInfo.label}
        </span>
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
            <p className="pt-1.5 text-xs leading-relaxed text-muted-foreground">{resource.description}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <ReadinessPillRow
            expectations={resource.curriculum_expectations || []}
            codeProgress={codeProgress}
            subject={resource.subject}
            grade={resource.grade_level?.[0]?.toString()}
          />
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
                ? "cursor-default border-success/40 bg-success-tint text-success focus-visible:ring-ring"
                : "border-primary bg-card text-primary hover:bg-primary hover:text-primary-foreground focus-visible:ring-ring"
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
