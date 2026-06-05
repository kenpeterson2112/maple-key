"use client"

import SearchHeader from "@/components/search-header"
import HeroPersonalize from "@/components/hero-personalize"
import SidebarFilters from "@/components/sidebar-filters"
import ResultsSection from "@/components/results-section"
import MobileFiltersDrawer from "@/components/mobile-filters-drawer"
import BackToTopButton from "@/components/back-to-top-button"
import { useState } from "react"
import type { Filters } from "@/lib/types"

interface ResourcesSpaceProps {
  filters: Filters
  setFilters: (filters: Filters) => void
  sidebarFilters: { modality: string[]; cost: string[]; accessibility: string[]; readiness: string[] }
  onSidebarFilterChange: (group: string, items: string[]) => void
  resultCount: number
  onCountChange: (count: number) => void
  inferred: boolean
  onReset: () => void
  totalActiveFilters: number
  onBack?: () => void
  onOpenInsights?: () => void
}

export default function ResourcesSpace({
  filters,
  setFilters,
  sidebarFilters,
  onSidebarFilterChange,
  resultCount,
  onCountChange,
  inferred,
  onReset,
  totalActiveFilters,
  onBack,
  onOpenInsights,
}: ResourcesSpaceProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  return (
    <div className="flex flex-col h-full bg-[#FAF3E0] overflow-hidden">
      <SearchHeader
        filters={filters}
        setFilters={setFilters}
        onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
        totalActiveFilters={totalActiveFilters}
        onBack={onBack}
        onOpenInsights={onOpenInsights}
      />

      <HeroPersonalize
        filters={filters}
        setFilters={setFilters}
        resultCount={resultCount}
        inferred={inferred}
        onReset={onReset}
      />

      <div className="flex flex-1 min-h-0">
        <SidebarFilters onFilterChange={onSidebarFilterChange} sidebarFilters={sidebarFilters} />
        <div className="flex-1 min-w-0">
          <ResultsSection filters={filters} sidebarFilters={sidebarFilters} onCountChange={onCountChange} />
        </div>
      </div>

      <MobileFiltersDrawer
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        filters={filters}
        setFilters={setFilters}
        sidebarFilters={sidebarFilters}
        onSidebarFilterChange={onSidebarFilterChange}
      />

      <BackToTopButton />
    </div>
  )
}
