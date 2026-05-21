import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import HomeScreen from "@/components/home-screen"
import ResourcesSpace from "@/components/resources-space"
import LessonPlannerModal from "@/components/lesson-planner-modal"
import AssessmentModal from "@/components/assessment-modal"
import SettingsModal from "@/components/settings-modal"
import type { Filters } from "@/lib/types"
import { clearPrefs, getPrefs, inferProvinceFromTimeZone, setPrefs } from "@/lib/personalization"
import { getLatestLesson } from "@/lib/lesson-metadata"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import { useBookmarks } from "@/lib/bookmarks-context"

type Space = "home" | "resources" | "lessonplanner" | "assessment"

const SPACE_VARIANTS: Record<Exclude<Space, "home">, { initial: object; animate: object; exit: object }> = {
  resources:     { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } },
  lessonplanner: { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } },
  assessment:    { initial: { x: "-100%" }, animate: { x: 0 }, exit: { x: "-100%" } },
}

const SPRING = { type: "spring", stiffness: 280, damping: 32 }

const EMPTY_FILTERS: Filters = {
  province: "",
  grade: "",
  subject: "",
  strand: "",
  topic: "",
  learningType: "",
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [inferred, setInferred] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const skipPersistOnce = useRef(true)

  const [sidebarFilters, setSidebarFilters] = useState<{ modality: string[]; cost: string[]; accessibility: string[] }>({
    modality: [],
    cost: [],
    accessibility: [],
  })
  const [resultCount, setResultCount] = useState(0)

  const [activeSpace, setActiveSpace] = useState<Space>("home")
  const [showSettings, setShowSettings] = useState(false)
  const [assessmentLesson, setAssessmentLesson] = useState<LessonMetadata | null>(null)

  const { bookmarkedResources } = useBookmarks()

  useEffect(() => {
    const prefs = getPrefs()
    setFilters({
      ...EMPTY_FILTERS,
      province: prefs.province,
      grade: prefs.grade,
      subject: prefs.subject,
      strand: prefs.strand,
    })
    setInferred(prefs.inferred)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (skipPersistOnce.current) {
      skipPersistOnce.current = false
      return
    }
    setPrefs({
      province: filters.province,
      grade: filters.grade,
      subject: filters.subject,
      strand: filters.strand ?? "",
    })
    setInferred(false)
  }, [filters.province, filters.grade, filters.subject, filters.strand, hydrated])

  const handleSidebarFilterChange = (filterGroup: string, selectedItems: string[]) => {
    setSidebarFilters((prev) => ({ ...prev, [filterGroup as keyof typeof prev]: selectedItems }))
  }

  const handleResetInferred = () => {
    clearPrefs()
    setFilters({ ...EMPTY_FILTERS, province: inferProvinceFromTimeZone(), grade: "", subject: "", strand: "" })
    setInferred(true)
  }

  const totalActiveFilters =
    (filters.grade ? filters.grade.split(",").length : 0) +
    (filters.subject ? 1 : 0) +
    (filters.strand ? 1 : 0) +
    Object.values(sidebarFilters).reduce((sum, arr) => sum + arr.length, 0)

  const handleOpenAssessment = () => {
    setAssessmentLesson(getLatestLesson())
    setActiveSpace("assessment")
  }

  const goHome = () => setActiveSpace("home")

  return (
    <div className="fixed inset-0 bg-[#FAF3E0] overflow-hidden">
      {/* Home screen — always mounted behind spaces */}
      <HomeScreen
        filters={filters}
        resultCount={resultCount}
        onOpenResources={() => setActiveSpace("resources")}
        onOpenLessonPlanner={() => setActiveSpace("lessonplanner")}
        onOpenAssessment={handleOpenAssessment}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Spaces — slide in over home */}
      <AnimatePresence>
        {activeSpace !== "home" && (
          <motion.div
            key={activeSpace}
            className="fixed inset-0 z-10"
            initial={SPACE_VARIANTS[activeSpace].initial}
            animate={SPACE_VARIANTS[activeSpace].animate}
            exit={SPACE_VARIANTS[activeSpace].exit}
            transition={SPRING}
          >
            {activeSpace === "resources" && (
              <ResourcesSpace
                filters={filters}
                setFilters={setFilters}
                sidebarFilters={sidebarFilters}
                onSidebarFilterChange={handleSidebarFilterChange}
                resultCount={resultCount}
                onCountChange={setResultCount}
                inferred={inferred}
                onReset={handleResetInferred}
                totalActiveFilters={totalActiveFilters}
                onBack={goHome}
              />
            )}

            {activeSpace === "lessonplanner" && (
              <LessonPlannerModal
                isOpen
                asSpace
                bookmarkedResources={bookmarkedResources}
                onClose={goHome}
                onBack={goHome}
              />
            )}

            {activeSpace === "assessment" && assessmentLesson && (
              <AssessmentModal
                isOpen
                asSpace
                lesson={assessmentLesson}
                onClose={goHome}
              />
            )}

            {activeSpace === "assessment" && !assessmentLesson && (
              <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-lg font-semibold text-[#2C2C2C]">No lesson plan yet</p>
                <p className="text-sm text-[#888]">Generate a lesson plan first to unlock quick checks.</p>
                <button
                  onClick={() => setActiveSpace("lessonplanner")}
                  className="px-5 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-xl text-sm hover:bg-[#E85A24] transition-colors"
                >
                  Open Lesson Planner
                </button>
                <button onClick={goHome} className="text-sm text-[#888] underline">Back to home</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings panel — slides down from top, overlays everything */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
