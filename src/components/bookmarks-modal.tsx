"use client"

import type React from "react"

import { useState } from "react"
import {
  X,
  GripVertical,
  ExternalLink,
  Trash2,
  FileDown,
  Share2,
  Sparkles,
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
import { useBookmarks } from "@/lib/bookmarks-context"
import { normalizeGrades } from "@/lib/utils"
import LessonPlannerModal from "./lesson-planner-modal"

interface BookmarksModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BookmarksModal({ isOpen, onClose }: BookmarksModalProps) {
  const { bookmarkedResources, removeBookmark, reorderBookmarks } = useBookmarks()
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null)
  const [showLessonPlanner, setShowLessonPlanner] = useState(false)

  if (!isOpen) return null

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      reorderBookmarks(draggedIndex, dragOverIndex)
    }
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleExportPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Saved Educational Resources</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #2C2C2C; }
            h1 { color: #8B4513; margin-bottom: 10px; }
            .date { color: #666; font-size: 14px; margin-bottom: 30px; }
            .resource { margin-bottom: 25px; padding: 15px; border: 2px solid #E8D5C4; border-radius: 8px; }
            .resource h3 { margin: 0 0 8px 0; color: #2C2C2C; }
            .resource .meta { color: #666; font-size: 13px; margin-bottom: 8px; }
            .resource .url { color: #FF6B35; text-decoration: none; font-size: 12px; word-break: break-all; }
            .tags { margin-top: 8px; }
            .tag { display: inline-block; background: #FFE5CC; color: #8B4513; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-right: 6px; }
          </style>
        </head>
        <body>
          <h1>My Saved Educational Resources</h1>
          <div class="date">Exported on ${new Date().toLocaleDateString()}</div>
          ${bookmarkedResources
            .map(
              (resource) => `
            <div class="resource">
              <h3>${resource.topic_title || "Untitled Resource"}</h3>
              <div class="meta">
                ${resource.publisher_creator || "Unknown Publisher"}${resource.year_published ? ` • ${resource.year_published}` : ""}
              </div>
              <div class="tags">
                ${normalizeGrades(resource.grade_level)[0] ? `<span class="tag">Grade ${normalizeGrades(resource.grade_level)[0]}</span>` : ""}
                ${resource.subject ? `<span class="tag">${resource.subject}</span>` : ""}
                ${resource.strand?.[0] ? `<span class="tag">${resource.strand[0]}</span>` : ""}
              </div>
              ${resource.url ? `<div style="margin-top: 8px;"><a href="${resource.url}" class="url">${resource.url}</a></div>` : ""}
            </div>
          `,
            )
            .join("")}
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        setShowSuccessMessage("PDF export initiated")
        setTimeout(() => setShowSuccessMessage(null), 3000)
      }, 250)
    }
  }

  const handleShare = async () => {
    const shareText = `My Saved Educational Resources:\n\n${bookmarkedResources
      .map(
        (resource, index) =>
          `${index + 1}. ${resource.topic_title || "Untitled Resource"}\n   ${resource.publisher_creator || "Unknown Publisher"}${resource.year_published ? ` (${resource.year_published})` : ""}\n   ${resource.url || "No URL available"}`,
      )
      .join("\n\n")}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Saved Educational Resources",
          text: shareText,
        })
        setShowSuccessMessage("Shared successfully!")
        setTimeout(() => setShowSuccessMessage(null), 3000)
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err)
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
        setShowSuccessMessage("Copied to clipboard!")
        setTimeout(() => setShowSuccessMessage(null), 3000)
      } catch (err) {
        console.error("Error copying to clipboard:", err)
        setShowSuccessMessage("Failed to copy")
        setTimeout(() => setShowSuccessMessage(null), 3000)
      }
    }
  }

  const handleGenerateLesson = () => {
    setShowLessonPlanner(true)
  }

  const getModalityIcon = (resourceType: string) => {
    const iconMap: { [key: string]: any } = {
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

    return iconMap[resourceType] || Globe
  }

  const getModalityColor = (resourceType: string) => {
    const colorMap: { [key: string]: string } = {
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

  if (showLessonPlanner) {
    return (
      <LessonPlannerModal
        isOpen={true}
        onClose={onClose}
        onBack={() => setShowLessonPlanner(false)}
        bookmarkedResources={bookmarkedResources}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-[95vw] h-[90vh] bg-[#FAF3E0] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b-2 border-[#E8D5C4] bg-white">
          <div>
            <h2 className="text-2xl font-bold text-[#2C2C2C]">Saved Resources</h2>
            <p className="text-sm text-[#666] mt-1">
              {bookmarkedResources.length} resource{bookmarkedResources.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <div className="flex items-center gap-3">
            {showSuccessMessage && (
              <div className="text-sm text-[#2C2C2C] bg-[#FFE5CC] px-3 py-2 rounded-lg font-medium">
                {showSuccessMessage}
              </div>
            )}
            {bookmarkedResources.length > 0 && (
              <>
                <button
                  onClick={handleGenerateLesson}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  aria-label="Generate Lesson"
                >
                  <Sparkles size={18} />
                  <span className="text-sm">Generate Lesson</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-[#FF6B35] hover:bg-[#C65D3B] text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  aria-label="Export as PDF"
                >
                  <FileDown size={18} />
                  <span className="text-sm">Export PDF</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 bg-[#8B4513] hover:bg-[#6B3410] text-white font-semibold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
                  aria-label="Share resources"
                >
                  <Share2 size={18} />
                  <span className="text-sm">Share</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#FFE5CC] rounded-full transition-all duration-200"
              aria-label="Close modal"
            >
              <X size={28} className="text-[#8B4513]" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {bookmarkedResources.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-[#FFE5CC] rounded-full flex items-center justify-center mb-4">
                <span className="text-4xl">📚</span>
              </div>
              <h3 className="text-xl font-bold text-[#2C2C2C] mb-2">No saved resources yet</h3>
              <p className="text-[#666] max-w-md">
                Click the bookmark icon on any resource card to save it here for quick access later.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-w-5xl mx-auto">
              {bookmarkedResources.map((resource, index) => {
                const displayGrade = normalizeGrades(resource.grade_level)[0] || "6"
                const resourceTypes = resource.modality?.length ? resource.modality : ["Online"]

                return (
                  <div
                    key={resource.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragLeave={handleDragLeave}
                    className={`flex items-center gap-4 bg-white rounded-xl border-2 border-[#E8D5C4] p-4 shadow-sm transition-all duration-200 ${
                      draggedIndex === index ? "opacity-50 scale-95" : ""
                    } ${dragOverIndex === index ? "border-[#FF6B35] border-dashed" : ""} hover:shadow-md`}
                  >
                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing p-2 hover:bg-[#FFE5CC] rounded-lg transition-colors">
                      <GripVertical size={20} className="text-[#8B4513]" />
                    </div>

                    {/* Resource Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 bg-gradient-to-r from-[#C65D3B] to-[#8B1A1A] text-white text-[10px] font-bold rounded-lg">
                          Grade {displayGrade} {resource.subject || "Math"}
                        </span>
                        <span className="px-2 py-0.5 bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white text-[10px] font-bold rounded-lg">
                          {resource.strand?.[0] || "General"}
                        </span>
                        {resourceTypes.map((type: string, typeIndex: number) => {
                          const IconComponent = getModalityIcon(type)
                          const iconColor = getModalityColor(type)
                          return (
                            <div key={typeIndex} className="relative group">
                              <span
                                className="px-2 py-0.5 text-white text-[10px] font-bold rounded-lg flex items-center justify-center cursor-help"
                                style={{ backgroundColor: iconColor }}
                              >
                                <IconComponent className="w-3 h-3" />
                              </span>
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100] whitespace-nowrap">
                                <div className="bg-[#2C2C2C] text-white text-xs rounded-lg px-3 py-1.5 shadow-xl">
                                  {type}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <h4 className="font-bold text-[#2C2C2C] truncate">
                        {resource.topic_title || "Untitled Resource"}
                      </h4>
                      <p className="text-xs text-[#666] truncate">
                        {resource.publisher_creator || "Unknown Publisher"}
                        {resource.year_published ? ` • ${resource.year_published}` : ""}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          if (resource.url) {
                            window.open(resource.url, "_blank", "noopener,noreferrer")
                          }
                        }}
                        disabled={!resource.url}
                        className={`py-2 px-4 bg-gradient-to-r from-[#FF6B35] to-[#C65D3B] text-white font-semibold rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 text-sm flex items-center gap-1.5 ${
                          !resource.url ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        View
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeBookmark(resource.id!)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        aria-label="Remove bookmark"
                      >
                        <Trash2 size={18} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {bookmarkedResources.length > 1 && (
          <div className="px-8 py-3 border-t border-[#E8D5C4] bg-white/80 text-center">
            <p className="text-xs text-[#666]">
              <GripVertical size={14} className="inline-block mr-1" />
              Drag and drop to reorder your saved resources
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
