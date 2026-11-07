"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, Lightbulb, BarChart3, BookOpen, Settings, Menu, X, SlidersHorizontal, ChevronDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import SettingsModal from "@/components/settings-modal"
import MaterialsSummary from "@/components/materials-summary"
import { useBookmarks } from "@/lib/bookmarks-context"
import { withBasePath } from "@/lib/base-path"
import { readMaterialsSnapshot } from "@/lib/classroom-resources"

export type TopNavSpace = "lessonplanner" | "resources" | "insights" | "lessons"

interface TopNavProps {
  activeSpace: TopNavSpace | null
  onChangeSpace: (space: TopNavSpace) => void
  onOpenMobileFilters?: () => void
  totalActiveFilters?: number
  /** True while the landing page is showing — the logo reads as the active tab. */
  isHome?: boolean
  /** Return to the landing page. The logo is the only affordance for it, which
   *  keeps the four working spaces in the toggle and adds no extra chrome. */
  onGoHome?: () => void
}

interface ToggleItem {
  id: TopNavSpace
  label: string
  icon: LucideIcon
}

const TOGGLE_ITEMS: ToggleItem[] = [
  { id: "lessonplanner", label: "Plan",    icon: Lightbulb },
  { id: "resources",     label: "Search",  icon: Search },
  { id: "insights",      label: "Track",   icon: BarChart3 },
  { id: "lessons",       label: "Lessons", icon: BookOpen },
]


export default function TopNav({
  activeSpace,
  onChangeSpace,
  onOpenMobileFilters,
  totalActiveFilters = 0,
  isHome = false,
  onGoHome,
}: TopNavProps) {
  const { bookmarkedResources } = useBookmarks()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-[1500px] px-4 md:px-6 py-2.5">
          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between gap-4 relative">
            <div className="flex items-center gap-3 z-10">
              <button
                type="button"
                onClick={onGoHome}
                aria-label="Maple Key home"
                aria-current={isHome ? "page" : undefined}
                className={`rounded-xl p-1 transition-colors hover:bg-primary-tint ${isHome ? "bg-primary-tint" : ""}`}
              >
                <img
                  src={withBasePath("/maple-key-logo.png")}
                  alt="Maple Key"
                  width={785}
                  height={673}
                  className="h-14 w-auto object-contain"
                />
              </button>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2">
              <SpaceToggle
                activeSpace={activeSpace}
                onChangeSpace={onChangeSpace}
                planBadge={bookmarkedResources.length}
              />
            </div>

            <div className="flex items-center gap-2 z-10">
              <div ref={materialsRef} className="relative">
                <button
                  onClick={openMaterialsPopover}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-secondary-strong shadow-sm transition-all hover:bg-accent"
                  title="Classroom materials"
                >
                  <SlidersHorizontal size={14} className="text-primary-strong" />
                  <span>Materials</span>
                  {materials.total > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                      {materials.total}
                    </span>
                  )}
                  <ChevronDown size={14} className="text-muted-foreground" />
                </button>
                {isMaterialsOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card shadow-xl z-50 p-2">
                    <MaterialsSummary snapshot={materials} onEdit={openSettingsFromMaterials} />
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-primary-tint"
                title="Settings"
              >
                <Settings size={20} className="text-foreground" />
              </button>
            </div>
          </div>

          {/* Mobile */}
          <div className="flex md:hidden items-center justify-between gap-2">
            <button
              type="button"
              onClick={onGoHome}
              aria-label="Maple Key home"
              aria-current={isHome ? "page" : undefined}
              className={`rounded-lg p-0.5 transition-colors ${isHome ? "bg-primary-tint" : ""}`}
            >
              <img
                src={withBasePath("/maple-key-logo.png")}
                alt="Maple Key"
                width={785}
                height={673}
                className="h-11 w-auto object-contain"
              />
            </button>

            <SpaceToggle
              activeSpace={activeSpace}
              onChangeSpace={onChangeSpace}
              planBadge={bookmarkedResources.length}
              compact
            />

            <div className="flex items-center gap-1">
              {showResourceFilters && (
                <button
                  onClick={onOpenMobileFilters}
                  className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-secondary-strong shadow-sm"
                  title="Filters"
                >
                  <SlidersHorizontal size={12} />
                  Filters
                  {totalActiveFilters > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {totalActiveFilters >= 10 ? "9+" : totalActiveFilters}
                    </span>
                  )}
                </button>
              )}
              <button
                onClick={() => setIsMobileMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-primary-tint"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? <X size={18} className="text-foreground" /> : <Menu size={18} className="text-foreground" />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden mt-3 rounded-2xl border-2 border-border bg-card p-3 shadow-lg space-y-2">
              <div className="rounded-lg bg-muted px-3 py-2">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <SlidersHorizontal size={16} />
                  Materials
                  {materials.total > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
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
                className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm font-semibold text-secondary-strong"
              >
                <Settings size={16} />
                Settings
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
  planBadge = 0,
  compact = false,
}: {
  activeSpace: TopNavSpace | null
  onChangeSpace: (space: TopNavSpace) => void
  /** Bookmarked-resource count shown on the Plan tab. */
  planBadge?: number
  compact?: boolean
}) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm"
    >
      {TOGGLE_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeSpace === item.id
        const showBadge = item.id === "lessonplanner" && planBadge > 0
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChangeSpace(item.id)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-secondary-strong hover:bg-accent"
            }`}
          >
            <Icon size={compact ? 14 : 16} />
            {!compact && <span>{item.label}</span>}
            {compact && <span className="sr-only">{item.label}</span>}
            {showBadge && (
              <span
                className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                  isActive ? "bg-primary-foreground/25 text-primary-foreground" : "bg-primary text-primary-foreground"
                }`}
              >
                {planBadge >= 10 ? "9+" : planBadge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
