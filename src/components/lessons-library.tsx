"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Sparkles, Calendar, Check, BookOpen, ClipboardCheck, ArrowRight } from "lucide-react"
import { getLessonLog } from "@/lib/lesson-metadata"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import { getLessonTally } from "@/lib/assessment-results"

interface LessonsLibraryProps {
  onBack: () => void
  onOpenLesson: (lesson: LessonMetadata) => void
}

type SortKey = "newest" | "oldest" | "title"

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function LessonsLibrary({ onBack, onOpenLesson }: LessonsLibraryProps) {
  const lessons = useMemo(() => getLessonLog(), [])
  const [subject, setSubject] = useState<string>("All")
  const [sort, setSort] = useState<SortKey>("newest")

  const subjects = useMemo(() => {
    const set = new Set<string>()
    for (const l of lessons) if (l.subject) set.add(l.subject)
    return ["All", ...Array.from(set).sort()]
  }, [lessons])

  const visible = useMemo(() => {
    let list = subject === "All" ? lessons : lessons.filter((l) => l.subject === subject)
    list = [...list]
    if (sort === "newest") list.sort((a, b) => b.timestamp - a.timestamp)
    else if (sort === "oldest") list.sort((a, b) => a.timestamp - b.timestamp)
    else list.sort((a, b) => a.title.localeCompare(b.title))
    return list
  }, [lessons, subject, sort])

  return (
    <div className="w-full h-full bg-[#FAF3E0] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 md:px-8 py-5 border-b-2 border-[#E8D5C4] bg-white">
        <button
          onClick={onBack}
          className="p-2 hover:bg-[#FFE5CC] rounded-full transition-all duration-200"
          aria-label="Back to home"
        >
          <ArrowLeft size={24} className="text-[#8B4513]" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles size={24} className="text-violet-600" />
          <h2 className="text-2xl font-bold text-[#2C2C2C]">All Lessons</h2>
        </div>
      </div>

      {/* Controls */}
      <div className="px-5 md:px-8 py-4 border-b border-[#E8D5C4] bg-[#FAF3E0]/90 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#A8998E]">Subject</label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-3 py-1.5 border-2 border-[#E8D5C4] rounded-lg bg-white text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#A8998E]">Sort</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="px-3 py-1.5 border-2 border-[#E8D5C4] rounded-lg bg-white text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>
        <span className="ml-auto text-sm text-[#888]">
          {visible.length} lesson{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-3">
          {visible.length === 0 ? (
            <div className="text-center py-16 text-[#888]">
              <p className="font-semibold text-[#2C2C2C]">No lessons found</p>
              <p className="text-sm mt-1">Try a different subject filter, or generate a new lesson.</p>
            </div>
          ) : (
            visible.map((lesson) => {
              const tally = getLessonTally(lesson.id)
              const meta = [
                formatDate(lesson.timestamp),
                lesson.grade ? `Grade ${lesson.grade}` : null,
                lesson.subject || null,
              ]
                .filter(Boolean)
                .join(" · ")
              return (
                <button
                  key={lesson.id}
                  onClick={() => onOpenLesson(lesson)}
                  className="w-full text-left rounded-2xl bg-white border border-[#E8D5C4] px-4 py-3.5 shadow-sm hover:shadow-md hover:border-[#FF6B35]/40 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-[#888]">
                    <Calendar size={12} />
                    <span className="truncate">{meta}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#2C2C2C] mt-1 leading-snug">{lesson.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-[#888]">
                    {lesson.curriculumCodesCovered?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Check size={12} className="text-emerald-500" strokeWidth={3} />
                        {lesson.curriculumCodesCovered.length} expectations
                      </span>
                    )}
                    {(lesson.resources?.length ?? lesson.resourceIds?.length ?? 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={12} className="text-[#D9742A]" />
                        {lesson.resources?.length ?? lesson.resourceIds?.length} resources
                      </span>
                    )}
                    {tally && tally.attempts > 0 && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <ClipboardCheck size={12} />
                        {tally.attempts} checks
                      </span>
                    )}
                    <ArrowRight size={13} className="ml-auto text-[#A8998E]" />
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
