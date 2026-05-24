"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import { motion } from "framer-motion"
import { Search, X, Plus, Compass } from "lucide-react"
import ResourceCard from "./resource-card"
import type { Filters, Resource } from "@/lib/types"
import { withBasePath } from "@/lib/base-path"

interface ResultsSectionProps {
  filters: Filters
  sidebarFilters?: { modality: string[]; cost: string[]; accessibility: string[] }
  onCountChange?: (count: number) => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ResultsSection({ filters, sidebarFilters, onCountChange }: ResultsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState(1)

  const { data, error, isLoading } = useSWR<{ resources: Resource[] }>(withBasePath("/resources.json"), fetcher, {
    refreshInterval: 3600000,
    revalidateOnFocus: false,
  })

  const filteredResources = useMemo(() => {
    const resources = data?.resources
    if (!resources || !Array.isArray(resources)) return []

    return resources.filter((resource) => {
      if (filters.province && filters.province !== "" && filters.province !== "Canada") {
        if (resource.province !== filters.province) return false
      }

      if (filters.grade && filters.grade !== "") {
        const selectedGrades = filters.grade.split(",").map((g) => g.trim())
        const resourceGrades = (resource.grade_level || []).map(String)
        if (!selectedGrades.some((g) => resourceGrades.includes(g))) return false
      }

      if (filters.subject && filters.subject !== "") {
        if (resource.subject?.toLowerCase() !== filters.subject.toLowerCase()) return false
      }

      if (filters.strand && filters.strand !== "") {
        const resourceStrands = resource.strand || []
        if (!resourceStrands.some((s) => s.toLowerCase() === filters.strand?.toLowerCase())) return false
      }

      if (sidebarFilters?.modality && sidebarFilters.modality.length > 0) {
        const resourceModalities = resource.modality || []
        if (!sidebarFilters.modality.some((m) => resourceModalities.includes(m))) return false
      }

      if (sidebarFilters?.cost && sidebarFilters.cost.length > 0) {
        const isPaidResource = resource.is_paid === true
        const hasFreeFilter = sidebarFilters.cost.includes("Free Only")
        const hasPaidFilter = sidebarFilters.cost.includes("Paid")
        if (hasFreeFilter && !hasPaidFilter && isPaidResource) return false
        if (hasPaidFilter && !hasFreeFilter && !isPaidResource) return false
      }

      if (sidebarFilters?.accessibility && sidebarFilters.accessibility.length > 0) {
        const hasMatch = sidebarFilters.accessibility.some((accessFilter) => {
          const resourceAccessibility = resource.accessibility?.[0] || ""
          if (accessFilter === "No concerns") return resourceAccessibility.toLowerCase().includes("no concerns")
          if (accessFilter === "Some Concerns") return resourceAccessibility.toLowerCase().includes("some concerns")
          if (accessFilter === "Not Accessible") return resourceAccessibility.toLowerCase().includes("not accessible")
          return false
        })
        if (!hasMatch) return false
      }

      return true
    })
  }, [data, filters, sidebarFilters])

  const keywordFilteredResources = useMemo(() => {
    if (searchQuery.length < 3) return filteredResources
    const query = searchQuery.toLowerCase()
    return filteredResources.filter((resource) => {
      const searchableFields = [
        resource.topic_title,
        resource.description,
        resource.publisher_creator,
        resource.subject,
        resource.province,
        resource.url,
        ...(resource.modality || []),
        ...(resource.strand || []),
        ...(resource.curriculum_expectations || []),
        ...(resource.accessibility || []),
      ]
      return searchableFields.some((field) => field && String(field).toLowerCase().includes(query))
    })
  }, [filteredResources, searchQuery])

  const sortedResources = useMemo(() => {
    const resources = [...keywordFilteredResources]
    return resources.sort((a, b) => {
      const codeA = a.curriculum_expectations?.[0] || "ZZZ"
      const codeB = b.curriculum_expectations?.[0] || "ZZZ"
      const codeCompare = codeA.localeCompare(codeB, undefined, { numeric: true })
      if (codeCompare !== 0) return codeCompare
      return (a.topic_title || "").localeCompare(b.topic_title || "")
    })
  }, [keywordFilteredResources])

  useEffect(() => {
    onCountChange?.(sortedResources.length)
  }, [sortedResources.length, onCountChange])

  // Reset to page 1 whenever the result set changes
  useEffect(() => {
    setPage(1)
  }, [sortedResources.length, searchQuery])

  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedResources.length / pageSize)
  const pagedResources = pageSize === 0 ? sortedResources : sortedResources.slice((page - 1) * pageSize, page * pageSize)
  const showingFrom = sortedResources.length === 0 ? 0 : pageSize === 0 ? 1 : (page - 1) * pageSize + 1
  const showingTo = pageSize === 0 ? sortedResources.length : Math.min(page * pageSize, sortedResources.length)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    if (query.length >= 3) {
      setIsSearching(true)
      setTimeout(() => setIsSearching(false), 300)
    }
  }

  const handleClearSearch = () => {
    setSearchQuery("")
    setIsSearching(false)
  }

  if (error) {
    return (
      <div className="w-full px-8 py-6">
        <div className="rounded-2xl border border-[#E8D5C4] bg-white py-12 text-center shadow-md">
          <p className="text-lg font-semibold text-red-600">Failed to load resources</p>
          <p className="mt-2 text-[#A8998E]">Please refresh the page to try again.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full px-8 py-6">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl border border-[#E8D5C4] bg-white/60"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Search bar + count + per-page dropdown — all on one sticky row */}
      <div className="flex-shrink-0 px-3 md:px-6 pt-3 md:pt-4 pb-2 flex items-center gap-3">
        <div className="relative flex-1 min-w-0 max-w-md">
          <div className="relative flex items-center rounded-xl border border-[#E8D5C4] bg-white px-3 py-2 shadow-sm transition-colors focus-within:border-[#FF6B35]">
            <Search size={16} className="mr-2 flex-shrink-0 text-[#A8998E]" />
            <input
              type="text"
              placeholder="Search within results…"
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1 bg-transparent text-sm text-[#2C2C2C] placeholder-[#A8998E] outline-none"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={handleClearSearch}
                className="rounded-full p-0.5 transition-colors hover:bg-[#FFE5CC]"
                title="Clear search"
              >
                <X size={14} className="text-[#A8998E]" />
              </button>
            )}
            {isSearching && searchQuery.length >= 3 && (
              <span className="ml-2 text-xs font-medium text-[#FF6B35]">Searching…</span>
            )}
          </div>
          {searchQuery.length > 0 && searchQuery.length < 3 && (
            <p className="absolute left-0 top-full mt-1 rounded border border-[#E8D5C4] bg-white px-2 py-0.5 text-xs text-[#A8998E] shadow-sm z-10">
              Type at least 3 characters to search
            </p>
          )}
        </div>

        {sortedResources.length > 0 && (
          <div className="flex flex-shrink-0 items-center gap-2 text-xs text-[#888]">
            <span className="hidden sm:inline whitespace-nowrap">
              Showing {showingFrom}–{showingTo} of {sortedResources.length} results
            </span>
            <span className="sm:hidden whitespace-nowrap">{sortedResources.length} results</span>
            <div className="flex items-center gap-1.5">
              <span className="whitespace-nowrap">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="rounded-lg border border-[#E8D5C4] bg-white px-2 py-1 text-xs text-[#666] cursor-pointer hover:border-[#FF6B35]/50 transition-colors"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={0}>All</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 md:px-6 pb-4">
        {sortedResources.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-6 max-w-md rounded-2xl border-2 border-dashed border-[#E8D5C4] bg-white/60 p-8 text-center"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFE5CC]">
              <Compass size={22} className="text-[#C65D3B]" />
            </div>
            <p className="text-base font-semibold text-[#2C2C2C]">No matches yet — try widening your search.</p>
            <p className="mt-1 text-sm text-[#8B4513]/70">
              Drop a filter above, switch to a different grade, or clear the search box.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`${filters.province}|${filters.grade}|${filters.subject}|${filters.strand}|${searchQuery}|${page}`}
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: pageSize <= 25 ? 0.04 : 0, delayChildren: 0.05 } },
            }}
            className="grid grid-cols-1 gap-3 md:gap-4"
          >
            {pagedResources.map((resource, i) => (
              <motion.div
                key={(resource.url || resource.topic_title || "") + i}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
                }}
              >
                <ResourceCard resource={resource} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-[#E8D5C4] text-sm text-[#666] hover:bg-[#FAF3E0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-[#888]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-[#E8D5C4] text-sm text-[#666] hover:bg-[#FAF3E0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        )}

        <div className="mt-8 mb-4 flex justify-center">
          <div className="mx-3 max-w-md rounded-2xl border-2 border-[#E8D5C4] bg-white p-4 text-center shadow-sm md:p-6">
            <p className="mb-3 text-sm font-medium text-[#2C2C2C] md:mb-4 md:text-base">
              Couldn't find a resource? Know of a good one?
            </p>
            <button
              onClick={() => setShowSubmitDialog(true)}
              className="mx-auto flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#F4845F] px-5 py-2 text-sm font-medium text-white transition-all duration-200 hover:from-[#E85A24] hover:to-[#E37350] md:px-6 md:text-base"
            >
              <Plus size={18} />
              Submit Resource
            </button>
          </div>
        </div>
      </div>

      {showSubmitDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setShowSubmitDialog(false)}
              className="absolute right-4 top-4 rounded-full p-1 transition-colors hover:bg-stone-100"
            >
              <X size={20} className="text-stone-600" />
            </button>
            <div className="pt-2 text-center">
              <p className="text-base leading-relaxed text-[#2C2C2C]">
                This is where you would usually submit a great resource for other teachers to use but we aren't
                accepting submissions at this time. Come back later!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
