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
  Star,
  MessageSquare,
} from "lucide-react"
import { CURRICULUM_DESCRIPTIONS } from "@/lib/curriculum-codes"
import { useBookmarks } from "@/lib/bookmarks-context"
import { useState } from "react"
import ReviewsModal from "./reviews-modal"
import { getReviewsForResource } from "@/lib/reviews-data"
import { withBasePath } from "@/lib/base-path"

export default function CompactResourceCard({ resource }) {
  const { addBookmark, removeBookmark, isBookmarked } = useBookmarks()
  const [showReviewsModal, setShowReviewsModal] = useState(false)

  const resourceId = resource.id || resource.topic_title || resource.url || Math.random().toString()
  const isSaved = isBookmarked(resourceId)

  const reviews = getReviewsForResource(resourceId)
  const reviewCount = reviews.length

  const handleToggleSave = () => {
    if (isSaved) {
      removeBookmark(resourceId)
    } else {
      addBookmark({ ...resource, id: resourceId })
    }
  }

  const provinceAbbreviations = {
    Alberta: "AB",
    "British Columbia": "BC",
    Manitoba: "MB",
    "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL",
    "Nova Scotia": "NS",
    Ontario: "ON",
    "Prince Edward Island": "PE",
    Quebec: "QC",
    Saskatchewan: "SK",
    "Northwest Territories": "NT",
    Nunavut: "NU",
    Yukon: "YT",
  }

  const provinceAbbr = resource.province
    ? provinceAbbreviations[resource.province] || resource.province.substring(0, 2).toUpperCase()
    : "ON"

  const getProvinceColor = (province: string) => {
    const colorMap = {
      ON: "from-[#DC2626] to-[#991B1B]", // Ontario: red
      AB: "from-[#1E40AF] to-[#1E3A8A]", // Alberta: blue
      BC: "from-[#059669] to-[#047857]", // BC: green
      QC: "from-[#0891B2] to-[#0E7490]", // Quebec: cyan
      MB: "from-[#D97706] to-[#B45309]", // Manitoba: amber
      NB: "from-[#7C3AED] to-[#6D28D9]", // NB: violet
      NL: "from-[#EC4899] to-[#DB2777]", // NL: pink
      NS: "from-[#0F766E] to-[#115E59]", // NS: teal
      PE: "from-[#BE185D] to-[#9F1239]", // PE: rose
      SK: "from-[#CA8A04] to-[#A16207]", // SK: yellow
      NT: "from-[#6366F1] to-[#4F46E5]", // NT: indigo
      NU: "from-[#64748B] to-[#475569]", // NU: slate
      YT: "from-[#2563EB] to-[#1D4ED8]", // YT: blue
    }
    return colorMap[province] || colorMap["ON"]
  }

  const provinceColor = getProvinceColor(provinceAbbr)

  const subject = resource.subject || "Math"

  const getSubjectColor = (subjectName: string) => {
    const normalizedSubject = subjectName.toLowerCase()
    const colorMap = {
      math: "from-[#166534] to-[#14532D]", // dark green
      science: "from-[#1E3A8A] to-[#1E293B]", // dark blue
      language: "from-[#CA8A04] to-[#A16207]", // mustard yellow
      "social studies": "from-[#7C3AED] to-[#6D28D9]", // purple
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(colorMap)) {
      if (normalizedSubject.includes(key)) {
        return value
      }
    }

    return colorMap["math"] // default
  }

  const subjectColor = getSubjectColor(subject)

  const gradeLevel = resource.grade_level ? String(resource.grade_level) : "6"
  const grades = gradeLevel.split(",").map((g) => g.trim())
  const displayGrade = grades[0]

  const resourceTypes = resource.modality ? resource.modality.split(",").map((m) => m.trim()) : ["Online"]

  const topicColors = {
    Probability: {
      bg: "bg-[#FFF5ED]",
      border: "border-[#FFB627]",
      badge: "bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white",
      hover: "hover:border-[#FFB627]",
    },
    "Financial Literacy": {
      bg: "bg-[#FFF5ED]",
      border: "border-[#90D356]",
      badge: "bg-gradient-to-r from-[#FFB627] to-[#FF6B35] text-white",
      hover: "hover:border-[#FFB627]",
    },
  }

  const colors = topicColors[resource.strand?.[0]] || topicColors["Probability"]

  const getAccessibilityStyle = (accessibilityArray) => {
    const rating = accessibilityArray?.[0] || ""

    if (rating.toLowerCase().includes("no concerns")) {
      return { icon: "/icons/accessibility-green.svg", label: "No concerns" }
    } else if (rating.toLowerCase().includes("some concerns")) {
      return { icon: "/icons/accessibility-yellow.svg", label: "Some concerns" }
    } else {
      return { icon: "/icons/accessibility-orange.svg", label: "Not accessible" }
    }
  }

  const accessLevel = getAccessibilityStyle(resource.accessibility)

  const description =
    resource.description ||
    `A comprehensive ${(resourceTypes[0] || "resource").toLowerCase()} covering ${(resource.strand?.[0] || "curriculum").toLowerCase()} concepts for Grade ${displayGrade} students aligned with ${resource.province || "Ontario"} curriculum standards.`

  const topicImages = {
    Probability: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=200&fit=crop",
    "Financial Literacy": "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=200&h=200&fit=crop",
  }

  const imageUrl = topicImages[resource.strand?.[0]] || topicImages["Probability"]

  const getModalityIcon = (resourceType: string) => {
    const iconMap = {
      "Books & Print Media": BookOpen,
      "Web-based Content": Globe,
      "Video/Film": Video,
      Interactive: MousePointerClick,
      "Web Interactive": MousePointerClick,
      "Audio/Podcast": Headphones,
      "Field Trip": MapPin,
      "Onsite or Online Workshop": Users,
      Projects: Hammer,
      Online: Globe,
      Trip: MapPin,
      Video: Video,
      Audio: Headphones,
      Book: BookOpen,
      "Guest Speaker": Mic,
    }

    const IconComponent = iconMap[resourceType] || Globe
    return IconComponent
  }

  const getModalityColor = (resourceType: string) => {
    const colorMap = {
      "Books & Print Media": "#D9742A",
      "Web-based Content": "#4CAFB5",
      "Video/Film": "#FFC107",
      Interactive: "#849657",
      "Web Interactive": "#849657",
      "Audio/Podcast": "#FFC107",
      "Field Trip": "#4CAFB5",
      "Onsite or Online Workshop": "#849657",
      Projects: "#D9742A",
      Online: "#4CAFB5",
      Trip: "#4CAFB5",
      Video: "#FFC107",
      Audio: "#FFC107",
      Book: "#D9742A",
      "Guest Speaker": "#849657",
    }

    return colorMap[resourceType] || "#4CAFB5"
  }

  const generateRating = (resourceUrl: string) => {
    if (!resourceUrl) return "4.2"

    let hash = 0
    for (let i = 0; i < resourceUrl.length; i++) {
      hash = (hash << 5) - hash + resourceUrl.charCodeAt(i)
      hash = hash & hash
    }
    const rating = 3.5 + (Math.abs(hash) % 140) / 100
    return rating.toFixed(1)
  }

  return (
    <div className="relative">
      <div
        className={`group/card rounded-2xl border-2 ${colors.border} ${colors.bg} shadow-sm ${colors.hover} transition-all duration-200 overflow-hidden hover:shadow-xl hover:shadow-[#FF6B35]/10 hover:border-[#FF6B35]/40`}
      >
        <div className="bg-white p-2 md:p-3 border-b border-[#E8D5C4]">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              <span
                className={`px-2.5 py-1 bg-gradient-to-r ${provinceColor} text-white text-xs md:text-sm font-bold rounded-xl shadow-sm`}
              >
                {provinceAbbr}
              </span>

              <span
                className={`px-2.5 py-1 bg-gradient-to-r ${subjectColor} text-white text-xs md:text-sm font-bold rounded-xl shadow-sm`}
              >
                Grade {displayGrade} {subject}
              </span>

              {resource.strand && resource.strand.length > 0 && (
                <>
                  {resource.strand.slice(0, 3).map((strandItem, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white text-xs md:text-sm font-bold rounded-xl shadow-sm"
                    >
                      {strandItem}
                    </span>
                  ))}
                  {resource.strand.length > 3 && (
                    <span className="px-2.5 py-1 bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-white text-xs md:text-sm font-bold rounded-xl shadow-sm">
                      +{resource.strand.length - 3}
                    </span>
                  )}
                </>
              )}

              {resourceTypes.map((type, index) => {
                const IconComponent = getModalityIcon(type)
                const iconColor = getModalityColor(type)
                return (
                  <div key={index} className="relative group">
                    <span
                      className="px-2.5 py-1 text-white text-xs md:text-sm font-bold rounded-xl shadow-sm flex items-center justify-center cursor-help"
                      style={{ backgroundColor: iconColor }}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </span>
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-nowrap">
                      <div className="bg-[#2C2C2C] text-white text-xs md:text-sm rounded-lg px-3 py-1.5 shadow-xl">
                        {type}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-[10px] md:text-xs font-semibold text-gray-900 leading-tight">
                  {resource.publisher_creator || "Unknown"}
                </p>
                <p className="text-[9px] md:text-[10px] text-gray-500">{resource.year_published || ""}</p>
              </div>
              <button
                onClick={handleToggleSave}
                className={`p-1.5 rounded-xl transition-all duration-200 min-h-[36px] min-w-[36px] flex items-center justify-center ${
                  isSaved
                    ? "bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white shadow-md"
                    : "bg-[#F5F5F5] text-[#A8998E] hover:bg-[#FFE5CC]"
                }`}
                aria-label={isSaved ? "Unsave resource" : "Save resource"}
              >
                <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-shrink-0">
              <img
                src={imageUrl || withBasePath("/placeholder.svg")}
                alt={`${resource.strand?.[0]} illustration`}
                className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover shadow-sm"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm md:text-base font-bold text-[#2C2C2C] mb-1 leading-tight">
                {resource.topic_title || `${resource.strand?.[0]} – Grade ${displayGrade}`}
              </h3>
              <p className="text-[11px] md:text-xs text-[#666] leading-relaxed line-clamp-2">{description}</p>
            </div>
          </div>
        </div>

        <div className="bg-white px-2 md:px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 md:gap-2">
            {resource.curriculum_expectations && resource.curriculum_expectations.length > 0 && (
              <div className="relative group/curriculumTooltip">
                <div className="flex items-center gap-1 px-2 py-1 bg-[#E8F5E9] rounded-lg cursor-help">
                  <Check className="w-3.5 h-3.5 text-[#90D356]" strokeWidth={3} />
                  <span className="text-xs md:text-sm font-bold text-[#90D356]">
                    {resource.curriculum_expectations.length}
                  </span>
                </div>

                <div className="absolute bottom-full left-0 mb-2 w-[90%] min-w-[600px] max-w-[800px] opacity-0 group-hover/curriculumTooltip:opacity-100 transition-opacity pointer-events-none z-[100]">
                  <div className="bg-[#2C2C2C] text-white text-xs md:text-sm rounded-2xl p-4 shadow-xl max-h-64 overflow-y-auto">
                    <p className="font-bold mb-2">
                      Curriculum Expectations ({resource.curriculum_expectations.length})
                    </p>
                    <ul className="space-y-2">
                      {resource.curriculum_expectations.map((exp, i) => (
                        <li key={i} className="text-[11px] md:text-[12px] leading-relaxed">
                          {CURRICULUM_DESCRIPTIONS[exp] ? (
                            <>
                              <strong>{exp}:</strong> {CURRICULUM_DESCRIPTIONS[exp]}
                            </>
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

            <div className="flex items-center justify-center px-1.5 py-1 rounded-lg">
              <img
                src={withBasePath(accessLevel.icon || "/placeholder.svg")}
                alt={accessLevel.label}
                className="w-6 h-6"
                title={accessLevel.label}
              />
            </div>

            {resource.is_paid && (
              <div className="flex items-center justify-center px-2 py-1 bg-[#FFE5CC] rounded-lg">
                <span
                  className="text-[#C65D3B] text-base md:text-sm font-black"
                  style={{ fontFamily: "ui-rounded, system-ui, sans-serif" }}
                >
                  $
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setShowReviewsModal(true)}
              className="flex items-center gap-1 px-2 py-1 hover:bg-stone-100 rounded-lg transition-colors min-h-[44px]"
              aria-label="View reviews"
            >
              <MessageSquare className="w-4 h-4 text-stone-600" />
              {reviewCount > 0 && (
                <span className="text-sm md:text-base text-stone-600 font-medium">{reviewCount}</span>
              )}
            </button>

            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-[#FFB627] text-[#FFB627]" />
              <span className="text-xs md:text-sm text-gray-600 font-medium">{generateRating(resource.url)}</span>
            </div>

            <button
              onClick={() => {
                if (resource.url) {
                  window.open(resource.url, "_blank", "noopener,noreferrer")
                }
              }}
              disabled={!resource.url}
              className={`py-2 px-3 md:px-4 ${colors.badge} font-semibold rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 text-xs md:text-sm flex items-center justify-center gap-1.5 transform hover:scale-105 min-h-[44px] ${
                !resource.url ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <span className="hidden sm:inline">View Resource</span>
              <span className="sm:hidden">View</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <ReviewsModal
        isOpen={showReviewsModal}
        onClose={() => setShowReviewsModal(false)}
        resourceId={resourceId}
        resourceTitle={resource.topic_title || `${resource.strand?.[0]} – Grade ${displayGrade}`}
      />
    </div>
  )
}
