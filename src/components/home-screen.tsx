"use client"

import { BookOpen, Sparkles, ClipboardCheck, Settings, Bookmark, ArrowRight, Clock } from "lucide-react"
import { useBookmarks } from "@/lib/bookmarks-context"
import { getLatestLesson } from "@/lib/lesson-metadata"
import { withBasePath } from "@/lib/base-path"
import type { Filters } from "@/lib/types"

interface HomeScreenProps {
  filters: Filters
  resultCount: number
  onOpenResources: () => void
  onOpenLessonPlanner: () => void
  onOpenAssessment: () => void
  onOpenSettings: () => void
}

export default function HomeScreen({
  filters,
  resultCount,
  onOpenResources,
  onOpenLessonPlanner,
  onOpenAssessment,
  onOpenSettings,
}: HomeScreenProps) {
  const { bookmarkedResources } = useBookmarks()
  const latestLesson = getLatestLesson()

  const gradeLabel = filters.grade ? `Grade ${filters.grade}` : null
  const subjectLabel = filters.subject || null
  const provinceLabel = filters.province || null

  const profileParts = [gradeLabel, subjectLabel, provinceLabel].filter(Boolean)

  return (
    <div className="flex flex-col h-full bg-[#FAF3E0] overflow-y-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#E8D5C4] bg-[#FAF3E0]/90 backdrop-blur-md sticky top-0 z-10">
        <img
          src={withBasePath("/Maple_Key_Transp_Background.png")}
          alt="Maple Key"
          className="h-10 w-auto object-contain"
        />
        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[#8B4513] hover:bg-[#FFE5CC] transition-colors"
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
      </header>

      <div className="flex-1 px-5 py-6 space-y-6 max-w-2xl mx-auto w-full">
        {/* Profile greeting */}
        <div className="rounded-2xl bg-white border border-[#E8D5C4] px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A8998E] mb-1">Your profile</p>
          {profileParts.length > 0 ? (
            <p className="text-lg font-semibold text-[#2C2C2C]">
              You teach {profileParts.join(" · ")}
            </p>
          ) : (
            <p className="text-base text-[#8B4513]">
              Tap <span className="font-semibold">Resources</span> to set your grade, subject &amp; province.
            </p>
          )}
        </div>

        {/* Launcher cards */}
        <div className="space-y-3">
          {/* Resources — full width, prominent */}
          <button
            onClick={onOpenResources}
            className="w-full rounded-2xl bg-gradient-to-br from-[#FF6B35] to-[#C65D3B] text-white px-5 py-5 flex items-center justify-between shadow-md active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <BookOpen size={22} />
              </div>
              <div className="text-left">
                <p className="font-bold text-lg leading-tight">Resources</p>
                <p className="text-sm text-white/80">
                  Browse {resultCount > 0 ? resultCount.toLocaleString() : "…"} curriculum resources
                </p>
              </div>
            </div>
            <ArrowRight size={20} className="text-white/70 flex-shrink-0" />
          </button>

          {/* Lesson Planner + Assessments — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onOpenLessonPlanner}
              className="rounded-2xl bg-violet-50 border-2 border-violet-200 px-4 py-4 flex flex-col gap-3 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Sparkles size={20} className="text-violet-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-[#2C2C2C] leading-tight">Lesson Planner</p>
                <p className="text-xs text-[#888] mt-0.5">AI 3-part lessons</p>
              </div>
            </button>

            <button
              onClick={onOpenAssessment}
              className="rounded-2xl bg-amber-50 border-2 border-amber-200 px-4 py-4 flex flex-col gap-3 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <ClipboardCheck size={20} className="text-amber-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-[#2C2C2C] leading-tight">Assessments</p>
                <p className="text-xs text-[#888] mt-0.5">Quick checks</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent activity */}
        {(bookmarkedResources.length > 0 || latestLesson) && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#A8998E]">Recent</p>

            {latestLesson && (
              <button
                onClick={onOpenLessonPlanner}
                className="w-full rounded-2xl bg-white border border-[#E8D5C4] px-4 py-3 flex items-center gap-3 shadow-sm active:scale-[0.98] transition-transform text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={15} className="text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#888]">Last lesson plan</p>
                  <p className="text-sm font-semibold text-[#2C2C2C] truncate">{latestLesson.title}</p>
                </div>
                <Clock size={14} className="text-[#A8998E] flex-shrink-0" />
              </button>
            )}

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
          </div>
        )}
      </div>
    </div>
  )
}
