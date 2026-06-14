"use client"

import { Compass } from "lucide-react"
import PageHeader from "@/components/page-header"
import HeroPersonalize from "@/components/hero-personalize"
import SidebarFilters from "@/components/sidebar-filters"
import ResultsSection from "@/components/results-section"
import MobileFiltersDrawer from "@/components/mobile-filters-drawer"
import BackToTopButton from "@/components/back-to-top-button"
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
  isMobileFiltersOpen: boolean
  onCloseMobileFilters: () => void
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
  isMobileFiltersOpen,
  onCloseMobileFilters,
}: ResourcesSpaceProps) {
  return (
    <div className="flex flex-col h-full bg-[#FAF3E0] overflow-hidden">
      <PageHeader icon={Compass} title="Resources" iconColor="#C65D3B" iconBg="bg-[#FFE5CC]" />

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
        onClose={onCloseMobileFilters}
        filters={filters}
        setFilters={setFilters}
        sidebarFilters={sidebarFilters}
        onSidebarFilterChange={onSidebarFilterChange}
      />

      <BackToTopButton />
    </div>
  )
}
