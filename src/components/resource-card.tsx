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
} from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { AnimatePresence, motion } from "framer-motion"
import { overallLabel } from "@/lib/curriculum-codes"
import { normalizeGrades } from "@/lib/utils"
import { useBookmarks } from "@/lib/bookmarks-context"
import { useState, useRef, useMemo } from "react"
import ReviewsModal from "./reviews-modal"
import FlagModal from "./flag-modal"
import { withBasePath } from "@/lib/base-path"
import { coverageForResource, type OverallCoverage, type BandCounts, type ReadinessLevel } from "@/lib/assessment-results"
import type { Resource } from "@/lib/types"

const READINESS_STYLES: Record<ReadinessLevel, { dot: string; text: string; label: string }> = {
  poor: { dot: "#B45309", text: "#92400E", label: "Needs Support" },
  okay: { dot: "#D97706", text: "#92400E", label: "Developing" },
  good: { dot: "#16A34A", text: "#15803D", label: "Strong" },
  great: { dot: "#166534", text: "#14532D", label: "Excelling" },
}

// One pill per overall expectation (e.g. "D1") the resource covers.
//
// When the class has recorded data for the overall, the pill is colored by the
// rolled-up readiness of its children, and hover (desktop) / tap (mobile) opens
// a portaled panel with the per-child color-coded breakdown.
//
// When there's no recorded data (data.level === null) — the common case until a
// class runs assessments — the pill is rendered as a neutral, non-interactive
// chip so the card still surfaces every expectation the resource covers. It
// reuses the same "not assessed" greys as the per-child rows in the panel.
function OverallReadinessPill({ data }: { data: OverallCoverage }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  if (data.level === null) {
    const label = overallLabel(data.overall)
    const friendly = label !== data.overall ? label : null
    return (
      <span
        className="flex items-center gap-1 px-2 py-0.5 rounded-full border"
        style={{ borderColor: "#D4C5B540", backgroundColor: "#D4C5B515" }}
        title={friendly ?? undefined}
        aria-label={`${data.overall}${friendly ? ` ${friendly}` : ""} — not yet assessed`}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#D4C5B5" }} />
        <span className="text-[10px] font-semibold" style={{ color: "#A8998E" }}>{data.overall}</span>
      </span>
    )
  }

  const style = READINESS_STYLES[data.level]

  const openNow = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  // Small delay so moving the cursor from the pill into the panel doesn't flicker it shut.
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
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B35]/40"
          style={{ borderColor: style.dot + "40", backgroundColor: style.dot + "15" }}
          aria-label={`${data.overall} ${overallLabel(data.overall)} — ${style.label}`}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: style.dot }} />
          <span className="text-[10px] font-semibold" style={{ color: style.text }}>{data.overall}</span>
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
                className="z-[100] w-64 rounded-2xl border-2 border-[#E8D5C4] bg-white p-3 shadow-xl"
              >
                <p className="text-[11px] font-bold text-[#2C2C2C] mb-2">
                  {data.overall} · {overallLabel(data.overall)}
                </p>
                <ul className="space-y-1.5">
                  {data.children.map((child) => {
                    const cs = child.level ? READINESS_STYLES[child.level] : null
                    return (
                      <li key={child.code} className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cs ? cs.dot : "#D4C5B5" }}
                        />
                        <span
                          className="text-[11px] font-semibold flex-shrink-0"
                          style={{ color: cs ? cs.text : "#A8998E" }}
                        >
                          {child.code}
                        </span>
                        <span className="text-[10px] text-[#888] ml-auto">
                          {cs ? cs.label : "Not assessed"}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}

// ── Subject-based card theme ───────────────────────────────────────────────
function getSubjectTheme(subject: string) {
  const s = (subject || "").toLowerCase()
  if (s.includes("math"))
    return { bg: "bg-[#F0FDF4]", border: "border-[#86EFAC]", dot: "bg-[#166534]", badge: "bg-gradient-to-r from-[#166534] to-[#14532D] text-white", label: "text-[#166534]" }
  if (s.includes("science"))
    return { bg: "bg-[#EFF6FF]", border: "border-[#93C5FD]", dot: "bg-[#1E40AF]", badge: "bg-gradient-to-r from-[#1E3A8A] to-[#1E293B] text-white", label: "text-[#1E40AF]" }
  if (s.includes("language") || s.includes("english") || s.includes("french") || s.includes("literacy"))
    return { bg: "bg-[#FEFCE8]", border: "border-[#FDE047]", dot: "bg-[#CA8A04]", badge: "bg-gradient-to-r from-[#CA8A04] to-[#A16207] text-white", label: "text-[#92400E]" }
  if (s.includes("social") || s.includes("history") || s.includes("geo"))
    return { bg: "bg-[#F5F3FF]", border: "border-[#C4B5FD]", dot: "bg-[#7C3AED]", badge: "bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white", label: "text-[#7C3AED]" }
  if (s.includes("health") || s.includes("physical"))
    return { bg: "bg-[#FFF7ED]", border: "border-[#FED7AA]", dot: "bg-[#EA580C]", badge: "bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white", label: "text-[#EA580C]" }
  if (s.includes("art") || s.includes("music") || s.includes("drama") || s.includes("dance"))
    return { bg: "bg-[#FDF4FF]", border: "border-[#E9D5FF]", dot: "bg-[#A21CAF]", badge: "bg-gradient-to-r from-[#A21CAF] to-[#86198F] text-white", label: "text-[#A21CAF]" }
  return { bg: "bg-[#FFF5ED]", border: "border-[#FFB627]", dot: "bg-[#FF6B35]", badge: "bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white", label: "text-[#C65D3B]" }
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

// ── Use-case label ─────────────────────────────────────────────────────────
function getUseCaseLabel(resource: Resource): string {
  const m = (Array.isArray(resource.modality) ? resource.modality.join(", ") : (resource.modality ?? "")).toLowerCase()
  const text = `${(resource.description ?? "").toLowerCase()} ${(resource.topic_title ?? "").toLowerCase()}`
  const codes = resource.curriculum_expectations?.length ?? 0

  if (m.includes("interactive") || m.includes("web interactive")) {
    if (text.includes("game") || text.includes("puzzle")) return "Game-based practice"
    if (text.includes("simulation") || text.includes("explor")) return "Hands-on exploration tool"
    return "Interactive learning tool"
  }
  if (m.includes("video") || m.includes("film")) {
    if (text.includes("introduc") || text.includes("overview") || text.includes("what is") || text.includes("what are"))
      return "Strong topic introduction"
    if (text.includes("how to") || text.includes("step") || text.includes("tutorial"))
      return "Step-by-step tutorial"
    if (text.includes("documentary") || text.includes("histor") || text.includes("event"))
      return "Documentary / real-world context"
    return "Video explanation"
  }
  if (m.includes("book") || m.includes("print")) {
    if (text.includes("worksheet") || text.includes("exercise") || text.includes("practice problem") || text.includes("activity sheet"))
      return "Ready-to-use worksheets"
    if (text.includes("novel") || text.includes("story") || text.includes("fiction") || text.includes("narrative"))
      return "Narrative / fiction text"
    if (text.includes("textbook") || text.includes("reference") || text.includes("guide"))
      return "Student reference guide"
    if (codes > 6) return "Broad curriculum coverage"
    return "Detailed reading resource"
  }
  if (m.includes("audio") || m.includes("podcast")) return "Listening activity"
  if (m.includes("trip") || m.includes("field")) return "Field trip opportunity"
  if (m.includes("guest") || m.includes("speaker") || m.includes("workshop")) return "Expert-led learning"
  if (m.includes("project")) return "Project-based activity"

  // Online / web / default
  if (text.includes("lesson plan") || text.includes("unit plan")) return "Ready-made lesson plan"
  if (text.includes("assessment") || text.includes("quiz") || text.includes("test")) return "Assessment tool"
  if (text.includes("worksheet") || text.includes("activity")) return "Classroom activity"
  if (text.includes("introduc") || text.includes("overview")) return "Good topic introduction"
  if (text.includes("comprehens") || text.includes("in-depth") || text.includes("detailed")) return "Comprehensive reference"
  if (codes > 5) return "Broad curriculum coverage"
  return "Curriculum-aligned resource"
}

// ── Accessibility indicator ────────────────────────────────────────────────
function getAccessibilityStyle(accessibilityArray) {
  const rating = (accessibilityArray?.[0] || "").toLowerCase()
  if (rating.includes("no concerns")) return { icon: "/icons/accessibility-green.svg", label: "No accessibility concerns" }
  if (rating.includes("some concerns")) return { icon: "/icons/accessibility-yellow.svg", label: "Some accessibility concerns" }
  return { icon: "/icons/accessibility-orange.svg", label: "Accessibility not reviewed" }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function CompactResourceCard({ resource, codeProgress }: { resource: Resource; codeProgress?: Record<string, BandCounts> }) {
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
  const grades = normalizeGrades(resource.grade_level)
  const displayGrade = grades[0] || ""

  const theme = getSubjectTheme(subject)
  const modalityStr = Array.isArray(resource.modality) ? resource.modality.join(", ") : (resource.modality ?? "")
  const { Icon: ModalityIcon, color: iconColor } = getPrimaryIcon(modalityStr)
  const useCaseLabel = getUseCaseLabel(resource)
  const accessLevel = getAccessibilityStyle(resource.accessibility)

  // Collapse the resource's specific expectations into overalls (D1.1… → D1).
  // Always lists every overall the resource covers; each carries a readiness
  // level when the class has data for it, or null (neutral pill) when it doesn't.
  const overallCoverage = useMemo(
    () => coverageForResource(resource.curriculum_expectations || [], codeProgress ?? {}),
    [resource.curriculum_expectations, codeProgress],
  )

  const description =
    resource.description ||
    `A curriculum-aligned resource for Grade ${displayGrade} ${subject} students.`

  const headerLine = [
    displayGrade ? `Grade ${displayGrade}` : null,
    subject || null,
    resource.strand?.[0] || null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="relative">
      <div className={`group/card rounded-2xl border-2 ${theme.border} ${theme.bg} shadow-sm transition-all duration-200 overflow-hidden hover:shadow-lg hover:shadow-black/5 hover:border-[#FF6B35]/40`}>

        {/* ── Header: grade · subject · strand + publisher · $ · bookmark ── */}
        <div className="bg-white px-3 py-2.5 border-b border-[#E8D5C4] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-1.5 h-4 rounded-full flex-shrink-0 ${theme.dot}`} />
            <p className="text-xs font-semibold text-[#2C2C2C] truncate">{headerLine}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {resource.publisher_creator && (
              <span className="text-[11px] text-[#888] truncate max-w-[90px] hidden sm:inline">{resource.publisher_creator}</span>
            )}
            {resource.is_paid && (
              <span className="text-[#C65D3B] text-xs font-black">$</span>
            )}
            <button
              onClick={() => setShowFlagModal(true)}
              className="p-1 rounded-lg text-[#A8998E] hover:text-[#C65D3B] hover:bg-[#FFE5CC] transition-colors duration-200"
              aria-label="Report an issue with this resource"
              title="Report an issue"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleToggleSave}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isSaved
                  ? "bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white shadow-md"
                  : "bg-[#F5F5F5] text-[#8B4513] hover:bg-[#FFE5CC]"
              }`}
              aria-label={isSaved ? "Remove from plan" : "Add to plan"}
            >
              {isSaved ? "Added" : "Add"}
            </button>
          </div>
        </div>

        {/* ── Body: use-case + title + description ── */}
        <div className="px-3 pt-2.5 pb-3 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <ModalityIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: iconColor }} />
            <span className={`text-[11px] font-semibold tracking-wide ${theme.label}`}>
              {useCaseLabel}
            </span>
          </div>

          <h3 className="text-sm font-bold text-[#2C2C2C] leading-snug">
            {resource.topic_title || `${resource.strand?.[0] || subject} – Grade ${displayGrade}`}
          </h3>

          <p className="text-[11px] text-[#555] leading-relaxed line-clamp-3">{description}</p>
        </div>

        {/* ── Footer: readiness · accessibility · modalities · view (one condensed row) ── */}
        <div className="bg-white px-3 py-2 border-t border-[#E8D5C4] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {overallCoverage.map((o) => (
              <OverallReadinessPill key={o.overall} data={o} />
            ))}

            <img
              src={withBasePath(accessLevel.icon)}
              alt={accessLevel.label}
              className="w-4 h-4 flex-shrink-0"
              title={accessLevel.label}
            />

            {(resource.modality || []).map((type, i) => {
              const { Icon, color } = getPrimaryIcon(type)
              return (
                <div key={i} className="relative group/modalityTip flex-shrink-0">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/modalityTip:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-nowrap">
                    <div className="bg-[#2C2C2C] text-white text-[10px] rounded-lg px-2 py-1 shadow-xl">{type}</div>
                  </div>
                </div>
              )
            })}
          </div>

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

      <ReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        resourceId={resourceId}
        resourceTitle={resource.topic_title || `${resource.strand?.[0] || subject} – Grade ${displayGrade}`}
      />

      <FlagModal
        isOpen={showFlagModal}
        onClose={() => setShowFlagModal(false)}
        resourceId={resourceId}
        resourceTitle={resource.topic_title || `${resource.strand?.[0] || subject} – Grade ${displayGrade}`}
      />
    </div>
  )
}
