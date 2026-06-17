"use client"

import { useMemo, useState, useEffect } from "react"
import { Compass } from "lucide-react"
import MapleKeyIcon from "@/components/ui/maple-key-icon"
import PlanResourceCard from "./plan-resource-card"
import { useBookmarks } from "@/lib/bookmarks-context"
import { useFilteredResources, sortResources, type SidebarFilters } from "@/lib/use-filtered-resources"
import type { Filters } from "@/lib/types"

const SUGGESTION_LIMIT = 3
// Cap the in-plan suggestion strip at 3 pages (9 resources). Past that, send
// teachers to the full resource browser rather than paging forever in here.
const MAX_SUGGESTION_PAGES = 3

interface PlanResourceSearchProps {
  filters: Filters
  sidebarFilters: SidebarFilters
  onBrowseAll: () => void
}

export default function PlanResourceSearch({
  filters,
  sidebarFilters,
  onBrowseAll,
}: PlanResourceSearchProps) {
  const [suggestionPageIndex, setSuggestionPageIndex] = useState(0)

  const { filteredResources, classProgress } = useFilteredResources(filters, sidebarFilters)
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks()

  const sortedResources = useMemo(() => sortResources(filteredResources), [filteredResources])

  // Paginated suggestions: show 3 per page starting from suggestionPageIndex
  const pageStart = suggestionPageIndex * SUGGESTION_LIMIT
  const pageEnd = pageStart + SUGGESTION_LIMIT
  const suggestions = sortedResources.slice(pageStart, pageEnd)
  const totalSuggestions = sortedResources.length
  // "Next 3" advances only while more resources exist AND we're under the page
  // cap. On the last page (or page 3), the button switches to "Find more on
  // this topic" and routes to the full browser instead.
  const canShowNextPage =
    pageEnd < totalSuggestions && suggestionPageIndex < MAX_SUGGESTION_PAGES - 1

  const primaryGrade = (filters.grade || "").split(",").filter(Boolean)[0] ?? ""
  const contextLabel = [primaryGrade ? `Grade ${primaryGrade}` : "", filters.subject || ""].filter(Boolean).join(" ")
  // Suggestion heading carries the strand too (e.g. "Grade 6 Math · Spatial Sense").
  const suggestionLabel = [contextLabel, filters.strand || ""].filter(Boolean).join(" · ")

  const resourceId = (resource: { id: string; topic_title: string; url: string }) =>
    resource.id || resource.topic_title || resource.url

  const handleToggleAdd = (resource: (typeof suggestions)[number]) => {
    const id = resourceId(resource)
    if (isBookmarked(id)) {
      removeBookmark(id)
    } else {
      addBookmark(resource)
    }
  }

  // Reset pagination when the lesson context (filters) changes.
  useEffect(() => {
    setSuggestionPageIndex(0)
  }, [filters, sidebarFilters])

  // A tight "suggested for this lesson" strip. Deeper discovery routes to the
  // full resource browser via "Find more on this topic".
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <MapleKeyIcon className="h-3.5 w-3.5 flex-shrink-0 text-[#FF6B35]" />
          <h3 className="truncate text-[11px] font-semibold uppercase tracking-wide text-[#8B4513]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
            {suggestionLabel ? `Suggested for ${suggestionLabel}` : "Suggested resources"}
          </h3>
        </div>
      </div>

      {totalSuggestions === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#E8D5C4] bg-white/60 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE5CC]">
            <Compass size={18} className="text-[#C65D3B]" />
          </div>
          <p className="text-sm font-semibold text-[#2C2C2C]">No suggestions yet for this lesson.</p>
          <p className="text-xs text-[#8B4513]/70">Adjust the grade, subject, or strand to see matching resources.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {suggestions.map((resource, i) => {
            const id = resourceId(resource)
            return (
              <PlanResourceCard
                key={id || i}
                resource={resource}
                codeProgress={classProgress}
                isAdded={isBookmarked(id)}
                onToggleAdd={() => handleToggleAdd(resource)}
              />
            )
          })}

          <button
            type="button"
            onClick={() => {
              if (canShowNextPage) {
                setSuggestionPageIndex((i) => i + 1)
              } else {
                onBrowseAll()
              }
            }}
            className="mt-2 w-full py-2 px-3 rounded-lg border-2 border-dashed border-[#E8D5C4] bg-white/60 text-sm font-medium text-[#8B4513] transition-colors hover:border-[#FF6B35] hover:text-[#FF6B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-1"
          >
            {canShowNextPage ? "Next 3" : "Find more on this topic"}
          </button>
        </div>
      )}
    </div>
  )
}
