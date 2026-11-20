import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import HomeSpace from "@/components/home-space"
import ResourcesSpace from "@/components/resources-space"
import LessonPlannerModal from "@/components/lesson-planner-modal"
import LessonsLibrary from "@/components/lessons-library"
import AssessmentModal from "@/components/assessment-modal"
import OnboardingModal from "@/components/onboarding-modal"
import ResourceOnboardingModal from "@/components/resource-onboarding-modal"
import ProgressSpace from "@/components/progress-space"
import SettingsPage from "@/components/settings-page"
import ClassroomProfile from "@/components/classroom-profile"
import TopNav, { type TopNavSpace } from "@/components/top-nav"
import BottomTabBar from "@/components/bottom-tab-bar"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import { useBookmarks } from "@/lib/bookmarks-context"
import { useGlobalFilters } from "@/lib/global-filters"
import { hasAddress, parseSpaceRoute, serializeSpaceRoute, type Space } from "@/lib/space-route"

// All overlay spaces cross-fade in/out — quick and direction-neutral
const FADE_VARIANTS = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
const FADE_TRANSITION = { duration: 0.15, ease: "easeOut" } as const

export default function App() {
  const [sidebarFilters, setSidebarFilters] = useState<{ modality: string[]; cost: string[]; accessibility: string[]; readiness: string[] }>({
    modality: [],
    cost: [],
    accessibility: [],
    readiness: [],
  })
  const [resultCount, setResultCount] = useState(0)

  // The space follows the address (space-route.ts), so Back and Forward move
  // between spaces. A deep link or a reload lands where the address says.
  const [activeSpace, setActiveSpace] = useState<Space>(() => parseSpaceRoute(window.location.hash).space)
  // Where on Progress to land: a strand, overall or specific code (#progress/B2.3).
  const [progressAnchor, setProgressAnchor] = useState<string | undefined>(() => parseSpaceRoute(window.location.hash).anchor)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showResourceTour, setShowResourceTour] = useState(false)
  const [searchSeed, setSearchSeed] = useState<{ query: string; nonce: number } | undefined>(undefined)
  const [assessmentLesson, setAssessmentLesson] = useState<LessonMetadata | null>(null)
  const [plannerLesson, setPlannerLesson] = useState<LessonMetadata | null>(null)
  const [plannerStartStep, setPlannerStartStep] = useState(0)
  // "Continue from this lesson": the earlier lesson a fresh plan builds on.
  const [plannerContinueFrom, setPlannerContinueFrom] = useState<LessonMetadata | null>(null)
  // The planner reads its props once on mount; bump to remount on every open
  // (e.g. "Plan the next lesson" from inside the planner itself).
  const [plannerKey, setPlannerKey] = useState(0)

  const { bookmarkedResources } = useBookmarks()

  const handleSidebarFilterChange = (filterGroup: string, selectedItems: string[]) => {
    setSidebarFilters((prev) => ({ ...prev, [filterGroup as keyof typeof prev]: selectedItems }))
  }

  // Search's results take grade/subject/strand from the global curriculum
  // filters, so the phone header's Filters badge counts those.
  const globalFilters = useGlobalFilters()
  const curriculum = globalFilters.state
  const totalActiveFilters =
    (curriculum.grade ? 1 : 0) +
    (curriculum.subject ? 1 : 0) +
    (curriculum.strand ? 1 : 0) +
    Object.values(sidebarFilters).reduce((sum, arr) => sum + arr.length, 0)

  // Every space change goes through here. Spaces with an address push a history
  // entry; Quick Check has none, so it sits over the current entry.
  const navigate = (space: Space, anchor?: string) => {
    setActiveSpace(space)
    setProgressAnchor(space === "progress" ? anchor : undefined)
    if (!hasAddress(space)) return
    const hash = serializeSpaceRoute({ space, anchor })
    if (hash === window.location.hash) return
    window.history.pushState(null, "", hash || window.location.pathname + window.location.search)
  }

  const goResources = () => navigate("resources")
  const findResources = (code: string) => {
    setSearchSeed({ query: code, nonce: Date.now() })
    navigate("resources")
  }

  // Every way into the planner goes through here so a start step from one entry
  // (e.g. the results-page Plan button) never leaks into the next.
  const resetPlanner = (lesson: LessonMetadata | null, startStep = 0, continueFrom: LessonMetadata | null = null) => {
    setPlannerLesson(lesson)
    setPlannerStartStep(startStep)
    setPlannerContinueFrom(lesson ? null : continueFrom)
    setPlannerKey((k) => k + 1)
  }
  const openPlanner = (lesson: LessonMetadata | null, startStep = 0, continueFrom: LessonMetadata | null = null) => {
    resetPlanner(lesson, startStep, continueFrom)
    navigate("lessonplanner")
  }

  // Back, Forward, or a hash typed into the address bar. Planner state isn't
  // serialised, so Plan reached this way opens a fresh planner.
  useEffect(() => {
    const onPopState = () => {
      const { space, anchor } = parseSpaceRoute(window.location.hash)
      if (space === "lessonplanner") resetPlanner(null)
      setActiveSpace(space)
      setProgressAnchor(anchor)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  const handleOnboardingComplete = () => setShowOnboarding(false)

  const topNavSpace: TopNavSpace | null =
    activeSpace === "lessonplanner" ||
    activeSpace === "resources" ||
    activeSpace === "progress" ||
    activeSpace === "lessons"
      ? activeSpace
      : null

  const changeSpace = (s: TopNavSpace) => {
    // Plan always starts fresh, matching the old "Plan Lesson" button.
    if (s === "lessonplanner") openPlanner(null)
    else navigate(s)
  }

  return (
    // Sides pad by the safe-area insets (landscape notches); the header and the
    // phone tab bar take the top and bottom ones.
    <div className="fixed inset-0 bg-background overflow-hidden flex flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <TopNav
        activeSpace={topNavSpace}
        isHome={activeSpace === "home"}
        onGoHome={() => navigate("home")}
        onChangeSpace={changeSpace}
        onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
        totalActiveFilters={totalActiveFilters}
        onOpenSettings={() => navigate("settings")}
        onOpenClassroomProfile={() => navigate("classroom")}
        hideStrip={activeSpace === "assessment"}
      />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Resources discovery page — always-on landing layer */}
        <ResourcesSpace
          sidebarFilters={sidebarFilters}
          onSidebarFilterChange={handleSidebarFilterChange}
          resultCount={resultCount}
          onCountChange={setResultCount}
          isMobileFiltersOpen={isMobileFiltersOpen}
          onCloseMobileFilters={() => setIsMobileFiltersOpen(false)}
          searchSeed={searchSeed}
          // Step 2 (Resources) — the teacher has already picked their materials.
          onPlanWithSelection={() => openPlanner(null, 1)}
        />

        {/* Overlay spaces — slide in over resources */}
        <AnimatePresence>
          {activeSpace !== "resources" && (
            <motion.div
              key={activeSpace}
              className="absolute inset-0 z-10"
              initial={FADE_VARIANTS.initial}
              animate={FADE_VARIANTS.animate}
              exit={FADE_VARIANTS.exit}
              transition={FADE_TRANSITION}
            >
              {activeSpace === "home" && (
                <HomeSpace
                  onNavigate={(destination) => {
                    if (destination === "lessonplanner") openPlanner(null)
                    else navigate(destination)
                  }}
                  onOpenLesson={(lesson) => openPlanner(lesson)}
                  onOpenTour={() => setShowResourceTour(true)}
                  onOpenClassroomSetup={() => navigate("classroom")}
                  onFindResources={findResources}
                  onPlanExpectation={(code, label) => {
                    globalFilters.setTopic(`${code} ${label}`)
                    openPlanner(null)
                  }}
                  onQuickCheck={(lesson) => {
                    setAssessmentLesson(lesson)
                    navigate("assessment")
                  }}
                />
              )}

              {activeSpace === "lessonplanner" && (
                <LessonPlannerModal
                  key={plannerKey}
                  isOpen
                  asSpace
                  lesson={plannerLesson}
                  initialWizardStep={plannerStartStep}
                  continueFrom={plannerContinueFrom}
                  onContinueLesson={(prev) => openPlanner(null, 0, prev)}
                  onOpenLesson={(l) => openPlanner(l)}
                  bookmarkedResources={bookmarkedResources}
                  onClose={goResources}
                  onBack={goResources}
                  onOpenLibrary={() => navigate("lessons")}
                  sidebarFilters={sidebarFilters}
                  onSidebarFilterChange={handleSidebarFilterChange}
                />
              )}

              {activeSpace === "lessons" && (
                <LessonsLibrary
                  onOpenLesson={(lesson) => openPlanner(lesson)}
                  onContinueLesson={(lesson) => openPlanner(null, 0, lesson)}
                />
              )}

              {activeSpace === "assessment" && assessmentLesson && (
                <AssessmentModal
                  isOpen
                  asSpace
                  lesson={assessmentLesson}
                  onClose={goResources}
                />
              )}

              {activeSpace === "assessment" && !assessmentLesson && (
                <div className="absolute inset-0 z-[60] bg-card flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <p className="font-display text-lg font-semibold text-foreground">No lesson plan yet</p>
                  <p className="text-sm text-muted-foreground">Generate a lesson plan first to unlock quick checks.</p>
                  <button
                    onClick={() => openPlanner(plannerLesson)}
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary-hover transition-colors"
                  >
                    Open Lesson Planner
                  </button>
                  <button onClick={goResources} className="text-sm text-muted-foreground underline">Back to resources</button>
                </div>
              )}

              {activeSpace === "settings" && (
                <SettingsPage
                  onOpenClassroomProfile={() => navigate("classroom")}
                  onOpenTour={() => setShowResourceTour(true)}
                />
              )}

              {activeSpace === "classroom" && <ClassroomProfile />}

              {activeSpace === "progress" && (
                <ProgressSpace
                  anchor={progressAnchor}
                  onPlanExpectation={(code, label) => {
                    globalFilters.setTopic(`${code} ${label}`)
                    openPlanner(null)
                  }}
                  onFindResources={findResources}
                  onOpenLesson={(lesson) => openPlanner(lesson)}
                  onQuickCheck={(lesson) => {
                    setAssessmentLesson(lesson)
                    navigate("assessment")
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Phone navigation. Quick Check runs full-screen in class, so it gets the whole height. */}
      <BottomTabBar
        activeSpace={topNavSpace}
        onChangeSpace={changeSpace}
        planBadge={bookmarkedResources.length}
        hidden={activeSpace === "assessment"}
      />

      {/* Settings lives in TopNav, which owns its own open state and modal instance. */}

      {/* Reached from the landing page's "Take the tour" — never auto-opened
          over a space, so arrival is not gated by a dialog. */}
      <ResourceOnboardingModal
        open={showResourceTour}
        onClose={() => setShowResourceTour(false)}
        onClassroomSetup={() => {
          setShowResourceTour(false)
          setShowOnboarding(true)
        }}
      />

      {/* Classroom materials setup — from the landing page, or the tour's last step */}
      <OnboardingModal open={showOnboarding} onComplete={handleOnboardingComplete} />
    </div>
  )
}
