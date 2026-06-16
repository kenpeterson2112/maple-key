"use client"

import { useMemo, useState } from "react"
import { Search, SlidersHorizontal, Compass, Sparkles, ChevronUp } from "lucide-react"
import PlanResourceCard from "./plan-resource-card"
import MobileFiltersDrawer from "./mobile-filters-drawer"
import { useBookmarks } from "@/lib/bookmarks-context"
import { useFilteredResources, keywordFilter, sortResources, type SidebarFilters } from "@/lib/use-filtered-resources"
import type { Filters } from "@/lib/types"

const SUGGESTION_LIMIT = 3
const TOP_RESULTS_LIMIT = 8

interface PlanResourceSearchProps {
  filters: Filters
  setFilters: (filters: Filters) => void
  sidebarFilters: SidebarFilters
  onSidebarFilterChange: (group: string, items: string[]) => void
  onBrowseAll: () => void
}

export default function PlanResourceSearch({
  filters,
  setFilters,
  sidebarFilters,
  onSidebarFilterChange,
  onBrowseAll,
}: PlanResourceSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const { filteredResources, classProgress } = useFilteredResources(filters, sidebarFilters)
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks()

  const sortedResources = useMemo(() => {
    const keywordFiltered = keywordFilter(filteredResources, searchQuery)
    return sortResources(keywordFiltered)
  }, [filteredResources, searchQuery])

  const topResources = sortedResources.slice(0, TOP_RESULTS_LIMIT)
  const suggestions = sortedResources.slice(0, SUGGESTION_LIMIT)

  const primaryGrade = (filters.grade || "").split(",").filter(Boolean)[0] ?? ""
  const contextLabel = [primaryGrade ? `Grade ${primaryGrade}` : "", filters.subject || ""].filter(Boolean).join(" ")
  const searchPlaceholder = contextLabel ? `Search within ${contextLabel}…` : "Search resources…"
  const searchAriaLabel = contextLabel ? `Search resources within ${contextLabel}` : "Search resources"

  const resourceId = (resource: { id: string; topic_title: string; url: string }) =>
    resource.id || resource.topic_title || resource.url

  const handleToggleAdd = (resource: (typeof topResources)[number]) => {
    const id = resourceId(resource)
    if (isBookmarked(id)) {
      removeBookmark(id)
    } else {
      addBookmark(resource)
    }
  }

  const collapseToSuggestions = () => {
    setIsExpanded(false)
    setSearchQuery("")
  }

  // Default state: a tight "suggested for this lesson" strip. Discovery only when wanted.
  if (!isExpanded) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Sparkles size={14} className="flex-shrink-0 text-[#FF6B35]" aria-hidden="true" />
            <h3 className="truncate text-[11px] font-semibold uppercase tracking-wide text-[#8B4513]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
              {contextLabel ? `Suggested for ${contextLabel}` : "Suggested resources"}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#E8D5C4] bg-white px-2.5 py-1 text-xs font-medium text-[#8B4513] shadow-sm transition-colors hover:border-[#FF6B35] hover:text-[#FF6B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-1"
          >
            <Search size={13} aria-hidden="true" />
            Find more
          </button>
        </div>

        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#E8D5C4] bg-white/60 p-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE5CC]">
              <Compass size={18} className="text-[#C65D3B]" />
            </div>
            <p className="text-sm font-semibold text-[#2C2C2C]">No suggestions yet for this lesson.</p>
            <p className="text-xs text-[#8B4513]/70">Tap “Find more” to search the full resource library.</p>
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
          </div>
        )}
      </div>
    )
  }

  // Expanded state: the full search experience, revealed on demand.
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <div className="relative flex items-center rounded-xl border border-[#E8D5C4] bg-white px-3 py-2 shadow-sm transition-colors focus-within:border-[#FF6B35]">
            <Search size={16} className="mr-2 flex-shrink-0 text-[#A8998E]" />
            <input
              type="search"
              placeholder={searchPlaceholder}
              aria-label={searchAriaLabel}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm text-[#2C2C2C] placeholder-[#A8998E] outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsFiltersOpen(true)}
          aria-label="Open resource filters"
          aria-haspopup="dialog"
          className="flex flex-shrink-0 items-center gap-1.5 rounded-xl border border-[#E8D5C4] bg-white px-3 py-2 text-sm font-medium text-[#8B4513] shadow-sm transition-colors hover:border-[#FF6B35] hover:text-[#FF6B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-1"
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          Filter
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-xs text-[#A8998E]">
          {sortedResources.length === 0
            ? "No resources match yet — try adjusting filters or search."
            : `${sortedResources.length} resource${sortedResources.length === 1 ? "" : "s"} match${
                sortedResources.length > TOP_RESULTS_LIMIT ? " · showing top results" : ""
              }`}
        </p>
        <button
          type="button"
          onClick={collapseToSuggestions}
          className="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-[#8B4513] transition-colors hover:text-[#FF6B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-1 rounded"
        >
          <ChevronUp size={13} aria-hidden="true" />
          Show suggestions
        </button>
      </div>

      {sortedResources.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#E8D5C4] bg-white/60 p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFE5CC]">
            <Compass size={18} className="text-[#C65D3B]" />
          </div>
          <p className="text-sm font-semibold text-[#2C2C2C]">No matches yet — try widening your search.</p>
          <p className="text-xs text-[#8B4513]/70">Drop a filter, switch grade or subject, or clear the search box.</p>
        </div>
      ) : (
        <div className="flex max-h-[380px] flex-col gap-2 overflow-y-auto pr-1 md:max-h-[500px]">
          {topResources.map((resource, i) => {
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
            onClick={onBrowseAll}
            className="flex items-center justify-center rounded-2xl border-2 border-dashed border-[#E8D5C4] bg-white/60 px-4 py-3 text-sm font-medium text-[#8B4513] transition-colors hover:border-[#FF6B35] hover:text-[#FF6B35] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35] focus-visible:ring-offset-1"
          >
            Browse all {sortedResources.length} resource{sortedResources.length === 1 ? "" : "s"}
          </button>
        </div>
      )}

      <MobileFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={filters}
        setFilters={setFilters}
        sidebarFilters={sidebarFilters}
        onSidebarFilterChange={onSidebarFilterChange}
      />
    </div>
  )
}
