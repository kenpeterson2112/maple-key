"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { Settings, SlidersHorizontal, ChevronDown, Filter } from "lucide-react"
import SettingsModal from "@/components/settings-modal"
import MaterialsSummary from "@/components/materials-summary"
import AccountSheet from "@/components/account-sheet"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { GRADES, SUBJECTS } from "@/components/hero-personalize"
import NextStepBar, { type NextStepHandlers } from "@/components/next-step-bar"
import {
  OverallStrip,
  StrandRows,
  StrandTimeline,
  SubjectStrip,
  Gauge,
  noProgressReason,
  provinceName,
  useClassProgress,
} from "@/components/context-strip"
import { useBookmarks } from "@/lib/bookmarks-context"
import { useGlobalFilters } from "@/lib/global-filters"
import { withBasePath } from "@/lib/base-path"
import { readMaterialsSnapshot } from "@/lib/classroom-resources"
import { SPACE_ITEMS, type TopNavSpace } from "@/lib/nav-items"

export type { TopNavSpace }

interface TopNavProps {
  activeSpace: TopNavSpace | null
  onChangeSpace: (space: TopNavSpace) => void
  onOpenMobileFilters?: () => void
  totalActiveFilters?: number
  /** True while the landing page is showing. The nav then wears the brand
   *  colour and summarises every class, whatever subject is selected. */
  isHome?: boolean
  /** Return to the landing page (the logo). */
  onGoHome?: () => void
  /** Choosing a subject or grade from the landing page enters that class. */
  onEnterClass?: () => void
  /** What the next-step suggestion's buttons do (layer 3). */
  nextStepHandlers: NextStepHandlers
  /** Hide the progress and next-step rows (full-screen flows such as Quick Check). */
  hideStrip?: boolean
}

// Subject → its colour token. One value per subject does every job (CLAUDE.md).
function subjectColor(subject: string): string | null {
  return SUBJECTS.find((o) => o.value === subject)?.color ?? null
}

const SUBJECT_OPTIONS = SUBJECTS.map((o) => (o.value ? o : { ...o, label: "All subjects" }))
const GRADE_OPTIONS = GRADES.map((o) => (o.value ? o : { ...o, label: "All grades" }))

// The top nav is locked to the class being worked on (Nielsen: visibility of
// system status, recognition over recall). Desktop has three layers:
//   1. Settings: the subject and grade pickers and the province, in the
//      subject's colour (brand red on the landing page or with none). The
//      spaces sit here as quiet links; the rows below lead into them too.
//   2. Where the class is: a gauge, the strand timeline, a link into Track; or
//      a summary across classes.
//   3. The next step, with its rationale (next-step-bar.tsx).
// Phone: a 56px bar with one class chip (opening a sheet with the pickers, the
// full picture and the next step) and a one-line progress bar under it.
export default function TopNav({
  activeSpace,
  onChangeSpace,
  onOpenMobileFilters,
  totalActiveFilters = 0,
  isHome = false,
  onGoHome,
  onEnterClass,
  nextStepHandlers,
  hideStrip = false,
}: TopNavProps) {
  const { bookmarkedResources } = useBookmarks()
  const { state, setSubject, setGrade } = useGlobalFilters()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isClassSheetOpen, setIsClassSheetOpen] = useState(false)
  const openSettings = () => setIsSettingsOpen(true)

  const progress = useClassProgress(state.subject, state.grade)
  const color = subjectColor(state.subject)
  const scoped = !isHome && color !== null
  // Text and fills in the bar's own colour (subject, else brand).
  const accent = scoped ? color : "var(--primary)"
  const accentText = scoped ? color : "var(--primary-strong)"
  const barStyle: CSSProperties | undefined = scoped ? { background: color, color: "var(--subject-foreground)" } : undefined
  const barClass = scoped ? "" : "bg-primary text-primary-foreground"
  const tintStyle: CSSProperties = {
    background: `color-mix(in oklch, ${accent} 9%, var(--background))`,
    borderColor: `color-mix(in oklch, ${accent} 30%, var(--background))`,
  }

  const choose = (apply: () => void) => {
    apply()
    if (isHome) onEnterClass?.()
  }
  const pickSubject = (v: string) => choose(() => setSubject(v))
  const pickGrade = (v: string) => choose(() => setGrade(v))

  const showResourceFilters = activeSpace === "resources" && !!onOpenMobileFilters
  const classLabel = state.subject
    ? `${SUBJECTS.find((o) => o.value === state.subject)?.label ?? state.subject}${state.grade ? ` · Grade ${state.grade}` : ""}`
    : state.grade
      ? `Grade ${state.grade}`
      : "All classes"

  const logo = (size: "sm" | "lg") => (
    <button
      type="button"
      onClick={onGoHome}
      aria-label="Maple Key home"
      aria-current={isHome ? "page" : undefined}
      className={`flex flex-shrink-0 items-center justify-center rounded-xl bg-card shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        size === "lg" ? "h-12 w-12" : "h-10 w-10"
      }`}
    >
      <img
        src={withBasePath("/maple-key-logo.png")}
        alt=""
        width={785}
        height={673}
        className={size === "lg" ? "h-10 w-auto object-contain" : "h-8 w-auto object-contain"}
      />
    </button>
  )

  return (
    <>
      <header className="z-50 flex-shrink-0 pt-[env(safe-area-inset-top)]" style={barStyle}>
        {/* Row 1 */}
        <div className={barClass} style={barStyle}>
          <div className="mx-auto max-w-[1500px] px-4 md:px-6">
            {/* Desktop */}
            <div className="hidden items-center gap-3 py-2.5 md:flex">
              {logo("lg")}
              <span className="font-display text-xl font-bold max-lg:hidden">Maple Key</span>
              <div className="ml-2 flex items-center gap-2">
                <ContextSelect label="Subject" value={state.subject} options={SUBJECT_OPTIONS} onChange={pickSubject} color={accentText} />
                <ContextSelect label="Grade" value={state.grade} options={GRADE_OPTIONS} onChange={pickGrade} color={accentText} />
                <button
                  type="button"
                  onClick={openSettings}
                  title="Province is set in Settings"
                  className="rounded-full px-2 py-1 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {provinceName(state.province)}
                </button>
              </div>
              <SpaceLinks
                activeSpace={activeSpace}
                onChangeSpace={onChangeSpace}
                planBadge={bookmarkedResources.length}
              />
              <MaterialsMenu onEdit={openSettings} />
              <button
                onClick={openSettings}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-card/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Settings"
                aria-label="Settings"
              >
                <Settings size={20} aria-hidden="true" />
              </button>
            </div>

            {/* Phone */}
            <div className="flex h-14 items-center gap-2 md:hidden">
              {logo("sm")}
              <button
                type="button"
                onClick={() => setIsClassSheetOpen(true)}
                aria-haspopup="dialog"
                aria-label={`Class: ${classLabel}. Change class or see progress`}
                className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-full bg-card px-3.5 text-sm font-bold shadow-sm"
                style={{ color: accentText }}
              >
                <span className="truncate">{classLabel}</span>
                <ChevronDown size={14} className="flex-shrink-0" aria-hidden="true" />
              </button>
              <div className="ml-auto flex items-center gap-1">
                {showResourceFilters && (
                  <button
                    onClick={onOpenMobileFilters}
                    className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card text-secondary-strong shadow-sm"
                    aria-haspopup="dialog"
                    aria-label="Filters"
                  >
                    <Filter size={18} aria-hidden="true" />
                    {totalActiveFilters > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1.5 text-[10px] font-bold leading-4 text-primary-foreground">
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
        </div>

        {/* Row 2: where the class is */}
        {!hideStrip && (
          <div className="border-b" style={tintStyle}>
            <div className="mx-auto hidden max-w-[1500px] px-6 py-3 md:block">
              {scoped && progress ? (
                <SubjectStrip progress={progress} accent={accent} onOpenTrack={() => onChangeSpace("insights")} />
              ) : (
                <OverallStrip
                  province={state.province}
                  note={isHome ? "Pick a subject and grade to step into a class." : noProgressReason(state.subject, state.grade)}
                />
              )}
            </div>

            {/* Phone: one line, tap for the sheet. Nothing on the landing page. */}
            {scoped && (
              <button
                type="button"
                onClick={() => setIsClassSheetOpen(true)}
                className="flex w-full flex-col gap-1.5 px-4 py-2 text-left md:hidden"
                aria-label={
                  progress
                    ? `${progress.taught} of ${progress.total} expectations taught${progress.frontier ? `, now on ${progress.frontier}` : ""}. Show progress`
                    : noProgressReason(state.subject, state.grade)
                }
              >
                {progress ? (
                  <>
                    <span className="flex items-center gap-2 text-xs text-foreground">
                      <strong>
                        {progress.taught}/{progress.total} taught
                      </strong>
                      {progress.frontier && (
                        <>
                          <span className="text-muted-foreground" aria-hidden="true">·</span>
                          <span>
                            Now: <strong>{progress.frontier}</strong>
                          </span>
                        </>
                      )}
                      {progress.needsWork && (
                        <span className="ml-auto font-semibold text-pop-strong">{progress.needsWork.code} needs work</span>
                      )}
                    </span>
                    <StrandTimeline progress={progress} showLabels={false} height="h-2" />
                  </>
                ) : (
                  <span className="text-xs text-foreground">{noProgressReason(state.subject, state.grade)}</span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Row 3: the next step (desktop; phones get it in the class sheet) */}
        {!hideStrip && (
          <div className="hidden border-b border-border bg-card md:block">
            <div className="mx-auto max-w-[1500px] px-6 py-3">
              <NextStepBar
                subject={state.subject}
                grade={state.grade}
                acrossClasses={!scoped}
                handlers={nextStepHandlers}
              />
            </div>
          </div>
        )}
      </header>

      <BottomSheet
        open={isClassSheetOpen}
        onOpenChange={setIsClassSheetOpen}
        title="Your class"
        description="Choose the subject and grade, and see where the class is."
      >
        <div className="flex flex-col gap-5 p-5">
          <div className="grid grid-cols-2 gap-3">
            <SheetSelect label="Subject" value={state.subject} options={SUBJECT_OPTIONS} onChange={pickSubject} />
            <SheetSelect label="Grade" value={state.grade} options={GRADE_OPTIONS} onChange={pickGrade} />
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            {provinceName(state.province)} curriculum.{" "}
            <button
              type="button"
              onClick={() => {
                setIsClassSheetOpen(false)
                openSettings()
              }}
              className="font-semibold text-secondary-strong underline"
            >
              Change in Settings
            </button>
          </p>

          {progress ? (
            <>
              <div className="flex items-center gap-3 rounded-2xl p-3" style={tintStyle}>
                <Gauge taught={progress.taught} total={progress.total} accent={color ?? "var(--primary)"} size={88} />
                <div className="flex flex-col gap-0.5 text-sm text-foreground">
                  <span>
                    <strong>
                      {progress.taught} of {progress.total}
                    </strong>{" "}
                    expectations taught
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {progress.checked} checked · {progress.lessonCount} {progress.lessonCount === 1 ? "lesson" : "lessons"}
                  </span>
                </div>
              </div>
              <StrandRows progress={progress} />
              {progress.ongoingStrands.length > 0 && (
                <p className="-mt-2 text-xs text-muted-foreground">
                  Ongoing in every lesson: {progress.ongoingStrands.map((s) => `${s.code} ${s.label}`).join(", ")}
                </p>
              )}
              <NextStepBar
                subject={state.subject}
                grade={state.grade}
                layout="stacked"
                handlers={{
                  onPlan: (...args) => {
                    setIsClassSheetOpen(false)
                    nextStepHandlers.onPlan(...args)
                  },
                  onFindResources: (...args) => {
                    setIsClassSheetOpen(false)
                    nextStepHandlers.onFindResources(...args)
                  },
                  onQuickCheck: (lesson) => {
                    setIsClassSheetOpen(false)
                    nextStepHandlers.onQuickCheck(lesson)
                  },
                }}
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{noProgressReason(state.subject, state.grade)}</p>
          )}
        </div>
      </BottomSheet>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}

/** A pill-shaped native select on the coloured bar. */
function ContextSelect({
  label,
  value,
  options,
  onChange,
  color,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  color: string
}) {
  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-full bg-card pl-4 pr-9 text-sm font-bold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ color }}
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value} className="text-foreground">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3" style={{ color }} aria-hidden="true" />
    </label>
  )
}

/** A labelled full-width select inside the phone sheet. */
function SheetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-border-strong bg-input px-3 text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
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
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-card text-secondary-strong shadow-sm transition-colors hover:bg-accent"
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

/** The four spaces as quiet text links on the bar. The layers below lead into
 *  them too (the progress row opens Track, the next step opens Plan/Search),
 *  so they no longer need to be the loudest thing on the page. */
function SpaceLinks({
  activeSpace,
  onChangeSpace,
  planBadge = 0,
}: {
  activeSpace: TopNavSpace | null
  onChangeSpace: (space: TopNavSpace) => void
  /** Bookmarked-resource count shown on Plan. */
  planBadge?: number
}) {
  return (
    <nav aria-label="Spaces" className="ml-auto flex items-center gap-1">
      {SPACE_ITEMS.map((item) => {
        const isActive = activeSpace === item.id
        const showBadge = item.id === "lessonplanner" && planBadge > 0
        return (
          <button
            key={item.id}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChangeSpace(item.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold underline-offset-[6px] transition-colors hover:bg-card/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              isActive ? "underline decoration-2" : ""
            }`}
          >
            {item.label}
            {showBadge && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-pop px-1 text-[9px] font-bold text-pop-foreground">
                {planBadge >= 10 ? "9+" : planBadge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
