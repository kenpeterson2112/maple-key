"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, Sparkles, BarChart3, Settings, LogIn, Menu, X, SlidersHorizontal, ChevronDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import SettingsModal from "@/components/settings-modal"
import MaterialsSummary from "@/components/materials-summary"
import { useBookmarks } from "@/lib/bookmarks-context"
import { withBasePath } from "@/lib/base-path"
import { readMaterialsSnapshot } from "@/lib/classroom-resources"

export type TopNavSpace = "resources" | "lessons" | "insights"

interface TopNavProps {
  activeSpace: TopNavSpace | null
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
  { id: "lessons",   label: "Lessons",   icon: Sparkles },
  { id: "insights",  label: "Insights",  icon: BarChart3 },
]


export default function TopNav({
  activeSpace,
  onChangeSpace,
  onPlanLesson,
  onOpenMobileFilters,
  totalActiveFilters = 0,
}: TopNavProps) {
  const { bookmarkedResources } = useBookmarks()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showSignInHint, setShowSignInHint] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false)
  const [materialsTick, setMaterialsTick] = useState(0)
  const materialsRef = useRef<HTMLDivElement>(null)

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
          <div className="flex md:hidden items-center justify-between gap-2">
            <img
              src={withBasePath("/maple-key-logo.png")}
              alt="Maple Key"
              width={785}
              height={673}
              className="h-11 w-auto object-contain"
            />

            <SpaceToggle activeSpace={activeSpace} onChangeSpace={onChangeSpace} compact />

            <div className="flex items-center gap-1">
              {showResourceFilters && (
                <button
                  onClick={onOpenMobileFilters}
                  className="flex items-center gap-1 rounded-full border border-[#E8D5C4] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#8B4513] shadow-sm"
                  title="Filters"
                >
                  <SlidersHorizontal size={12} />
                  Filters
                  {totalActiveFilters > 0 && (
                    <span className="rounded-full bg-[#FF6B35] px-1.5 text-[10px] font-bold text-white">
                      {totalActiveFilters >= 10 ? "9+" : totalActiveFilters}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={onPlanLesson}
                className={`relative flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  bookmarkedResources.length > 0
                    ? "bg-[#FF6B35] text-white shadow-sm"
                    : "bg-white border border-[#E8D5C4] text-[#8B4513]"
                }`}
                title="Plan lesson"
              >
                Plan
                {bookmarkedResources.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[9px] font-bold">
                    {bookmarkedResources.length >= 10 ? "9+" : bookmarkedResources.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#FFE5CC]"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? <X size={18} className="text-[#8B4513]" /> : <Menu size={18} className="text-[#8B4513]" />}
              </button>
            </div>
          </div>

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
