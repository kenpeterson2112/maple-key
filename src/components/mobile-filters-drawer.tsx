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
  SlidersHorizontal,
} from "lucide-react"
import { withBasePath } from "@/lib/base-path"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { SUBJECTS } from "@/components/hero-personalize"
import { getStrandValues } from "@/lib/get-strand-options"
import type { Filters } from "@/lib/types"

const AVAILABLE_GRADES = ["4", "5", "6", "7", "8", "9"]
const AVAILABLE_SUBJECTS = SUBJECTS.map((s) => s.value).filter(Boolean)

interface MobileFiltersDrawerProps {
  isOpen: boolean
  onClose: () => void
  filters: Filters
  setFilters: (filters: Filters) => void
  sidebarFilters: { [key: string]: string[] }
  onSidebarFilterChange: (filterGroup: string, selectedItems: string[]) => void
}

export default function MobileFiltersDrawer({
  isOpen,
  onClose,
  filters,
  setFilters,
  sidebarFilters,
  onSidebarFilterChange,
}: MobileFiltersDrawerProps) {
  const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({
    gradeSubject: true,
    modality: true,
    cost: true,
    accessibility: true,
    readiness: true,
  })
  const [selectedGrades, setSelectedGrades] = useState<string[]>(filters.grade ? filters.grade.split(",") : [])

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

  const toggleSidebarFilter = (group: string, option: string) => {
    const current = sidebarFilters[group] || []
    const updated = current.includes(option) ? current.filter((item) => item !== option) : [...current, option]
    onSidebarFilterChange(group, updated)
  }

  const handleGradeToggle = (grade: string) => {
    const newSelected = selectedGrades.includes(grade)
      ? selectedGrades.filter((g) => g !== grade)
      : [...selectedGrades, grade]
    setSelectedGrades(newSelected)
    setFilters({ ...filters, grade: newSelected.join(",") })
  }

  const handleSubjectChange = (subject: string) => {
    setFilters({ ...filters, subject, strand: "" })
  }

  const handleStrandChange = (strand: string) => {
    setFilters({ ...filters, strand })
  }

  const READINESS_OPTIONS = [
    { value: "no-data", label: "No class data yet", dot: "var(--muted-foreground)" },
    { value: "poor",    label: "Needs Support",      dot: "var(--signal-1)" },
    { value: "okay",    label: "Developing",          dot: "var(--signal-2)" },
    { value: "good",    label: "Strong",              dot: "var(--signal-3)" },
    { value: "great",   label: "Excelling",           dot: "var(--signal-4)" },
  ]

  const handleClearAll = () => {
    setFilters({
      province: "",
      grade: "",
      subject: "",
      strand: "",
      topic: "",
      learningType: "",
    })
    setSelectedGrades([])
    onSidebarFilterChange("modality", [])
    onSidebarFilterChange("cost", [])
    onSidebarFilterChange("accessibility", [])
    onSidebarFilterChange("readiness", [])
  }

  const totalActiveFilters =
    (filters.grade ? filters.grade.split(",").length : 0) +
    (filters.subject ? 1 : 0) +
    (filters.strand ? 1 : 0) +
    Object.values(sidebarFilters).reduce((sum, arr) => sum + arr.length, 0)

  const primaryGrade = (filters.grade || "").split(",").filter(Boolean)[0] ?? ""
  const availableStrands = filters.subject ? getStrandValues(filters.subject, primaryGrade) : []

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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="left"
        className="w-[85%] sm:max-w-[400px] bg-muted p-0 flex flex-col transition-transform duration-300 ease-in-out"
      >
        <SheetHeader className="border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={20} className="text-foreground" />
              <SheetTitle className="text-lg font-bold text-foreground">Filters</SheetTitle>
              {totalActiveFilters > 0 && (
                <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  {totalActiveFilters}
                </span>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Grade, Subject, Strand Section */}
          <div className="mb-4 pb-4 border-b border-border">
            <button
              onClick={() => toggleGroup("gradeSubject")}
              className="flex items-center justify-between w-full mb-3 group min-h-[44px]"
              aria-expanded={expandedGroups.gradeSubject}
              aria-controls="gradeSubject-content"
            >
              <h3 className="text-sm font-semibold text-secondary-strong group-hover:text-primary transition-colors duration-150">
                Grade & Subject
              </h3>
              <ChevronDown
                size={16}
                className={`text-muted-foreground transition-transform duration-200 ${expandedGroups.gradeSubject ? "" : "-rotate-90"}`}
              />
            </button>

            {expandedGroups.gradeSubject && (
              <div id="gradeSubject-content" className="space-y-4">
                {/* Grades */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Grade</p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_GRADES.map((grade) => {
                      const isSelected = selectedGrades.includes(grade)
                      return (
                        <button
                          key={grade}
                          onClick={() => handleGradeToggle(grade)}
                          className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-card border border-border text-foreground hover:border-secondary"
                          }`}
                          aria-pressed={isSelected}
                        >
                          {grade}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Subject</p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_SUBJECTS.map((subject) => {
                      const isSelected = filters.subject === subject
                      return (
                        <button
                          key={subject}
                          onClick={() => handleSubjectChange(isSelected ? "" : subject)}
                          className={`min-h-[44px] px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-secondary text-secondary-foreground"
                              : "bg-card border border-border text-foreground hover:border-secondary"
                          }`}
                          aria-pressed={isSelected}
                        >
                          {subject}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Strand */}
                {filters.subject && availableStrands.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Strand</p>
                    <div className="flex flex-wrap gap-2">
                      {availableStrands.map((strand) => {
                        const isSelected = filters.strand === strand
                        return (
                          <button
                            key={strand}
                            onClick={() => handleStrandChange(isSelected ? "" : strand)}
                            className={`min-h-[44px] px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? "bg-secondary text-secondary-foreground"
                                : "bg-card border border-border text-foreground hover:border-secondary"
                            }`}
                            aria-pressed={isSelected}
                          >
                            {strand}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modality, Cost, Accessibility Sections */}
          {Object.entries(filterOptions).map(([groupKey, options]) => (
            <div key={groupKey} className="mb-4 pb-4 border-b border-border">
              <button
                onClick={() => toggleGroup(groupKey)}
                className="flex items-center justify-between w-full mb-3 group min-h-[44px]"
                aria-expanded={expandedGroups[groupKey]}
                aria-controls={`${groupKey}-content`}
              >
                <h3 className="text-sm font-semibold text-secondary-strong capitalize group-hover:text-primary transition-colors duration-150">
                  {groupKey}
                </h3>
                <ChevronDown
                  size={16}
                  className={`text-muted-foreground transition-transform duration-200 ${expandedGroups[groupKey] ? "" : "-rotate-90"}`}
                />
              </button>

              {expandedGroups[groupKey] && (
                <div id={`${groupKey}-content`} className="space-y-2">
                  {options.map((option) => (
                    <label key={option} className="flex items-center gap-3 cursor-pointer group/item min-h-[44px] py-1">
                      <input
                        type="checkbox"
                        checked={sidebarFilters[groupKey]?.includes(option) || false}
                        onChange={() => toggleSidebarFilter(groupKey, option)}
                        className="w-5 h-5 rounded-lg border-border text-primary bg-card cursor-pointer transition-all duration-150 accent-primary"
                        aria-label={option}
                      />
                      {groupKey === "modality" && getModalityIcon(option)}
                      {groupKey === "cost" && getCostIcon(option)}
                      {groupKey === "accessibility" && getAccessibilityIcon(option)}
                      <span className="text-sm text-foreground group-hover/item:text-secondary-strong transition-colors duration-150">
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Student Readiness Section */}
          <div className="mb-4 pb-4">
            <button
              onClick={() => toggleGroup("readiness")}
              className="flex items-center justify-between w-full mb-3 group min-h-[44px]"
              aria-expanded={expandedGroups.readiness}
              aria-controls="readiness-content"
            >
              <h3 className="text-sm font-semibold text-secondary-strong group-hover:text-primary transition-colors duration-150">
                Student Readiness
              </h3>
              <ChevronDown
                size={16}
                className={`text-muted-foreground transition-transform duration-200 ${expandedGroups.readiness ? "" : "-rotate-90"}`}
              />
            </button>
            {expandedGroups.readiness && (
              <div id="readiness-content" className="space-y-2">
                {READINESS_OPTIONS.map(({ value, label, dot }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer group/item min-h-[44px] py-1">
                    <input
                      type="checkbox"
                      checked={sidebarFilters.readiness?.includes(value) || false}
                      onChange={() => toggleSidebarFilter("readiness", value)}
                      className="w-5 h-5 rounded-lg border-border text-primary bg-card cursor-pointer transition-all duration-150 accent-primary"
                      aria-label={label}
                    />
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                    <span className="text-sm text-foreground group-hover/item:text-secondary-strong transition-colors duration-150">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <SheetFooter className="border-t border-border p-4 gap-2">
          <button
            onClick={handleClearAll}
            className="flex-1 px-4 py-3 min-h-[48px] text-sm font-semibold text-secondary-strong bg-card border-2 border-border-strong rounded-xl hover:bg-accent transition-colors"
            aria-label="Clear all filters"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 min-h-[48px] text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary-hover transition-colors"
            aria-label="Apply filters and close"
          >
            Apply Filters
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
