"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Sparkles, Paperclip, X, ChevronRight, FileText, Compass } from "lucide-react"
import PlanResourceCard from "./plan-resource-card"
import UserMaterialsSection, { type UserMaterial } from "@/components/user-materials-section"
import { useBookmarks } from "@/lib/bookmarks-context"
import {
  useFilteredResources,
  sortResources,
  nextUpCodes,
  keywordFilter,
  type SidebarFilters,
} from "@/lib/use-filtered-resources"
import { cn } from "@/lib/utils"
import type { Filters, Resource } from "@/lib/types"

// Modality chips shared by the Search and Recommended panels — selecting any
// narrows the list to resources whose modality matches (OR across selections).
// Kept deliberately small; deeper faceting lives in the full resource browser.
const TYPE_CHIPS: { id: string; label: string; match: (modality: string) => boolean }[] = [
  { id: "interactive", label: "Interactive", match: (m) => m.includes("interactive") || m.includes("game") || m.includes("tool") },
  { id: "video", label: "Video", match: (m) => m.includes("video") || m.includes("film") },
  { id: "reading", label: "Reading", match: (m) => m.includes("book") || m.includes("print") || m.includes("article") || m.includes("text") },
  { id: "activity", label: "Activity", match: (m) => m.includes("activity") || m.includes("project") || m.includes("lesson") },
]

function modalityString(resource: Resource): string {
  return (Array.isArray(resource.modality) ? resource.modality.join(", ") : resource.modality ?? "").toLowerCase()
}

function applyTypeChips(resources: Resource[], active: string[]): Resource[] {
  if (active.length === 0) return resources
  const matchers = TYPE_CHIPS.filter((c) => active.includes(c.id))
  return resources.filter((r) => {
    const m = modalityString(r)
    return matchers.some((c) => c.match(m))
  })
}

function FilterChips({
  active,
  onToggle,
}: {
  active: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex flex-shrink-0 flex-wrap gap-2">
      {TYPE_CHIPS.map((chip) => {
        const on = active.includes(chip.id)
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onToggle(chip.id)}
            aria-pressed={on}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-input text-foreground hover:border-primary/50",
            )}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

interface PlanResourcePickerProps {
  filters: Filters
  sidebarFilters: SidebarFilters
  bookmarkedResources: Resource[]
  userMaterials: UserMaterial[]
  onUserMaterialsChange: (materials: UserMaterial[]) => void
  onBrowseAll: () => void
  /** Wizard mode fills the viewport height; all-options mode uses bounded heights. */
  fillHeight?: boolean
}

const resourceKey = (r: { id?: string; topic_title?: string; url?: string }) =>
  r.id || r.topic_title || r.url || ""

export default function PlanResourcePicker({
  filters,
  sidebarFilters,
  bookmarkedResources,
  userMaterials,
  onUserMaterialsChange,
  onBrowseAll,
  fillHeight = false,
}: PlanResourcePickerProps) {
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks()
  const { filteredResources, classProgress } = useFilteredResources(filters, sidebarFilters)

  // Row 1 (search) and the two squares (row 2) open independently.
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activePanel, setActivePanel] = useState<null | "recommend" | "addown">(null)
  const [typeFilters, setTypeFilters] = useState<string[]>([])
  const [trayCollapsed, setTrayCollapsed] = useState(false)

  const toggleType = (id: string) =>
    setTypeFilters((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  // Recommended: surface what the class should cover next (per strand) ahead of
  // plain order, then apply the shared modality chips.
  const priorityCodes = useMemo(
    () => nextUpCodes(filteredResources, classProgress),
    [filteredResources, classProgress],
  )
  const recommended = useMemo(
    () => applyTypeChips(sortResources(filteredResources, priorityCodes), typeFilters).slice(0, 12),
    [filteredResources, priorityCodes, typeFilters],
  )

  // Search: keyword over the same fields the full browser uses, then chips.
  const searchResults = useMemo(() => {
    const byQuery = keywordFilter(filteredResources, searchQuery)
    return applyTypeChips(sortResources(byQuery), typeFilters).slice(0, 30)
  }, [filteredResources, searchQuery, typeFilters])

  const handleToggleAdd = (resource: Resource) => {
    const id = resourceKey(resource)
    if (isBookmarked(id)) removeBookmark(id)
    else addBookmark(resource)
    setTrayCollapsed(false)
  }

  // Reset local view state when the lesson context genuinely changes. The modal
  // rebuilds the `filters`/`sidebarFilters` objects on every render, so we key
  // off their serialized values rather than object identity — otherwise every
  // re-render (e.g. adding a resource) would collapse the open panel.
  const contextKey = JSON.stringify([
    filters.province,
    filters.grade,
    filters.subject,
    filters.strand,
    sidebarFilters,
  ])
  useEffect(() => {
    setSearchQuery("")
    setSearchOpen(false)
    setActivePanel(null)
  }, [contextKey])

  const trayOpen = bookmarkedResources.length > 0 && !trayCollapsed

  return (
    <div className={cn("flex flex-col gap-3", fillHeight && "min-h-0 flex-1")}>
      <div
        className={cn(
          "grid gap-4 transition-[grid-template-columns] duration-300",
          fillHeight && "min-h-0 flex-1",
          trayOpen ? "grid-cols-1 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px]" : "grid-cols-1",
        )}
      >
        {/* ── Picker column ─────────────────────────────────────────────── */}
        <div className={cn("flex min-h-0 flex-col gap-3")}>
          {/* Search bar — expands in place to reveal filters + results */}
          <div
            className={cn(
              "rounded-2xl border border-border bg-card transition-colors",
              searchOpen ? "flex min-h-0 flex-1 flex-col px-5 pt-3" : "flex items-center px-5",
            )}
          >
            <div className={cn("flex w-full items-center gap-3", searchOpen ? "py-1" : "py-4")}>
              <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search the resource library…"
                aria-label="Search the resource library"
                className="w-full border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {searchOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("")
                    setSearchOpen(false)
                  }}
                  aria-label="Close search"
                  className="flex-shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {searchOpen && (
              <div className="flex min-h-0 flex-1 flex-col gap-3 pb-4 pt-1">
                <FilterChips active={typeFilters} onToggle={toggleType} />
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                  {searchResults.length === 0 ? (
                    <EmptyHint
                      icon={<Search className="h-4 w-4 text-primary" aria-hidden="true" />}
                      title={searchQuery.length > 0 && searchQuery.length < 3 ? "Keep typing…" : "No matches"}
                      body={
                        searchQuery.length > 0 && searchQuery.length < 3
                          ? "Enter at least three characters to search."
                          : "Try a different keyword, or adjust the grade and subject for this lesson."
                      }
                    />
                  ) : (
                    searchResults.map((resource, i) => {
                      const id = resourceKey(resource)
                      return (
                        <PlanResourceCard
                          key={id || i}
                          resource={resource}
                          codeProgress={classProgress}
                          isAdded={isBookmarked(id)}
                          onToggleAdd={() => handleToggleAdd(resource)}
                        />
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Two peer squares: Recommended | Add my own */}
          <div
            className={cn(
              "grid gap-4 transition-[grid-template-columns] duration-300",
              fillHeight && !searchOpen && "min-h-0 flex-1",
              activePanel === "recommend"
                ? "grid-cols-[1fr_120px]"
                : activePanel === "addown"
                  ? "grid-cols-[120px_1fr]"
                  : "grid-cols-2",
            )}
          >
            {/* Recommended */}
            <SquarePanel
              icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
              title="Recommended"
              description="A short list matched to your class, based on grade and subject."
              isActive={activePanel === "recommend"}
              isRail={activePanel === "addown"}
              onActivate={() => setActivePanel((p) => (p === "recommend" ? null : "recommend"))}
            >
              <FilterChips active={typeFilters} onToggle={toggleType} />
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                {recommended.length === 0 ? (
                  <EmptyHint
                    icon={<Compass className="h-4 w-4 text-primary" aria-hidden="true" />}
                    title="No suggestions yet"
                    body="Adjust the grade, subject, or strand to see matching resources."
                  />
                ) : (
                  recommended.map((resource, i) => {
                    const id = resourceKey(resource)
                    return (
                      <PlanResourceCard
                        key={id || i}
                        resource={resource}
                        codeProgress={classProgress}
                        isAdded={isBookmarked(id)}
                        onToggleAdd={() => handleToggleAdd(resource)}
                      />
                    )
                  })
                )}
                <button
                  type="button"
                  onClick={onBrowseAll}
                  className="mt-1 w-full rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  Find more in the full library
                </button>
              </div>
            </SquarePanel>

            {/* Add my own */}
            <SquarePanel
              icon={<Paperclip className="h-4 w-4" aria-hidden="true" />}
              title="Add my own"
              description="Upload a file or drop in a link to bring your own materials."
              isActive={activePanel === "addown"}
              isRail={activePanel === "recommend"}
              onActivate={() => setActivePanel((p) => (p === "addown" ? null : "addown"))}
            >
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <UserMaterialsSection materials={userMaterials} onChange={onUserMaterialsChange} />
              </div>
            </SquarePanel>
          </div>
        </div>

        {/* ── Tray ──────────────────────────────────────────────────────── */}
        {trayOpen && (
          <aside
            aria-label="Resources added to this lesson"
            className="flex min-h-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:sticky lg:top-0 lg:max-h-[78vh]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-bold text-foreground">Lesson materials</h3>
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary-foreground">
                  {bookmarkedResources.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTrayCollapsed(true)}
                aria-label="Collapse tray"
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {bookmarkedResources.map((resource, index) => {
                const id = resourceKey(resource)
                return (
                  <div
                    key={id || index}
                    className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2"
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-secondary/15 text-[11px] font-bold text-secondary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs leading-snug text-foreground">
                      {resource.topic_title}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBookmark(id)}
                      aria-label={`Remove ${resource.topic_title} from lesson`}
                      className="flex-shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-secondary"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )
              })}
            </div>
          </aside>
        )}
      </div>

      {/* Collapsed-tray affordance */}
      {bookmarkedResources.length > 0 && trayCollapsed && (
        <button
          type="button"
          onClick={() => setTrayCollapsed(false)}
          className="flex items-center justify-center gap-2 self-end rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {bookmarkedResources.length} resource{bookmarkedResources.length === 1 ? "" : "s"} · view
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

// One of the two peer squares. Collapses to a slim vertical rail when the other
// square is the active one.
function SquarePanel({
  icon,
  title,
  description,
  isActive,
  isRail,
  onActivate,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  isActive: boolean
  isRail: boolean
  onActivate: () => void
  children: React.ReactNode
}) {
  if (isRail) {
    return (
      <button
        type="button"
        onClick={onActivate}
        aria-label={`Open ${title}`}
        className="flex min-h-[220px] flex-col items-center gap-3 rounded-2xl border border-border bg-card p-4 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          {icon}
        </span>
        <span className="font-display text-sm font-bold [writing-mode:vertical-rl]">{title}</span>
      </button>
    )
  }

  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col rounded-2xl border border-border bg-card p-4",
        !isActive &&
          "cursor-pointer transition-colors hover:border-primary/50 focus-within:border-primary/50",
      )}
      role={isActive ? undefined : "button"}
      tabIndex={isActive ? undefined : 0}
      onClick={isActive ? undefined : onActivate}
      onKeyDown={
        isActive
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onActivate()
              }
            }
      }
      aria-label={isActive ? undefined : `Open ${title}`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
          {icon}
        </span>
        <span className="font-display text-base font-bold text-foreground">{title}</span>
      </div>
      {isActive ? (
        <div className="mt-2 flex min-h-0 flex-1 flex-col gap-3">{children}</div>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">{description}</p>
          <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            Click to open
          </div>
        </>
      )}
    </div>
  )
}

function EmptyHint({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-background p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/12">{icon}</div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="max-w-[36ch] text-xs text-muted-foreground">{body}</p>
    </div>
  )
}
