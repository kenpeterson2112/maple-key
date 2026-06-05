"use client"

import { useState } from "react"
import {
  ChevronDown,
  BookOpen,
  Globe,
  MousePointerClick,
  Video,
  Headphones,
  MapPin,
  Mic,
  DollarSign,
  CheckCircle2,
} from "lucide-react"
import { withBasePath } from "@/lib/base-path"

interface SidebarFiltersProps {
  onFilterChange: (filterGroup: string, selectedItems: string[]) => void
  sidebarFilters?: { [key: string]: string[] }
}

const GROUP_LABELS: Record<string, string> = {
  modality: "Modality",
  cost: "Cost",
  accessibility: "Accessibility",
  readiness: "Student Readiness",
}

const READINESS_OPTIONS = [
  { value: "no-data", label: "No class data yet", dot: "#9CA3AF" },
  { value: "poor",    label: "Needs Support",      dot: "#B45309" },
  { value: "okay",    label: "Developing",          dot: "#D97706" },
  { value: "good",    label: "Strong",              dot: "#16A34A" },
  { value: "great",   label: "Excelling",           dot: "#166534" },
]

export default function SidebarFilters({ onFilterChange, sidebarFilters: externalFilters }: SidebarFiltersProps) {
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
    modality: true,
    cost: true,
    accessibility: true,
    readiness: true,
  })
  const [internalFilters, setInternalFilters] = useState<{ [key: string]: string[] }>({
    modality: [],
    cost: [],
    accessibility: [],
    readiness: [],
  })

  const selectedFilters = externalFilters || internalFilters

  const filterOptions = {
    modality: ["Books & Print Media", "Online", "Interactive", "Video", "Audio/Podcast", "Trip", "Guest Speaker"],
    cost: ["Free Only", "Paid"],
    accessibility: ["No concerns", "Some Concerns (see details)", "Not Accessible"],
  }

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }))
  }

  const toggleFilter = (group: string, option: string) => {
    const current = selectedFilters[group] || []
    const updated = current.includes(option) ? current.filter((item) => item !== option) : [...current, option]

    if (!externalFilters) {
      setInternalFilters((prev) => ({
        ...prev,
        [group]: updated,
      }))
    }

    setTimeout(() => onFilterChange(group, updated), 0)
  }

  const handleClearAll = () => {
    if (!externalFilters) {
      setInternalFilters({
        modality: [],
        cost: [],
        accessibility: [],
        readiness: [],
      })
    }

    setTimeout(() => {
      onFilterChange("modality", [])
      onFilterChange("cost", [])
      onFilterChange("accessibility", [])
      onFilterChange("readiness", [])
    }, 0)
  }

  const totalActiveFilters = Object.values(selectedFilters).reduce((sum, arr) => sum + arr.length, 0)

  const getModalityIcon = (modality: string) => {
    const iconProps = { size: 14, className: "flex-shrink-0" }

    switch (modality) {
      case "Books & Print Media":
        return <BookOpen {...iconProps} style={{ color: "#D9742A" }} />
      case "Online":
        return <Globe {...iconProps} style={{ color: "#4CAFB5" }} />
      case "Interactive":
        return <MousePointerClick {...iconProps} style={{ color: "#849657" }} />
      case "Video":
        return <Video {...iconProps} style={{ color: "#FFC107" }} />
      case "Audio/Podcast":
        return <Headphones {...iconProps} style={{ color: "#D9742A" }} />
      case "Trip":
        return <MapPin {...iconProps} style={{ color: "#4CAFB5" }} />
      case "Guest Speaker":
        return <Mic {...iconProps} style={{ color: "#849657" }} />
      default:
        return null
    }
  }

  const getCostIcon = (cost: string) => {
    const iconProps = { size: 14, className: "flex-shrink-0" }

    switch (cost) {
      case "Free Only":
        return <CheckCircle2 {...iconProps} style={{ color: "#849657" }} />
      case "Paid":
        return <DollarSign {...iconProps} style={{ color: "#D9742A" }} />
      default:
        return null
    }
  }

  const getAccessibilityIcon = (accessibility: string) => {
    if (accessibility === "No concerns") {
      return (
        <img
          src={withBasePath("/icons/accessibility-green.svg")}
          alt="No concerns"
          width={14}
          height={14}
          className="flex-shrink-0"
        />
      )
    } else if (accessibility === "Some Concerns (see details)") {
      return (
        <img
          src={withBasePath("/icons/accessibility-yellow.svg")}
          alt="Some concerns"
          width={14}
          height={14}
          className="flex-shrink-0"
        />
      )
    } else if (accessibility === "Not Accessible") {
      return (
        <img
          src={withBasePath("/icons/accessibility-orange.svg")}
          alt="Not accessible"
          width={14}
          height={14}
          className="flex-shrink-0"
        />
      )
    }
    return null
  }

  return (
    <aside className="hidden md:block w-[20%] bg-[#FAF3E0] border-r border-[#E8D5C4] p-4 overflow-y-auto shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#8B4513]">Filters</h2>
          {totalActiveFilters > 0 && (
            <span className="px-2 py-0.5 bg-[#FF6B35] text-white text-xs font-semibold rounded-full">
              {totalActiveFilters}
            </span>
          )}
        </div>
        {totalActiveFilters > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-[#8B4513] hover:text-[#FF6B35] underline cursor-pointer transition-colors duration-150"
          >
            Clear All
          </button>
        )}
      </div>

      {Object.entries(filterOptions).map(([groupKey, options]) => (
        <div key={groupKey} className="mb-4 pb-4 border-b border-[#E8D5C4]">
          <button onClick={() => toggleGroup(groupKey)} className="flex items-center justify-between w-full mb-3 group">
            <h3 className="text-sm font-semibold text-[#8B4513] group-hover:text-[#FF6B35] transition-colors duration-150">
              {GROUP_LABELS[groupKey] ?? groupKey}
            </h3>
            <ChevronDown
              size={16}
              className={`text-[#A8998E] transition-transform duration-200 ${expandedGroups[groupKey] ? "" : "-rotate-90"}`}
            />
          </button>

          {expandedGroups[groupKey] && (
            <div className="space-y-2">
              {options.length === 0 ? (
                <p className="text-xs text-[#A8998E] italic">Loading...</p>
              ) : (
                options.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer group/item">
                    <input
                      type="checkbox"
                      checked={selectedFilters[groupKey]?.includes(option) || false}
                      onChange={() => toggleFilter(groupKey, option)}
                      className="w-4 h-4 rounded-lg border-[#E8D5C4] text-[#FF6B35] bg-white cursor-pointer transition-all duration-150 accent-[#FF6B35]"
                    />
                    {groupKey === "modality" && getModalityIcon(option)}
                    {groupKey === "cost" && getCostIcon(option)}
                    {groupKey === "accessibility" && getAccessibilityIcon(option)}
                    <span className="text-sm text-[#555] group-hover/item:text-[#8B4513] transition-colors duration-150">
                      {option}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      ))}

      {/* Student Readiness filter */}
      <div className="mb-4 pb-4">
        <button onClick={() => toggleGroup("readiness")} className="flex items-center justify-between w-full mb-3 group">
          <h3 className="text-sm font-semibold text-[#8B4513] group-hover:text-[#FF6B35] transition-colors duration-150">
            Student Readiness
          </h3>
          <ChevronDown
            size={16}
            className={`text-[#A8998E] transition-transform duration-200 ${expandedGroups.readiness ? "" : "-rotate-90"}`}
          />
        </button>
        {expandedGroups.readiness && (
          <div className="space-y-2">
            {READINESS_OPTIONS.map(({ value, label, dot }) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer group/item">
                <input
                  type="checkbox"
                  checked={selectedFilters.readiness?.includes(value) || false}
                  onChange={() => toggleFilter("readiness", value)}
                  className="w-4 h-4 rounded-lg border-[#E8D5C4] text-[#FF6B35] bg-white cursor-pointer transition-all duration-150 accent-[#FF6B35]"
                />
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                <span className="text-sm text-[#555] group-hover/item:text-[#8B4513] transition-colors duration-150">
                  {label}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
