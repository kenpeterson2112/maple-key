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
  { value: "no-data", label: "No class data yet", dot: "var(--muted-foreground)" },
  { value: "poor",    label: "Needs Support",      dot: "var(--signal-1)" },
  { value: "okay",    label: "Developing",          dot: "var(--signal-2)" },
  { value: "good",    label: "Strong",              dot: "var(--signal-3)" },
  { value: "great",   label: "Excelling",           dot: "var(--signal-4)" },
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
        return <BookOpen {...iconProps} className="flex-shrink-0 text-primary" />
      case "Online":
        return <Globe {...iconProps} className="flex-shrink-0 text-secondary" />
      case "Interactive":
        return <MousePointerClick {...iconProps} className="flex-shrink-0 text-secondary-strong" />
      case "Video":
        return <Video {...iconProps} className="flex-shrink-0 text-pop" />
      case "Audio/Podcast":
        return <Headphones {...iconProps} className="flex-shrink-0 text-primary" />
      case "Trip":
        return <MapPin {...iconProps} className="flex-shrink-0 text-secondary" />
      case "Guest Speaker":
        return <Mic {...iconProps} className="flex-shrink-0 text-secondary-strong" />
      default:
        return null
    }
  }

  const getCostIcon = (cost: string) => {
    const iconProps = { size: 14, className: "flex-shrink-0" }

    switch (cost) {
      case "Free Only":
        return <CheckCircle2 {...iconProps} className="flex-shrink-0 text-secondary-strong" />
      case "Paid":
        return <DollarSign {...iconProps} className="flex-shrink-0 text-primary" />
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
    <aside className="hidden md:block w-[20%] bg-muted border-r border-border p-4 overflow-y-auto shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground">Filters</h2>
          {totalActiveFilters > 0 && (
            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
              {totalActiveFilters}
            </span>
          )}
        </div>
        {totalActiveFilters > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-secondary-strong hover:text-primary underline cursor-pointer transition-colors duration-150"
          >
            Clear All
          </button>
        )}
      </div>

      {Object.entries(filterOptions).map(([groupKey, options]) => (
        <div key={groupKey} className="mb-4 pb-4 border-b border-border">
          <button onClick={() => toggleGroup(groupKey)} className="flex items-center justify-between w-full mb-3 group">
            <h3 className="text-sm font-semibold text-secondary-strong group-hover:text-primary transition-colors duration-150">
              {GROUP_LABELS[groupKey] ?? groupKey}
            </h3>
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform duration-200 ${expandedGroups[groupKey] ? "" : "-rotate-90"}`}
            />
          </button>

          {expandedGroups[groupKey] && (
            <div className="space-y-2">
              {options.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Loading...</p>
              ) : (
                options.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer group/item">
                    <input
                      type="checkbox"
                      checked={selectedFilters[groupKey]?.includes(option) || false}
                      onChange={() => toggleFilter(groupKey, option)}
                      className="w-4 h-4 rounded-lg border-border text-primary bg-card cursor-pointer transition-all duration-150 accent-primary"
                    />
                    {groupKey === "modality" && getModalityIcon(option)}
                    {groupKey === "cost" && getCostIcon(option)}
                    {groupKey === "accessibility" && getAccessibilityIcon(option)}
                    <span className="text-sm text-foreground group-hover/item:text-secondary-strong transition-colors duration-150">
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
          <h3 className="text-sm font-semibold text-secondary-strong group-hover:text-primary transition-colors duration-150">
            Student Readiness
          </h3>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform duration-200 ${expandedGroups.readiness ? "" : "-rotate-90"}`}
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
                  className="w-4 h-4 rounded-lg border-border text-primary bg-card cursor-pointer transition-all duration-150 accent-primary"
                />
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                <span className="text-sm text-foreground group-hover/item:text-secondary-strong transition-colors duration-150">
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
