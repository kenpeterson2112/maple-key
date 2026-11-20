"use client"

import { useState, type CSSProperties } from "react"
import * as Popover from "@radix-ui/react-popover"
import { BarChart3, Check, Settings, ChevronDown, Filter, Globe } from "lucide-react"
import AccountSheet from "@/components/account-sheet"
import SubjectDataBar from "@/components/subject-data-bar"
import { BottomSheet } from "@/components/ui/bottom-sheet"
import { GRADES, PROVINCES, SUBJECTS } from "@/components/hero-personalize"
import {
  StrandRows,
  StrandTimeline,
  Gauge,
  noProgressReason,
  provinceName,
  useClassProgress,
} from "@/components/context-strip"
import { useBookmarks } from "@/lib/bookmarks-context"
import { useGlobalFilters } from "@/lib/global-filters"
import MapleKeyLogo from "@/components/ui/maple-key-logo"
import { SPACE_ITEMS, type TopNavSpace } from "@/lib/nav-items"

export type { TopNavSpace }

interface TopNavProps {
  activeSpace: TopNavSpace | null
  onChangeSpace: (space: TopNavSpace) => void
  onOpenMobileFilters?: () => void
  totalActiveFilters?: number
  /** True while the landing page is showing (the logo reads as current). */
  isHome?: boolean
  /** Return to the landing page (the logo). */
  onGoHome?: () => void
  /** Open the Settings page. */
  onOpenSettings: () => void
  /** Open the Classroom profile page (materials, lesson defaults), from the phone account sheet. */
  onOpenClassroomProfile: () => void
  /** Hide the progress row (full-screen flows such as Quick Check). */
  hideStrip?: boolean
}

// Subject → its colour token. One value per subject does every job (CLAUDE.md).
function subjectColor(subject: string): string | null {
  return SUBJECTS.find((o) => o.value === subject)?.color ?? null
}

const SUBJECT_OPTIONS = SUBJECTS.map((o) => (o.value ? o : { ...o, label: "All subjects" }))
const GRADE_OPTIONS = GRADES.map((o) => (o.value ? o : { ...o, label: "All grades" }))

// The top nav is locked to the class being worked on (Nielsen: visibility of
// system status, recognition over recall). It is exactly two bars:
//   1. Navigation: the logo, the subject and grade pickers, the spaces as
//      quiet links, the province (a globe with its abbreviation) and the gear,
//      on a bar in the subject's colour (brand rust with none).
//   2. Subject data (subject-data-bar.tsx): the subject's curriculum timeline
//      by strand, opening into details with Analyze (to Progress); or, with no
//      class picked, the teacher's classes as chips.
// Suggestions and materials live on the landing page as widgets, not here.
// Phone: a 56px bar with one class chip (opening a sheet with the pickers and
// the full picture) and a one-line progress bar under it.
export default function TopNav({
  activeSpace,
  onChangeSpace,
  onOpenMobileFilters,
  totalActiveFilters = 0,
  isHome = false,
  onGoHome,
  onOpenSettings,
  onOpenClassroomProfile,
  hideStrip = false,
}: TopNavProps) {
  const { bookmarkedResources } = useBookmarks()
  const { state, setSubject, setGrade, setProvince } = useGlobalFilters()
  const [isClassSheetOpen, setIsClassSheetOpen] = useState(false)
  const openSettings = onOpenSettings

  const progress = useClassProgress(state.subject, state.grade)
  const color = subjectColor(state.subject)
  // The nav follows the selection on every page, the landing page included:
  // brand rust and a summary with no subject, the subject's colour and the
  // class's progress once one is picked.
  const scoped = color !== null
  // Text and fills in the bar's own colour (subject, else brand).
  const accent = scoped ? color : "var(--primary)"
  const accentText = scoped ? color : "var(--primary-strong)"
  // The bar is that colour mixed 30% into the page, with the logo and links in
  // --foreground (dark in light mode, light in dark mode). Mixed in OKLab so the
  // hue stays true; OKLCH would swing it through the background's hue.
  // `pnpm check:contrast` checks --foreground on every subject's bar.
  const barStyle: CSSProperties = {
    background: `color-mix(in oklab, ${accent} 30%, var(--background))`,
    color: "var(--foreground)",
  }
  const tintStyle: CSSProperties = {
    background: `color-mix(in oklab, ${accent} 9%, var(--background))`,
    borderColor: `color-mix(in oklab, ${accent} 30%, var(--background))`,
  }

  const pickSubject = (v: string) => setSubject(v)
  const pickGrade = (v: string) => setGrade(v)

  const showResourceFilters = activeSpace === "resources" && !!onOpenMobileFilters
  const classLabel = state.subject
    ? `${SUBJECTS.find((o) => o.value === state.subject)?.label ?? state.subject}${state.grade ? ` · Grade ${state.grade}` : ""}`
    : state.grade
      ? `Grade ${state.grade}`
      : "All classes"

  // The lockup sits straight on the bar, no tile, in the bar's text colour.
  const logo = (size: "sm" | "lg") => (
    <button
      type="button"
      onClick={onGoHome}
      aria-label="Maple Key home"
      aria-current={isHome ? "page" : undefined}
      className="flex flex-shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MapleKeyLogo className={size === "lg" ? "h-16" : "h-12"} />
    </button>
  )

  return (
    <>
      <header className="z-50 flex-shrink-0 pt-[env(safe-area-inset-top)]" style={barStyle}>
        {/* Row 1 */}
        <div style={barStyle}>
          <div className="mx-auto max-w-[1500px] px-4 md:px-6">
            {/* Desktop */}
            {/* Each desktop layer has a fixed height, so the page below never shifts
                as data loads or the selection changes. */}
            <div className="hidden h-20 items-center gap-3 md:flex">
              {logo("lg")}
              <div className="ml-3 flex items-center gap-2">
                <ContextSelect label="Subject" value={state.subject} options={SUBJECT_OPTIONS} onChange={pickSubject} color={accentText} />
                <ContextSelect label="Grade" value={state.grade} options={GRADE_OPTIONS} onChange={pickGrade} color={accentText} />
              </div>
              <SpaceLinks
                activeSpace={activeSpace}
                onChangeSpace={onChangeSpace}
                planBadge={bookmarkedResources.length}
              />
              <ProvincePicker value={state.province} onChange={setProvince} backdrop={barStyle.background as string} />
              <button
                onClick={openSettings}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-card/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <AccountSheet onOpenSettings={openSettings} onOpenClassroomProfile={onOpenClassroomProfile} />
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: subject data. The timeline, or the class chips with none picked. */}
        {!hideStrip && (
          <div className="relative border-b" style={tintStyle}>
            <div className="mx-auto hidden h-20 max-w-[1500px] items-center px-6 md:flex">
              <SubjectDataBar
                subject={state.subject}
                grade={state.grade}
                progress={progress}
                accent={accent}
                onOpenProgress={() => onChangeSpace("progress")}
                onPickClass={(subject, grade) => {
                  setSubject(subject)
                  setGrade(grade)
                }}
              />
            </div>

            {/* Phone: one line, tap for the sheet. Nothing on the landing page. */}
            {scoped && (
              <button
                type="button"
                onClick={() => setIsClassSheetOpen(true)}
                className="flex h-14 w-full flex-col justify-center gap-1.5 px-4 text-left md:hidden"
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
              <button
                type="button"
                onClick={() => {
                  setIsClassSheetOpen(false)
                  onChangeSpace("progress")
                }}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border-strong bg-card text-sm font-semibold text-secondary-strong transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <BarChart3 size={18} aria-hidden="true" />
                Open Progress
              </button>
              {progress.ongoingStrands.length > 0 && (
                <p className="-mt-2 text-xs text-muted-foreground">
                  Ongoing in every lesson: {progress.ongoingStrands.map((s) => `${s.code} ${s.label}`).join(", ")}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{noProgressReason(state.subject, state.grade)}</p>
          )}
        </div>
      </BottomSheet>

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
  const current = options.find((o) => o.value === value)?.label ?? ""
  return (
    <label className="relative flex items-center">
      <span className="sr-only">{label}</span>
      {/* The pill's own text is transparent and the value is drawn centred on
          top. Centring the select's text instead (text-align-last) also
          centres the options in Chrome's open menu, which reads badly. */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 cursor-pointer appearance-none rounded-full bg-card px-9 text-sm font-bold text-transparent shadow-sm focus-visible:outline-none keyboard:focus-visible:ring-2 keyboard:focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value} className="text-left font-normal text-foreground">
            {o.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute inset-0 flex items-center justify-center truncate px-9 text-sm font-bold"
        style={{ color }}
        aria-hidden="true"
      >
        {current}
      </span>
      <ChevronDown size={14} className="pointer-events-none absolute right-3" style={{ color }} aria-hidden="true" />
    </label>
  )
}

/** The province, low key: a globe with its abbreviation, opening a short list.
 *  It's rarely changed, so it sits quietly beside the gear rather than with
 *  the subject and grade. Settings carries the same choice. */
function ProvincePicker({
  value,
  onChange,
  backdrop,
}: {
  value: string
  onChange: (value: string) => void
  /** The bar's colour, behind the abbreviation so the globe's lines don't cross it. */
  backdrop: string
}) {
  const [open, setOpen] = useState(false)
  const name = provinceName(value)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title={`Province: ${name}`}
          aria-label={`Province: ${name}. Change province`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full opacity-80 transition hover:bg-card/50 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Globe size={26} strokeWidth={1.5} aria-hidden="true" />
          {value && (
            <span
              className="absolute rounded-sm px-0.5 text-[10px] font-bold leading-none"
              style={{ background: backdrop }}
              aria-hidden="true"
            >
              {value}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          // Open on the current province rather than the top of the list.
          onOpenAutoFocus={(e) => {
            const current = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>("[aria-current]")
            if (!current) return
            e.preventDefault()
            current.focus()
          }}
          className="z-[60] w-64 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl motion-safe:animate-fade-in"
        >
          <p className="px-3 pb-1 pt-1.5 text-xs font-semibold text-muted-foreground">Province</p>
          <ul className="max-h-128 overflow-y-auto">
            {PROVINCES.map((p) => {
              const selected = p.value === value
              return (
                <li key={p.value || "any"}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p.value)
                      setOpen(false)
                    }}
                    aria-current={selected ? "true" : undefined}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      selected ? "bg-primary-tint font-semibold text-primary-strong" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {p.value ? p.label : "Anywhere in Canada"}
                    {selected && <Check size={16} aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
        className="h-11 rounded-xl border border-border-strong bg-input px-3 text-base font-semibold text-foreground focus-visible:outline-none keyboard:focus-visible:ring-2 keyboard:focus-visible:ring-ring"
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

/** The four spaces as quiet text links on the bar. The progress row leads into
 *  Progress too, so they don't need to be the loudest thing on the page. */
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
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold underline-offset-[6px] transition-colors hover:bg-card/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
