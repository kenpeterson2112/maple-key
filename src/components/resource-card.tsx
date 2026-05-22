"use client"
import {
  Bookmark,
  ExternalLink,
  Check,
  BookOpen,
  Globe,
  Video,
  MousePointerClick,
  Headphones,
  MapPin,
  Users,
  Hammer,
  Mic,
} from "lucide-react"
import { CURRICULUM_DESCRIPTIONS } from "@/lib/curriculum-codes"
import { useBookmarks } from "@/lib/bookmarks-context"
import { useState } from "react"
import ReviewsModal from "./reviews-modal"
import { withBasePath } from "@/lib/base-path"

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
function getUseCaseLabel(resource): string {
  const m = (resource.modality ?? "").toLowerCase()
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
export default function CompactResourceCard({ resource }) {
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks()
  const [showReviewsModal, setShowReviewsModal] = useState(false)

  const resourceId = resource.id || resource.topic_title || resource.url || Math.random().toString()
  const isSaved = isBookmarked(resourceId)

  const handleToggleSave = () => {
    if (isSaved) removeBookmark(resourceId)
    else addBookmark({ ...resource, id: resourceId })
  }

  const subject = resource.subject || "Math"
  const gradeLevel = resource.grade_level ? String(resource.grade_level) : ""
  const grades = gradeLevel.split(",").map((g) => g.trim())
  const displayGrade = grades[0]

  const theme = getSubjectTheme(subject)
  const { Icon: ModalityIcon, color: iconColor } = getPrimaryIcon(resource.modality ?? "")
  const useCaseLabel = getUseCaseLabel(resource)
  const accessLevel = getAccessibilityStyle(resource.accessibility)

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

        {/* ── Header: grade · subject · strand ── */}
        <div className="bg-white px-3 py-2.5 border-b border-[#E8D5C4] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-1.5 h-4 rounded-full flex-shrink-0 ${theme.dot}`} />
            <p className="text-xs font-semibold text-[#2C2C2C] truncate">{headerLine}</p>
          </div>
          <button
            onClick={handleToggleSave}
            className={`p-1.5 rounded-xl transition-all duration-200 flex-shrink-0 flex items-center justify-center ${
              isSaved
                ? "bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white shadow-md"
                : "bg-[#F5F5F5] text-[#A8998E] hover:bg-[#FFE5CC]"
            }`}
            aria-label={isSaved ? "Unsave resource" : "Save resource"}
          >
            <Bookmark className="w-3.5 h-3.5" fill={isSaved ? "currentColor" : "none"} />
          </button>
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

        {/* ── Footer: publisher · expectations · accessibility · paid · view ── */}
        <div className="bg-white px-3 py-2 border-t border-[#E8D5C4] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-[#888] truncate max-w-[110px]">
              {resource.publisher_creator || "Unknown"}
            </span>

            {resource.curriculum_expectations && resource.curriculum_expectations.length > 0 && (
              <div className="relative group/curriculumTooltip">
                <div className="flex items-center gap-0.5 cursor-help">
                  <Check className="w-3 h-3 text-emerald-500" strokeWidth={3} />
                  <span className="text-[11px] font-semibold text-emerald-600">
                    {resource.curriculum_expectations.length}
                  </span>
                </div>
                <div className="absolute bottom-full left-0 mb-2 w-[90%] min-w-[300px] max-w-[500px] opacity-0 group-hover/curriculumTooltip:opacity-100 transition-opacity pointer-events-none z-[100]">
                  <div className="bg-[#2C2C2C] text-white text-xs rounded-2xl p-4 shadow-xl max-h-56 overflow-y-auto">
                    <p className="font-bold mb-2">
                      Curriculum Expectations ({resource.curriculum_expectations.length})
                    </p>
                    <ul className="space-y-1.5">
                      {resource.curriculum_expectations.map((exp, i) => (
                        <li key={i} className="text-[11px] leading-relaxed">
                          {CURRICULUM_DESCRIPTIONS[exp] ? (
                            <><strong>{exp}:</strong> {CURRICULUM_DESCRIPTIONS[exp]}</>
                          ) : (
                            `• ${exp}`
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <img
              src={withBasePath(accessLevel.icon)}
              alt={accessLevel.label}
              className="w-4 h-4 flex-shrink-0"
              title={accessLevel.label}
            />

            {resource.is_paid && (
              <span className="text-[#C65D3B] text-xs font-black">$</span>
            )}
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
    </div>
  )
}
