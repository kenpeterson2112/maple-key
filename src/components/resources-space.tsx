"use client"

import { Compass } from "lucide-react"
import PageHeader from "@/components/page-header"
import SidebarFilters from "@/components/sidebar-filters"
import ResultsSection from "@/components/results-section"
import MobileFiltersDrawer from "@/components/mobile-filters-drawer"
import BackToTopButton from "@/components/back-to-top-button"
import { useGlobalFilters } from "@/lib/global-filters"

interface ResourcesSpaceProps {
  sidebarFilters: { modality: string[]; cost: string[]; accessibility: string[]; readiness: string[] }
  onSidebarFilterChange: (group: string, items: string[]) => void
  resultCount: number
  onCountChange: (count: number) => void
  isMobileFiltersOpen: boolean
  onCloseMobileFilters: () => void
  searchSeed?: { query: string; nonce: number }
  /** Opens the planner on its Resources step with the current selection. */
  onPlanWithSelection?: () => void
}

export default function ResourcesSpace({
  sidebarFilters,
  onSidebarFilterChange,
  resultCount,
  onCountChange,
  isMobileFiltersOpen,
  onCloseMobileFilters,
  searchSeed,
  onPlanWithSelection,
}: ResourcesSpaceProps) {
  // The class context (province, grade, subject, strand) comes from the one
  // shared store; the sidebar facets stay local to Search.
  const { filters } = useGlobalFilters()

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <PageHeader icon={Compass} title="Resources" iconColor="text-primary-strong" iconBg="bg-primary-tint" />

      <div className="flex flex-1 min-h-0">
        <SidebarFilters onFilterChange={onSidebarFilterChange} sidebarFilters={sidebarFilters} />
        <div className="flex-1 min-w-0">
          <ResultsSection filters={filters} sidebarFilters={sidebarFilters} onCountChange={onCountChange} searchSeed={searchSeed} onPlanWithSelection={onPlanWithSelection} />
        </div>
      </div>

      <MobileFiltersDrawer
        isOpen={isMobileFiltersOpen}
        onClose={onCloseMobileFilters}
        sidebarFilters={sidebarFilters}
        onSidebarFilterChange={onSidebarFilterChange}
        resultCount={resultCount}
      />

      <BackToTopButton />
    </div>
  )
}
