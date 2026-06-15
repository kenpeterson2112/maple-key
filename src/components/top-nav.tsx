"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, BookOpen, BarChart3, Settings, LogIn, Menu, X, SlidersHorizontal, ChevronDown, Leaf, Calculator, Beaker, Globe, PenTool } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import SettingsModal from "@/components/settings-modal"
import MaterialsSummary from "@/components/materials-summary"
import InlinePicker from "@/components/inline-picker"
import { useBookmarks } from "@/lib/bookmarks-context"
import { withBasePath } from "@/lib/base-path"
import { readMaterialsSnapshot } from "@/lib/classroom-resources"
import { useGlobalFilters } from "@/lib/global-filters"
import { PROVINCES, GRADES, SUBJECTS } from "@/components/hero-personalize"
import { getStrandOptions } from "@/lib/get-strand-options"
import { STRAND_CODES } from "@/components/hero-personalize"

export type TopNavSpace = "resources" | "lessons" | "insights"
export type AllSpace = TopNavSpace | "lessonplanner" | "assessment"

interface TopNavProps {
  activeSpace: TopNavSpace | null
  fullActiveSpace?: AllSpace
  onChangeSpace: (space: TopNavSpace) => void
  onPlanLesson: () => void
  onOpenMobileFilters?: () => void
  totalActiveFilters?: number
}

interface ToggleItem {
  id: TopNavSpace
  label: string
  icon: LucideIcon
}

const TOGGLE_ITEMS: ToggleItem[] = [
  { id: "resources", label: "Resources", icon: Search },
  { id: "lessons",   label: "Lessons",   icon: BookOpen },
  { id: "insights",  label: "Insights",  icon: BarChart3 },
]


export default function TopNav({
  activeSpace,
  fullActiveSpace,
  onChangeSpace,
  onPlanLesson,
  onOpenMobileFilters,
  totalActiveFilters = 0,
}: TopNavProps) {
  const { bookmarkedResources } = useBookmarks()
  const { state, setProvince, setGrade, setSubject, setStrand } = useGlobalFilters()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showSignInHint, setShowSignInHint] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false)
  const [materialsTick, setMaterialsTick] = useState(0)
  const [mobileOpenFilter, setMobileOpenFilter] = useState<"province" | "grade" | "subject" | "strand" | null>(null)
  const materialsRef = useRef<HTMLDivElement>(null)

  const strandOptions = getStrandOptions(state.subject)
  const isStrandDisabled = state.subject === ""

  useEffect(() => {
    if (!isMaterialsOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (materialsRef.current && !materialsRef.current.contains(event.target as Node)) {
        setIsMaterialsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMaterialsOpen])

  // Re-read the store every time the popover opens or settings closes so edits land immediately.
  const materials = useMemo(
    () => readMaterialsSnapshot(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [materialsTick, isMaterialsOpen, isMobileMenuOpen]
  )

  const openMaterialsPopover = () => {
    setMaterialsTick((t) => t + 1)
    setIsMaterialsOpen((v) => !v)
  }

  const openSettingsFromMaterials = () => {
    setIsMaterialsOpen(false)
    setIsMobileMenuOpen(false)
    setIsSettingsOpen(true)
  }

  // When the settings modal closes, bump the tick so the next snapshot re-reads storage.
  const handleSettingsClose = () => {
    setIsSettingsOpen(false)
    setMaterialsTick((t) => t + 1)
  }

  const showResourceFilters = activeSpace === "resources" && !!onOpenMobileFilters

  const getPageTitle = (space: AllSpace | null | undefined): string => {
    switch (space) {
      case "resources":
        return "Resources"
      case "lessons":
        return "All Lessons"
      case "insights":
        return "Insights"
      case "lessonplanner":
        return "Planning"
      case "assessment":
        return "Assessment"
      default:
        return ""
    }
  }

  const getProvinceLabel = () => {
    if (!state.province) return "CA"
    return state.province.toUpperCase()
  }

  const getGradeLabel = () => {
    return state.grade ? state.grade : "K12"
  }

  const getSubjectIcon = () => {
    switch (state.subject) {
      case "Math":
        return <Calculator size={20} />
      case "Science":
        return <Beaker size={20} />
      case "Social Studies":
        return <Globe size={20} />
      case "Language":
        return <PenTool size={20} />
      case "FSL":
        return <span className="text-lg">⚜️</span>
      default:
        return <BookOpen size={20} />
    }
  }

  const getStrandLabel = () => {
    if (!state.strand) return ""
    return Object.entries(STRAND_CODES).find(([name]) => name === state.strand)?.[1] || state.strand[0]?.toUpperCase() || ""
  }

  // Use fullActiveSpace if provided, otherwise fall back to activeSpace
  const pageTitle = getPageTitle(fullActiveSpace || activeSpace)

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#E8D5C4] bg-[#FAF3E0]/90 backdrop-blur-md supports-[backdrop-filter]:bg-[#FAF3E0]/80">
        <div className="mx-auto max-w-[1500px] px-4 md:px-6 py-2.5">
          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between gap-4 relative">
            <div className="flex items-center gap-3 z-10">
              <img
                src={withBasePath("/maple-key-logo.png")}
                alt="Maple Key"
                width={785}
                height={673}
                className="h-14 w-auto object-contain"
              />

              <button
                onClick={onPlanLesson}
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all ${
                  bookmarkedResources.length > 0
                    ? "bg-[#FF6B35] text-white shadow-sm hover:bg-[#E85A24]"
                    : "bg-white border border-[#E8D5C4] text-[#8B4513] hover:bg-[#FFF5ED]"
                }`}
                title="Plan lesson"
              >
                Plan Lesson
                {bookmarkedResources.length > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
                    {bookmarkedResources.length >= 10 ? "9+" : bookmarkedResources.length}
                  </span>
                )}
              </button>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2">
              <SpaceToggle activeSpace={activeSpace} onChangeSpace={onChangeSpace} />
            </div>

            <div className="flex items-center gap-2 z-10">
              <div ref={materialsRef} className="relative">
                <button
                  onClick={openMaterialsPopover}
                  className="flex items-center gap-1.5 rounded-full border border-[#E8D5C4] bg-white px-3.5 py-2 text-sm font-semibold text-[#8B4513] shadow-sm transition-all hover:bg-[#FFF5ED]"
                  title="Classroom materials"
                >
                  <SlidersHorizontal size={14} className="text-[#C65D3B]" />
                  <span>Materials</span>
                  {materials.total > 0 && (
                    <span className="rounded-full bg-[#FF6B35] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {materials.total}
                    </span>
                  )}
                  <ChevronDown size={14} className="text-[#A8998E]" />
                </button>
                {isMaterialsOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[#E8D5C4] bg-white shadow-xl z-50 p-2">
                    <MaterialsSummary snapshot={materials} onEdit={openSettingsFromMaterials} />
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#FFE5CC]"
                title="Settings"
              >
                <Settings size={20} className="text-[#8B4513]" />
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowSignInHint((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#FF6B35] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#E85A24] hover:shadow-md"
                >
                  <LogIn size={14} />
                  Sign in
                </button>
                {showSignInHint && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#E8D5C4] bg-white p-4 text-sm text-[#2C2C2C] shadow-xl z-50">
                    <p className="font-semibold text-[#8B4513]">Save across devices</p>
                    <p className="mt-1 text-xs text-[#666]">
                      Sign-in is optional — your filters and bookmarks already save locally. Add an email to sync them
                      to other browsers.
                    </p>
                    <p className="mt-3 text-[11px] italic text-[#A8998E]">Coming soon.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center justify-between gap-1.5">
            <img
              src={withBasePath("/maple-key-logo.png")}
              alt="Maple Key"
              width={785}
              height={673}
              className="h-11 w-auto object-contain flex-shrink-0"
            />

            {/* Page Title */}
            {pageTitle && (
              <span className="text-sm font-semibold text-[#2C2C2C] whitespace-nowrap hidden sm:inline">
                {pageTitle}
              </span>
            )}

            {/* Filter Buttons */}
            {/* Province Button */}
            <button
              onClick={() => setMobileOpenFilter(mobileOpenFilter === "province" ? null : "province")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF5ED] border border-[#E8D5C4] text-[#8B4513] hover:bg-[#FFE5CC] transition-colors flex-shrink-0"
              title="Choose province"
            >
              <Leaf size={18} />
            </button>

            {/* Grade Button */}
            <button
              onClick={() => setMobileOpenFilter(mobileOpenFilter === "grade" ? null : "grade")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF5ED] border border-[#E8D5C4] text-[#8B4513] hover:bg-[#FFE5CC] transition-colors text-xs font-semibold flex-shrink-0"
              title="Choose grade"
            >
              {getGradeLabel()}
            </button>

            {/* Subject Button */}
            <button
              onClick={() => setMobileOpenFilter(mobileOpenFilter === "subject" ? null : "subject")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF5ED] border border-[#E8D5C4] text-[#8B4513] hover:bg-[#FFE5CC] transition-colors flex-shrink-0"
              title="Choose subject"
            >
              {getSubjectIcon()}
            </button>

            {/* Strand Button */}
            <button
              onClick={() => setMobileOpenFilter(mobileOpenFilter === "strand" ? null : "strand")}
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold transition-colors flex-shrink-0 ${
                isStrandDisabled
                  ? "bg-[#F5F5F5] border-[#E0E0E0] text-[#A8998E] cursor-not-allowed opacity-50"
                  : "bg-[#FFF5ED] border-[#E8D5C4] text-[#8B4513] hover:bg-[#FFE5CC]"
              }`}
              disabled={isStrandDisabled}
              title={isStrandDisabled ? "Select a subject first" : "Choose strand"}
            >
              {getStrandLabel() || "-"}
            </button>

            <div className="flex-1" />

            <button
              onClick={() => setIsMobileMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#FFE5CC] flex-shrink-0"
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X size={18} className="text-[#8B4513]" /> : <Menu size={18} className="text-[#8B4513]" />}
            </button>
          </div>

          {/* Mobile Filter Dropdowns */}
          {mobileOpenFilter && (
            <div className="md:hidden mt-2 rounded-2xl border border-[#E8D5C4] bg-white shadow-lg">
              {/* Province Dropdown */}
              {mobileOpenFilter === "province" && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#2C2C2C]">Province</h3>
                    <button
                      onClick={() => setMobileOpenFilter(null)}
                      className="p-1 hover:bg-[#F5F5F5] rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {PROVINCES.map((opt) => (
                      <button
                        key={opt.value || "__any"}
                        onClick={() => {
                          setProvince(opt.value)
                          setMobileOpenFilter(null)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          state.province === opt.value
                            ? "bg-[#FFE5CC] text-[#8B4513]"
                            : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#FFF5ED]"
                        }`}
                      >
                        {opt.value || "All"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Grade Dropdown */}
              {mobileOpenFilter === "grade" && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#2C2C2C]">Grade</h3>
                    <button
                      onClick={() => setMobileOpenFilter(null)}
                      className="p-1 hover:bg-[#F5F5F5] rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {GRADES.map((opt) => (
                      <button
                        key={opt.value || "__any"}
                        onClick={() => {
                          setGrade(opt.value)
                          setMobileOpenFilter(null)
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          state.grade === opt.value
                            ? "bg-[#FFE5CC] text-[#8B4513]"
                            : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#FFF5ED]"
                        }`}
                      >
                        {opt.value || "All"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject Dropdown */}
              {mobileOpenFilter === "subject" && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#2C2C2C]">Subject</h3>
                    <button
                      onClick={() => setMobileOpenFilter(null)}
                      className="p-1 hover:bg-[#F5F5F5] rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {SUBJECTS.map((opt) => (
                      <button
                        key={opt.value || "__any"}
                        onClick={() => {
                          setSubject(opt.value)
                          setMobileOpenFilter(null)
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          state.subject === opt.value
                            ? "bg-[#FFE5CC] text-[#8B4513]"
                            : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#FFF5ED]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Strand Dropdown */}
              {mobileOpenFilter === "strand" && !isStrandDisabled && (
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#2C2C2C]">Strand</h3>
                    <button
                      onClick={() => setMobileOpenFilter(null)}
                      className="p-1 hover:bg-[#F5F5F5] rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {strandOptions.map((opt) => (
                      <button
                        key={opt.value || "__any"}
                        onClick={() => {
                          setStrand(opt.value)
                          setMobileOpenFilter(null)
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          state.strand === opt.value
                            ? "bg-[#FFE5CC] text-[#8B4513]"
                            : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#FFF5ED]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {isMobileMenuOpen && (
            <div className="md:hidden mt-3 rounded-2xl border-2 border-[#E8D5C4] bg-white p-3 shadow-lg space-y-2">
              <div className="rounded-lg bg-[#FFF5ED] px-3 py-2">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#8B4513]">
                  <SlidersHorizontal size={16} />
                  Materials
                  {materials.total > 0 && (
                    <span className="rounded-full bg-[#FF6B35] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {materials.total}
                    </span>
                  )}
                </p>
                <MaterialsSummary snapshot={materials} onEdit={openSettingsFromMaterials} size="sm" />
              </div>
              <button
                onClick={() => {
                  setIsSettingsOpen(true)
                  setIsMobileMenuOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg bg-[#FFF5ED] px-3 py-2 text-sm font-semibold text-[#8B4513]"
              >
                <Settings size={16} />
                Settings
              </button>
              <button
                onClick={() => {
                  setShowSignInHint(true)
                  setIsMobileMenuOpen(false)
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#FF6B35] px-3.5 py-2 text-sm font-semibold text-white"
              >
                <LogIn size={14} />
                Sign in
              </button>
            </div>
          )}
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
    </>
  )
}

function SpaceToggle({
  activeSpace,
  onChangeSpace,
  compact = false,
}: {
  activeSpace: TopNavSpace | null
  onChangeSpace: (space: TopNavSpace) => void
  compact?: boolean
}) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="flex items-center gap-1 rounded-full border border-[#E8D5C4] bg-white p-1 shadow-sm"
    >
      {TOGGLE_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeSpace === item.id
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChangeSpace(item.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all ${
              isActive
                ? "bg-[#FF6B35] text-white shadow-sm"
                : "text-[#8B4513] hover:bg-[#FFF5ED]"
            }`}
          >
            <Icon size={compact ? 14 : 16} />
            {!compact && <span>{item.label}</span>}
            {compact && <span className="sr-only">{item.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
