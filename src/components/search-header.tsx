"use client"
import { MapPin, ChevronDown, SlidersHorizontal } from "lucide-react"
import type { Filters } from "@/lib/types"
import { useState, useEffect, useRef } from "react"

const EDTECH_SUBSCRIPTIONS = [
  { id: "edwin", name: "Edwin" },
  { id: "knowledgehook", name: "Knowledgehook" },
  { id: "amira", name: "Amira" },
  { id: "myon", name: "MyON" },
]

const PROVINCES = [
  { code: "", name: "Canada (All)" },
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
]

const SCHOOL_DISTRICTS = [
  { code: "", name: "All Districts" },
  { code: "TDSB", name: "Toronto DSB" },
  { code: "YRDSB", name: "York Region DSB" },
  { code: "DDSB", name: "Durham DSB" },
  { code: "PDSB", name: "Peel DSB" },
  { code: "TVDSB", name: "TVDSB" },
]

interface SearchHeaderProps {
  filters: Filters
  setFilters: (filters: Filters) => void
  onOpenMobileFilters?: () => void
  totalActiveFilters?: number
}

export default function SearchHeader({
  filters,
  setFilters,
  onOpenMobileFilters,
  totalActiveFilters = 0,
}: SearchHeaderProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [selectedDistrict, setSelectedDistrict] = useState<string>("")
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<string[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleDropdown = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown)
  }

  const handleProvinceChange = (code: string) => {
    setFilters({ ...filters, province: code })
    setOpenDropdown(null)
  }

  const handleDistrictChange = (code: string) => {
    setSelectedDistrict(code)
    setOpenDropdown(null)
  }

  const handleSubscriptionToggle = (subId: string) => {
    setSelectedSubscriptions((prev) => (prev.includes(subId) ? prev.filter((s) => s !== subId) : [...prev, subId]))
  }

  const currentProvince = PROVINCES.find((p) => p.code === filters.province) || PROVINCES[0]
  const currentDistrict = SCHOOL_DISTRICTS.find((d) => d.code === selectedDistrict) || SCHOOL_DISTRICTS[0]

  const locationLabel =
    selectedDistrict
      ? `${currentDistrict.code}${filters.province ? ` · ${filters.province}` : ""}`
      : filters.province
        ? currentProvince.code
        : "Canada"

  return (
    <header className="border-b border-[#E8D5C4] bg-[#FAF3E0]/90 backdrop-blur-md supports-[backdrop-filter]:bg-[#FAF3E0]/80">
      <div ref={containerRef} className="mx-auto max-w-[1500px] px-4 md:px-6 py-2">
        {/* Desktop toolbar */}
        <div className="hidden md:flex items-center justify-end gap-2">
              {/* Location pill (district + province combined trigger) */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("location")}
                  className="flex items-center gap-2 rounded-xl border border-[#E8D5C4] bg-white px-3 py-2 text-sm font-semibold text-[#8B4513] shadow-sm transition-all hover:border-[#FF6B35]/50 hover:bg-[#FFF5ED]"
                  title="Location & district"
                >
                  <MapPin size={16} className="text-[#C65D3B]" />
                  <span>{locationLabel}</span>
                  <ChevronDown size={14} className="text-[#A8998E]" />
                </button>
                {openDropdown === "location" && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[#E8D5C4] bg-white shadow-xl z-50">
                    <div className="border-b border-[#F0E8E0] p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A8998E]">
                        Province
                      </p>
                      <div className="max-h-44 overflow-y-auto">
                        {PROVINCES.map((p) => (
                          <button
                            key={p.code || "all"}
                            onClick={() => handleProvinceChange(p.code)}
                            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                              filters.province === p.code
                                ? "bg-[#FFE5CC] text-[#8B4513] font-semibold"
                                : "text-[#2C2C2C] hover:bg-[#FFF5ED]"
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#A8998E]">
                        School district
                      </p>
                      {SCHOOL_DISTRICTS.map((d) => (
                        <button
                          key={d.code || "all"}
                          onClick={() => handleDistrictChange(d.code)}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            selectedDistrict === d.code
                              ? "bg-[#FFE5CC] text-[#8B4513] font-semibold"
                              : "text-[#2C2C2C] hover:bg-[#FFF5ED]"
                          }`}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Subscriptions */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("subscriptions")}
                  className="flex items-center gap-2 rounded-xl border border-[#E8D5C4] bg-white px-3 py-2 text-sm font-semibold text-[#8B4513] shadow-sm transition-all hover:border-[#FF6B35]/50 hover:bg-[#FFF5ED]"
                  title="EdTech subscriptions"
                >
                  <SlidersHorizontal size={16} className="text-[#C65D3B]" />
                  <span>Subscriptions</span>
                  {selectedSubscriptions.length > 0 && (
                    <span className="rounded-full bg-[#FF6B35] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {selectedSubscriptions.length}
                    </span>
                  )}
                  <ChevronDown size={14} className="text-[#A8998E]" />
                </button>
                {openDropdown === "subscriptions" && (
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-[#E8D5C4] bg-white shadow-xl z-50">
                    <div className="p-2">
                      {EDTECH_SUBSCRIPTIONS.map((sub) => {
                        const isSelected = selectedSubscriptions.includes(sub.id)
                        return (
                          <button
                            key={sub.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSubscriptionToggle(sub.id)
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                              isSelected ? "bg-[#FFE5CC]" : "hover:bg-[#FFF5ED]"
                            }`}
                          >
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                                isSelected ? "border-[#FF6B35] bg-[#FF6B35]" : "border-[#E8D5C4]"
                              }`}
                            >
                              {isSelected && <span className="text-xs font-bold text-white">✓</span>}
                            </div>
                            <span className="text-sm text-[#2C2C2C]">{sub.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

        </div>

        {/* Mobile toolbar — just filters trigger; logo + nav live in TopNav */}
        <div className="flex md:hidden items-center justify-end gap-1.5">
          <button
            onClick={onOpenMobileFilters}
            className="flex items-center gap-1.5 rounded-xl border border-[#E8D5C4] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#8B4513] shadow-sm"
          >
            <SlidersHorizontal size={16} />
            Filters
            {totalActiveFilters > 0 && (
              <span className="rounded-full bg-[#FF6B35] px-1.5 text-[10px] font-bold text-white">
                {totalActiveFilters >= 10 ? "9+" : totalActiveFilters}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
