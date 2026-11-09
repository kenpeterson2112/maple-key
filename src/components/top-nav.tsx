"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Settings, SlidersHorizontal, ChevronDown } from "lucide-react"
import SettingsModal from "@/components/settings-modal"
import MaterialsSummary from "@/components/materials-summary"
import AccountSheet from "@/components/account-sheet"
import { useBookmarks } from "@/lib/bookmarks-context"
import { withBasePath } from "@/lib/base-path"
import { readMaterialsSnapshot } from "@/lib/classroom-resources"
import { SPACE_ITEMS, type TopNavSpace } from "@/lib/nav-items"

export type { TopNavSpace }

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

// Desktop: logo, the four-space pill toggle, Materials, Settings.
// Phone: a slim 56px bar with the logo, Filters (on Search), Materials and the
// account avatar; the spaces move to the bottom tab bar (bottom-tab-bar.tsx).
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
  const openSettings = () => setIsSettingsOpen(true)

  const showResourceFilters = activeSpace === "resources" && !!onOpenMobileFilters

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-[1500px] px-4 md:px-6 md:py-2.5">
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
              <MaterialsMenu onEdit={openSettings} />
              <button
                onClick={openSettings}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-primary-tint"
                title="Settings"
              >
                <Settings size={20} className="text-foreground" />
              </button>
            </div>
          </div>

          {/* Phone */}
          <div className="flex h-14 items-center justify-between gap-2 md:hidden">
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
                className="h-10 w-auto object-contain"
              />
            </button>

            <div className="flex items-center gap-1">
              {showResourceFilters && (
                <button
                  onClick={onOpenMobileFilters}
                  className="flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-sm font-semibold text-secondary-strong shadow-sm"
                  aria-haspopup="dialog"
                >
                  <SlidersHorizontal size={14} aria-hidden="true" />
                  Filters
                  {totalActiveFilters > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {totalActiveFilters >= 10 ? "9+" : totalActiveFilters}
                      <span className="sr-only"> active</span>
                    </span>
                  )}
                </button>
              )}
              <MaterialsMenu onEdit={openSettings} compact />
              <AccountSheet onOpenSettings={openSettings} />
            </div>
          </div>
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}

/** The Materials button and its summary popover. `compact` is the phone's icon-only button. */
function MaterialsMenu({ onEdit, compact = false }: { onEdit: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  // Re-read the store each time the popover opens, so edits made in Settings show up.
  const materials = useMemo(() => readMaterialsSnapshot(), [open])

  const badge =
    materials.total > 0 ? (
      <span
        className={`rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground ${
          compact ? "absolute -right-0.5 -top-0.5 leading-none" : ""
        }`}
      >
        {materials.total}
      </span>
    ) : null

  return (
    <div ref={ref} className="relative">
      {compact ? (
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={`Classroom materials${materials.total > 0 ? `, ${materials.total} selected` : ""}`}
          aria-expanded={open}
          className="relative flex h-11 w-11 items-center justify-center rounded-full text-secondary-strong transition-colors hover:bg-accent"
        >
          <SlidersHorizontal size={20} aria-hidden="true" />
          {badge}
        </button>
      ) : (
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-semibold text-secondary-strong shadow-sm transition-all hover:bg-accent"
          title="Classroom materials"
        >
          <SlidersHorizontal size={14} className="text-primary-strong" />
          <span>Materials</span>
          {badge}
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      )}
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-2 shadow-xl">
          <MaterialsSummary
            snapshot={materials}
            onEdit={() => {
              setOpen(false)
              onEdit()
            }}
          />
        </div>
      )}
    </div>
  )
}

function SpaceToggle({
  activeSpace,
  onChangeSpace,
  planBadge = 0,
}: {
  activeSpace: TopNavSpace | null
  onChangeSpace: (space: TopNavSpace) => void
  /** Bookmarked-resource count shown on the Plan tab. */
  planBadge?: number
}) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm"
    >
      {SPACE_ITEMS.map((item) => {
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
            <Icon size={16} />
            <span>{item.label}</span>
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
