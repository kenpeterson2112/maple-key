"use client"

import { useMemo, useState } from "react"
import { Calendar, Check, BookOpen, ClipboardCheck, ArrowRight, Library, CornerDownRight } from "lucide-react"
import { getLessonLog } from "@/lib/lesson-metadata"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import { groupLessonsBySequence } from "@/lib/lesson-sequence"
import FollowsLink from "@/components/follows-link"
import { getLessonTally } from "@/lib/assessment-results"
import { useGlobalFilters } from "@/lib/global-filters"
import DevSeedControl from "@/components/dev/dev-seed-control"
import PageHeader from "@/components/page-header"

interface LessonsLibraryProps {
  onOpenLesson: (lesson: LessonMetadata) => void
  /** Starts a fresh plan that continues from this lesson. */
  onContinueLesson: (lesson: LessonMetadata) => void
}

/** Indent per sequence level, as Tailwind classes (kept static for the JIT). */
const INDENT_CLASS = ["", "ml-4 md:ml-6", "ml-8 md:ml-12", "ml-12 md:ml-18"]

type SortKey = "newest" | "oldest" | "title"

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function LessonsLibrary({ onOpenLesson, onContinueLesson }: LessonsLibraryProps) {
  const lessons = useMemo(() => getLessonLog(), [])
  const globalFilters = useGlobalFilters()
  // The sample-data control bumps this to re-read per-lesson tallies (read inline on render).
  const [reloadNonce, setReloadNonce] = useState(0)
  const [sort, setSort] = useState<SortKey>("newest")

  const visible = useMemo(() => {
    let list = [...lessons]

    // Filter by global curriculum filters
    if (globalFilters.state.subject && globalFilters.state.subject !== "") {
      list = list.filter((l) => l.subject === globalFilters.state.subject)
    }
    if (globalFilters.state.grade && globalFilters.state.grade !== "") {
      list = list.filter((l) => l.grade === globalFilters.state.grade)
    }

    // Sort
    if (sort === "newest") list.sort((a, b) => b.timestamp - a.timestamp)
    else if (sort === "oldest") list.sort((a, b) => a.timestamp - b.timestamp)
    else list.sort((a, b) => a.title.localeCompare(b.title))
    // Follow-ups sit beneath the lesson they build on; roots keep the sort.
    return groupLessonsBySequence(list)
  }, [lessons, globalFilters.state.subject, globalFilters.state.grade, sort])
  const byId = useMemo(() => new Map(lessons.map((l) => [l.id, l])), [lessons])

  return (
    <div className="w-full h-full bg-[#FAF3E0] flex flex-col overflow-hidden">
      {/* Title strip */}
      <PageHeader icon={Library} title="All Lessons" iconColor="#166534" iconBg="bg-green-100">
        <DevSeedControl scope={{ kind: "lessons", lessons }} onChanged={() => setReloadNonce((n) => n + 1)} />
      </PageHeader>

      {/* Controls */}
      <div className="px-4 md:px-6 py-3 border-b border-[#E8D5C4] bg-[#FAF3E0] flex flex-wrap items-center gap-3">
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
        <div key={reloadNonce} className="max-w-3xl mx-auto space-y-3">
          {visible.length === 0 ? (
            <div className="text-center py-16 text-[#888]">
              <p className="font-semibold text-[#2C2C2C]">No lessons found</p>
              <p className="text-sm mt-1">Try a different subject filter, or generate a new lesson.</p>
            </div>
          ) : (
            visible.map(({ lesson, depth }) => {
              const tally = getLessonTally(lesson.id)
              const meta = [
                formatDate(lesson.timestamp),
                lesson.grade ? `Grade ${lesson.grade}` : null,
                lesson.subject || null,
              ]
                .filter(Boolean)
                .join(" · ")
              const source = lesson.continuesFrom ? byId.get(lesson.continuesFrom.id) : undefined
              return (
                <div
                  key={lesson.id}
                  className={`relative ${INDENT_CLASS[depth] ?? INDENT_CLASS[INDENT_CLASS.length - 1]}`}
                >
                {depth > 0 && (
                  <CornerDownRight
                    size={14}
                    aria-hidden
                    className="absolute -left-4 top-4 text-muted-foreground/50 hidden md:block"
                  />
                )}
                <button
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
                {/* Siblings of the card button, not nested inside it. */}
                <div className="flex items-center gap-3 px-4 pt-1.5">
                  {lesson.continuesFrom && (
                    <FollowsLink
                      follows={{
                        title: source?.title ?? lesson.continuesFrom.title,
                        onOpen: source ? () => onOpenLesson(source) : undefined,
                      }}
                      className="flex-1"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onContinueLesson(lesson)}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary hover:underline flex-shrink-0 py-1"
                  >
                    Continue
                    <ArrowRight size={12} />
                  </button>
                </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
