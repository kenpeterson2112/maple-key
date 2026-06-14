"use client"

import { ClipboardList, Settings, Bookmark, ArrowRight, ArrowDown } from "lucide-react"
import { useBookmarks } from "@/lib/bookmarks-context"
import { getLatestLesson, getLessonLog } from "@/lib/lesson-metadata"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import { withBasePath } from "@/lib/base-path"
import LessonOverviewCard from "./lesson-overview-card"
import type { Filters } from "@/lib/types"

interface HomeScreenProps {
  filters: Filters
  resultCount: number
  onOpenResources: () => void
  onOpenLessonPlanner: (lesson?: LessonMetadata | null) => void
  onOpenAssessment: () => void
  onOpenLessons: () => void
  onOpenSettings: () => void
}

export default function HomeScreen({
  resultCount,
  onOpenResources,
  onOpenLessonPlanner,
  onOpenAssessment,
  onOpenLessons,
  onOpenSettings,
}: HomeScreenProps) {
  const { bookmarkedResources } = useBookmarks()
  const latestLesson = getLatestLesson()
  const lessonCount = getLessonLog().length

  return (
    <div className="flex flex-col h-full bg-[#FAF3E0] overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#E8D5C4] bg-[#FAF3E0]/90 backdrop-blur-md sticky top-0 z-10">
        <img
          src={withBasePath("/maple-key-logo.png")}
          alt="Maple Key"
          width={785}
          height={673}
          className="h-10 md:h-20 w-auto object-contain"
        />
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center w-9 h-9 md:w-16 md:h-16 rounded-xl text-[#8B4513] hover:bg-[#FFE5CC] transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 md:w-10 md:h-10" />
        </button>
      </header>

      <div className="flex-1 px-5 py-6 space-y-6 max-w-2xl mx-auto w-full">
        {/* Most recent lesson — detailed overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#A8998E]">Most recent lesson</p>
            {lessonCount > 0 && (
              <button
                onClick={onOpenLessons}
                className="flex items-center gap-1 text-xs font-semibold text-[#C65D3B] hover:text-[#FF6B35] transition-colors"
              >
                View all ({lessonCount})
                <ArrowRight size={13} />
              </button>
            )}
          </div>
          {latestLesson ? (
            <LessonOverviewCard
              lesson={latestLesson}
              bookmarkedResources={bookmarkedResources}
              onOpen={() => onOpenLessonPlanner(latestLesson)}
              onOpenAssessment={onOpenAssessment}
            />
          ) : (
            <button
              onClick={() => onOpenLessonPlanner(null)}
              className="w-full rounded-2xl bg-violet-50 border-2 border-violet-200 px-5 py-8 flex flex-col items-center gap-3 shadow-sm active:scale-[0.99] transition-transform text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
                <ClipboardList size={22} className="text-violet-600" />
              </div>
              <div>
                <p className="font-bold text-[#2C2C2C]">No lessons yet</p>
                <p className="text-xs text-[#888] mt-1">Open the Lesson Planner to build your first AI 3-part lesson.</p>
              </div>
            </button>
          )}
        </div>

        {/* Saved resources */}
        {bookmarkedResources.length > 0 && (
          <button
            onClick={onOpenResources}
            className="w-full rounded-2xl bg-white border border-[#E8D5C4] px-4 py-3 flex items-center gap-3 shadow-sm active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[#FFE5CC] flex items-center justify-center flex-shrink-0">
              <Bookmark size={15} className="text-[#C65D3B]" fill="currentColor" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-[#888]">Saved resources</p>
              <p className="text-sm font-semibold text-[#2C2C2C]">
                {bookmarkedResources.length} bookmark{bookmarkedResources.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ArrowRight size={14} className="text-[#A8998E] flex-shrink-0" />
          </button>
        )}

        {/* Resources — full width, prominent, anchored at the bottom */}
        <button
          onClick={onOpenResources}
          className="w-full rounded-3xl bg-gradient-to-br from-[#FF6B35] to-[#C65D3B] text-white px-6 py-7 flex items-center justify-between shadow-md active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 text-white">
              <svg viewBox="0 0 180 180" aria-hidden="true" className="w-10 h-10" fill="currentColor">
                <g style={{ transform: "scale(95%)", transformOrigin: "center" }}>
                  <path d="M101.141 53H136.632C151.023 53 162.689 64.6662 162.689 79.0573V112.904H148.112V79.0573C148.112 78.7105 148.098 78.3662 148.072 78.0251L112.581 112.898C112.701 112.902 112.821 112.904 112.941 112.904H148.112V126.672H112.941C98.5504 126.672 86.5638 114.891 86.5638 100.5V66.7434H101.141V100.5C101.141 101.15 101.191 101.792 101.289 102.422L137.56 66.7816C137.255 66.7563 136.945 66.7434 136.632 66.7434H101.141V53Z" />
                  <path d="M65.2926 124.136L14 66.7372H34.6355L64.7495 100.436V66.7372H80.1365V118.47C80.1365 126.278 70.4953 129.958 65.2926 124.136Z" />
                </g>
              </svg>
            </div>
            <div className="text-left">
              <p className="font-bold text-2xl leading-tight">Resources</p>
              <p className="text-sm text-white/80 mt-0.5">
                Browse {resultCount > 0 ? resultCount.toLocaleString() : "…"} curriculum resources
              </p>
            </div>
          </div>
          <ArrowDown size={24} className="text-white/70 flex-shrink-0" />
        </button>
      </div>
    </div>
  )
}
