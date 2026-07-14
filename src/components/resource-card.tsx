"use client"
import {
  ExternalLink,
  BookOpen,
  Globe,
  Video,
  MousePointerClick,
  Headphones,
  MapPin,
  Users,
  Hammer,
  Mic,
  Flag,
  Plus,
  Check,
  BadgeCheck,
  Lightbulb,
} from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { AnimatePresence, motion } from "framer-motion"
import { normalizeGrades, gradeToNumber } from "@/lib/utils"
import { useBookmarks } from "@/lib/bookmarks-context"
import { useState, useRef } from "react"
import ReviewsModal from "./reviews-modal"
import FlagModal from "./flag-modal"
import { withBasePath } from "@/lib/base-path"
import { type LevelCounts } from "@/lib/assessment-results"
import { ReadinessPillRow } from "@/components/ui/readiness-pill"
import type { Resource } from "@/lib/types"

// Tips affordance — keeps usage_notes prose off the card face but rewards the
// hover/tap with the full note. Same hover-into-panel pattern as the pill.
function TipsPopover({ notes }: { notes: string }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const openNow = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const closeSoon = () => {
    clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 80)
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          className="flex items-center justify-center w-5 h-5 rounded-full text-muted-foreground hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/40 transition-colors"
          aria-label="Teaching tips"
          title="Teaching tips"
        >
          <Lightbulb className="w-3.5 h-3.5" />
        </button>
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content
              asChild
              sideOffset={6}
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onMouseEnter={openNow}
              onMouseLeave={closeSoon}
            >
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                className="z-[100] w-64 rounded-2xl border border-border bg-popover p-3 shadow-xl"
              >
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-popover-foreground mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-primary" /> Teaching tips
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{notes}</p>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}

// ── Subject-based card theme ───────────────────────────────────────────────
// Subject palette stays on hex for now — there are no per-subject tokens in
// :root (logged as remaining design-system debt in the handoff). Only `dot`
// (accent bar) and `badge` (View button) are used on the card today.
function getSubjectTheme(subject: string) {
  const s = (subject || "").toLowerCase()
  if (s.includes("math"))
    return { dot: "bg-[#166534]", badge: "bg-gradient-to-r from-[#166534] to-[#14532D] text-white" }
  if (s.includes("science"))
    return { dot: "bg-[#1E40AF]", badge: "bg-gradient-to-r from-[#1E3A8A] to-[#1E293B] text-white" }
  if (s.includes("fsl"))
    return { dot: "bg-[#0D9488]", badge: "bg-gradient-to-r from-[#0D9488] to-[#0F766E] text-white" }
  if (s.includes("language") || s.includes("english") || s.includes("french") || s.includes("literacy"))
    return { dot: "bg-[#CA8A04]", badge: "bg-gradient-to-r from-[#CA8A04] to-[#A16207] text-white" }
  if (s.includes("social") || s.includes("history") || s.includes("geo"))
    return { dot: "bg-[#7C3AED]", badge: "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white" }
  if (s.includes("health") || s.includes("physical"))
    return { dot: "bg-[#EA580C]", badge: "bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white" }
  if (s.includes("art") || s.includes("music") || s.includes("drama") || s.includes("dance"))
    return { dot: "bg-[#A21CAF]", badge: "bg-gradient-to-r from-[#A21CAF] to-[#86198F] text-white" }
  return { dot: "bg-[#FF6B35]", badge: "bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white" }
}

// ── Primary modality icon ──────────────────────────────────────────────────
function getPrimaryIcon(modality: string) {
  const m = (modality || "").toLowerCase()
  if (m.includes("interactive")) return { Icon: MousePointerClick, color: "#849657" }
  if (m.includes("video") || m.includes("film")) return { Icon: Video, color: "#FFC107" }
  if (m.includes("book") || m.includes("print")) return { Icon: BookOpen, color: "#D9742A" }
  if (m.includes("audio") || m.includes("podcast")) return { Icon: Headphones, color: "#FFC107" }
  if (m.includes("trip") || m.includes("field")) return { Icon: MapPin, color: "#4CAFB5" }
  if (m.includes("guest") || m.includes("speaker") || m.includes("workshop")) return { Icon: Users, color: "#849657" }
  if (m.includes("project")) return { Icon: Hammer, color: "#D9742A" }
  if (m.includes("podcast")) return { Icon: Mic, color: "#849657" }
  return { Icon: Globe, color: "#4CAFB5" }
}

// ── Accessibility indicator ────────────────────────────────────────────────
function getAccessibilityStyle(accessibilityArray: string[] | undefined) {
  const rating = (accessibilityArray?.[0] || "").toLowerCase()
  if (rating.includes("no concerns")) return { icon: "/icons/accessibility-green.svg", label: "No accessibility concerns" }
  if (rating.includes("some concerns")) return { icon: "/icons/accessibility-yellow.svg", label: "Some accessibility concerns" }
  return { icon: "/icons/accessibility-orange.svg", label: "Accessibility not reviewed" }
}

// ── Grade-range collapsing (§5) ─────────────────────────────────────────────
// PreK < K < 1…12. A `[3,4,5]` resource reads "Gr 3–5", not "Grade 3" — showing
// only the first grade made teachers dismiss valid multi-grade matches.
function formatGrade(n: number): string {
  if (n === -1) return "PreK"
  if (n === 0) return "K"
  return String(n)
}

function gradeBandLabel(band?: string): string | null {
  if (!band) return null
  if (band === "multi") return "Multi-grade"
  return band.charAt(0).toUpperCase() + band.slice(1)
}

function formatGradeRange(gradeLevel: unknown, band?: string): string | null {
  const nums = normalizeGrades(gradeLevel)
    .map(gradeToNumber)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
  if (nums.length === 0) return gradeBandLabel(band)
  const lo = nums[0]
  const hi = nums[nums.length - 1]
  // "Gr" prefix only when the low end is a numbered grade; K / PreK read on their own.
  const prefix = lo >= 1 ? "Gr " : ""
  if (lo === hi) return `${prefix}${formatGrade(lo)}`
  return `${prefix}${formatGrade(lo)}–${formatGrade(hi)}`
}

// ── Component ──────────────────────────────────────────────────────────────
export default function CompactResourceCard({ resource, codeProgress }: { resource: Resource; codeProgress?: Record<string, LevelCounts> }) {
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks()
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [showFlagModal, setShowFlagModal] = useState(false)

  const resourceId = resource.id || resource.topic_title || resource.url || Math.random().toString()
  const isSaved = isBookmarked(resourceId)

  const handleToggleSave = () => {
    if (isSaved) removeBookmark(resourceId)
    else addBookmark({ ...resource, id: resourceId })
  }

  const subject = resource.subject || "Math"
  const grade = resource.grade_level?.[0]?.toString()
  const theme = getSubjectTheme(subject)

  const title = resource.topic_title || `${resource.strand?.[0] || subject} Resource`

  const gradeRange = formatGradeRange(resource.grade_level, resource.grade_band)
  const strandStr = resource.strand?.length
    ? resource.strand[0] + (resource.strand.length > 1 ? ` +${resource.strand.length - 1}` : "")
    : null
  const contextParts = [gradeRange, subject, strandStr].filter(Boolean) as string[]

  const primaryModality = resource.modality?.[0]
  const { Icon: ModalityIcon, color: iconColor } = getPrimaryIcon(
    Array.isArray(resource.modality) ? resource.modality.join(", ") : (resource.modality ?? ""),
  )
  const accessLevel = getAccessibilityStyle(resource.accessibility)

  const isLicensed = resource.access_type === "licensed"
  const isPaid = !isLicensed && (resource.is_paid || resource.access_type === "purchase")
  const isNonEnglish = !!resource.language && resource.language.toLowerCase() !== "en"
  const verified = resource.metadata?.verified === true

  const description =
    resource.description ||
    `A curriculum-aligned ${subject} resource${gradeRange ? ` for ${gradeRange}` : ""}.`

  return (
    <div className="relative">
      <div className="group/card flex overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:border-primary/40">
        {/* Subject accent bar — full left edge, colored by getSubjectTheme */}
        <div className={`w-1.5 flex-shrink-0 ${theme.dot}`} aria-hidden="true" />

        <div className="min-w-0 flex-1 p-3 sm:p-4">
          {/* ── Title (headline) + verified · FR · Add ── */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 flex-1 font-sans text-base font-semibold leading-snug text-foreground line-clamp-2">
              {title}
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {verified && (
                <span title="Verified resource" aria-label="Verified resource" className="flex items-center text-signal-4">
                  <BadgeCheck className="w-4 h-4" />
                </span>
              )}
              {isNonEnglish && (
                <span
                  className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground"
                  title={`${resource.language?.toUpperCase()} resource`}
                >
                  {resource.language?.toUpperCase()}
                </span>
              )}
              <button
                onClick={handleToggleSave}
                className={`py-1 px-3 text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1 hover:scale-105 transform ${
                  isSaved
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-foreground hover:bg-muted"
                }`}
                aria-label={isSaved ? "Remove from plan" : "Add to plan"}
              >
                {isSaved ? "Added" : "Add"}
                {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* ── Context line: Grade(range) · Subject · Strand(+N) · Publisher ── */}
          {contextParts.length > 0 && (
            <p className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground">
              {contextParts.join(" · ")}
              {resource.publisher_creator && (
                <span className="hidden sm:inline"> · {resource.publisher_creator}</span>
              )}
              {resource.is_collection && (
                <span className="ml-1.5 align-middle inline-block rounded border border-border px-1 py-px text-[9px] font-semibold uppercase tracking-wide">
                  Collection
                </span>
              )}
            </p>
          )}

          {/* ── Description ── */}
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">{description}</p>

          {/* ── Footer: left cluster (wraps) + View anchored right ── */}
          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 border-t border-border/60 pt-2.5">
            {primaryModality && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-foreground/80">
                <ModalityIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: iconColor }} />
                {primaryModality}
              </span>
            )}

            <img
              src={withBasePath(accessLevel.icon)}
              alt={accessLevel.label}
              className="w-4 h-4 flex-shrink-0"
              title={accessLevel.label}
            />

            {isLicensed && (
              <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground" title="Licensed resource">
                Licensed
              </span>
            )}
            {isPaid && (
              <span className="text-sm font-black text-primary" title="Paid resource" aria-label="Paid resource">$</span>
            )}

            <ReadinessPillRow
              expectations={resource.curriculum_expectations || []}
              codeProgress={codeProgress}
              subject={subject}
              grade={grade}
            />

            {resource.usage_notes && <TipsPopover notes={resource.usage_notes} />}

            {/* Right-anchored actions: report + View. ml-auto kills the dead-air void. */}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setShowFlagModal(true)}
                className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                aria-label="Report an issue with this resource"
                title="Report an issue"
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  if (resource.url) window.open(resource.url, "_blank", "noopener,noreferrer")
                }}
                disabled={!resource.url}
                className={`flex-shrink-0 py-1 px-3 ${theme.badge} text-xs font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-1 hover:scale-105 transform ${
                  !resource.url ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                View
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        resourceId={resourceId}
        resourceTitle={title}
      />

      <FlagModal
        isOpen={showFlagModal}
        onClose={() => setShowFlagModal(false)}
        resourceId={resourceId}
        resourceTitle={title}
      />
    </div>
  )
}
