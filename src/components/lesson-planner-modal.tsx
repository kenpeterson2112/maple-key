"use client"

import { useState, useRef, useEffect } from "react"
import {
  X,
  Loader2,
  Lightbulb,
  MessageSquareText,
  Languages,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import type { Resource } from "@/lib/types"
import PageHeader from "@/components/page-header"
import { normalizeGrades } from "@/lib/utils"
import { logLesson, updateLessonFullContent } from "@/lib/lesson-metadata"
import type { LessonMetadata, LessonArtifact, ArtifactStatus, ReproducibleLanguage, TemplateSection } from "@/lib/lesson-metadata"
import ArtifactOrganizerModal from "@/components/artifact-organizer-modal"
import LessonBuildingLoader from "@/components/lesson-building-loader"
import { useBookmarks } from "@/lib/bookmarks-context"
import { sanitizeQuestions } from "@/lib/assessment-types"
import { cacheQuestions, getCachedQuestions } from "@/lib/assessment-questions-cache"
import AssessmentModal from "@/components/assessment-modal"
import { readMaterialsSnapshot, getAllSelectedMaterialLabels } from "@/lib/classroom-resources"
import MaterialsEditorModal from "@/components/materials-editor-modal"
import { getProgressForCodes, type LevelCounts } from "@/lib/assessment-results"
import { getTemplate, resolveTemplateId } from "@/lib/lesson-templates"
import { type UserMaterial } from "@/components/user-materials-section"
import { getUserEmail, getReproducibleLanguage, setReproducibleLanguage, getNoTechMode, setNoTechMode, getLessonSetupMode, setLessonSetupMode, type LessonSetupMode } from "@/lib/personalization"
import { useGlobalFilters } from "@/lib/global-filters"
import type { SidebarFilters } from "@/lib/use-filtered-resources"
import type { Filters } from "@/lib/types"
import {
  PlanningQuestionsStep,
  usePlanningQuestions,
  type PlanningAnswer,
} from "@/components/lesson-planner/planning-questions"
import GeneratedLessonView, { type LessonContentPatch } from "@/components/lesson-planner/generated-lesson"
import SetupSteps, { WIZARD_STEPS } from "@/components/lesson-planner/setup-steps"
import GenerateErrorPanel from "@/components/lesson-planner/generate-error-panel"
import {
  buildFullPrompt,
  buildRequestPayload,
  buildResponseJSON,
  downloadJson,
  exportLessonPdf,
  normalizeArtifacts,
  responseFilename,
  type LessonResponseData,
} from "@/components/lesson-planner/lesson-export"

interface LessonPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  bookmarkedResources: Resource[]
  asSpace?: boolean
  lesson?: LessonMetadata | null
  filters: Filters
  setFilters: (filters: Filters) => void
  sidebarFilters: SidebarFilters
  onSidebarFilterChange: (group: string, items: string[]) => void
}

/**
 * Owns the whole lesson-planning flow and hands each phase to a dedicated view:
 * `SetupSteps` while configuring, `PlanningQuestionsStep` between the two API
 * calls, and `GeneratedLessonView` once a plan exists. All draft state lives
 * here — the views are presentational.
 */
export default function LessonPlannerModal({
  isOpen,
  onClose,
  onBack,
  bookmarkedResources,
  asSpace = false,
  lesson = null,
  filters,
  setFilters,
  sidebarFilters,
}: LessonPlannerModalProps) {
  const { clearBookmarks } = useBookmarks()
  const globalFilters = useGlobalFilters()
  const fc = lesson?.fullContent

  const [includeAssessmentData, setIncludeAssessmentData] = useState(false)
  const [lessonLength, setLessonLength] = useState(lesson?.lessonLength ?? "60 minutes")
  const [lessonTemplate, setLessonTemplate] = useState(lesson?.lessonTemplate ?? "3-Part Lesson")
  const [teacherNotes, setTeacherNotes] = useState("")
  // Language for student-facing reproducibles only (artifacts + printable organizer).
  // Reopening a saved lesson prefers its stored value; otherwise the remembered preference.
  const [reproducibleLanguage, setReproducibleLanguageState] =
    useState<ReproducibleLanguage>(fc?.reproducibleLanguage ?? getReproducibleLanguage())
  const [noTechMode, setNoTechModeState] = useState<boolean>(fc?.noTechMode ?? getNoTechMode())
  const [userMaterials, setUserMaterials] = useState<UserMaterial[]>([])
  const [isMaterialsEditorOpen, setIsMaterialsEditorOpen] = useState(false)
  const [materialsTick, setMaterialsTick] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [lessonGenerated, setLessonGenerated] = useState(!!lesson)

  // Setup layout: guided one-step-at-a-time wizard vs. everything on one page.
  const [setupMode, setSetupModeState] = useState<LessonSetupMode>(getLessonSetupMode())
  const [wizardStep, setWizardStep] = useState(0)

  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [lessonTitle, setLessonTitle] = useState(lesson?.title ?? "")
  const [coveredCodes, setCoveredCodes] = useState<string[]>(lesson?.curriculumCodesCovered ?? [])
  const [mindsOnContent, setMindsOnContent] = useState(fc?.mindsOnContent ?? lesson?.lessonContent?.mindsOn ?? "")
  const [mindsOnDifferentiation, setMindsOnDifferentiation] = useState(fc?.mindsOnDifferentiation ?? "")
  const [actionContent, setActionContent] = useState(fc?.actionContent ?? lesson?.lessonContent?.action ?? "")
  const [actionDifferentiation, setActionDifferentiation] = useState(fc?.actionDifferentiation ?? "")
  const [consolidationContent, setConsolidationContent] = useState(fc?.consolidationContent ?? lesson?.lessonContent?.consolidation ?? "")
  const [consolidationAssessment, setConsolidationAssessment] = useState(fc?.consolidationAssessment ?? "")
  const [materialsContent, setMaterialsContent] = useState(fc?.materialsContent ?? "")
  const [learningGoal, setLearningGoal] = useState(fc?.learningGoal ?? "")
  const [successCriteria, setSuccessCriteria] = useState<string[]>(fc?.successCriteria ?? [])
  const [materialsResources, setMaterialsResources] = useState<string[]>(fc?.materials?.resources ?? [])
  const [classroomMaterialsUsed, setClassroomMaterialsUsed] = useState<string[]>(fc?.materials?.classroomMaterials ?? [])
  const [materialsPreparation, setMaterialsPreparation] = useState<string[]>(fc?.materials?.preparation ?? [])
  const [excludedResources, setExcludedResources] = useState<{ title: string; reason: string }[]>(fc?.excludedResources ?? [])
  const [artifacts, setArtifacts] = useState<LessonArtifact[]>(fc?.artifacts ?? [])
  const [organizerArtifactIndex, setOrganizerArtifactIndex] = useState<number | null>(null)
  const [approvedSections, setApprovedSections] = useState<Record<string, boolean>>(fc?.approvedSections ?? {})

  // Two-call flow state
  const planning = usePlanningQuestions()
  const {
    showQuestionsStep,
    setShowQuestionsStep,
    planningQuestions,
    setPlanningQuestions,
    questionSelections,
    setQuestionSelections,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    openResponseValues,
    showingOpenResponse,
  } = planning
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>(fc?.sections ?? [])

  const [generateError, setGenerateError] = useState<string | null>(null)
  const [showAssessment, setShowAssessment] = useState(false)
  const [latestLesson, setLatestLesson] = useState<LessonMetadata | null>(lesson)

  // Resources shown in the generated view come from the saved lesson snapshot
  // when reopening a stored lesson; otherwise from live bookmarks.
  const activeLesson = lesson ?? latestLesson
  const resources: Resource[] =
    activeLesson?.resources && activeLesson.resources.length > 0 ? activeLesson.resources : bookmarkedResources

  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [pasteError, setPasteError] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentQuestionIndex, showQuestionsStep, wizardStep, setupMode])

  const bookmarkedCodes = Array.from(
    new Set(bookmarkedResources.flatMap((r) => r.curriculum_expectations ?? [])),
  )
  const classProgress: Record<string, LevelCounts> =
    bookmarkedCodes.length > 0 ? getProgressForCodes(bookmarkedCodes) : {}
  const hasClassProgress = Object.values(classProgress).some(
    (c) => c.level1 + c.level2 + c.level3 + c.level4 > 0,
  )

  useEffect(() => {
    setIncludeAssessmentData(hasClassProgress)
    // Only re-run when the underlying availability flips. Codes string compare is sufficient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasClassProgress])

  // materialsTick forces re-read after the in-planner editor saves.
  void materialsTick
  const classroomResourceLabels = getAllSelectedMaterialLabels()
  const materialsSnapshot = readMaterialsSnapshot()

  const lessonMinutes = Number.parseInt(lessonLength) || 60
  const templateDef = getTemplate(lessonTemplate)
  const isThreePart = resolveTemplateId(lessonTemplate) === "3-part"

  // Export gating: every lesson stage (not Materials) must be approved first.
  const requiredStageKeys = isThreePart
    ? ["mindsOn", "action", "consolidation"]
    : templateSections.map((s) => `section-${s.id}`)
  const unapprovedCount = requiredStageKeys.filter((k) => !approvedSections[k]).length
  const allStagesApproved = requiredStageKeys.length > 0 && unapprovedCount === 0

  const isWizard = setupMode === "wizard"
  const isLastWizardStep = wizardStep === WIZARD_STEPS.length - 1

  // Class-context step shares one PlanContextBar over two stores: province/grade/
  // subject/strand live in the persisted global filters (also driving the full
  // discovery surface), while free-text topic lives in the App-level filters.
  // Each ChipPicker changes exactly one field per call, so we route by diff.
  const classContextFilters: Filters = {
    ...filters,
    province: globalFilters.state.province,
    grade: globalFilters.state.grade,
    subject: globalFilters.state.subject,
    strand: globalFilters.state.strand,
    topic: filters.topic,
  }
  const handleClassContextChange = (next: Filters) => {
    if (next.province !== globalFilters.state.province) globalFilters.setProvince(next.province)
    if (next.grade !== globalFilters.state.grade) globalFilters.setGrade(next.grade)
    if (next.subject !== globalFilters.state.subject) globalFilters.setSubject(next.subject)
    if (next.strand !== globalFilters.state.strand) globalFilters.setStrand(next.strand)
    if (next.topic !== filters.topic) setFilters({ ...filters, topic: next.topic })
  }

  // Explicit class context for the two generation calls. Only non-empty fields
  // are sent, so the API keeps its resources[0]/Ontario fallbacks when a teacher
  // skips the step. `grade` takes the first selected grade (the API expects one).
  const classContextPayload = {
    ...(globalFilters.state.province ? { province: globalFilters.state.province } : {}),
    ...(globalFilters.state.grade
      ? { grade: globalFilters.state.grade.split(",").filter(Boolean)[0] ?? "" }
      : {}),
    ...(globalFilters.state.subject ? { subject: globalFilters.state.subject } : {}),
    ...(filters.topic ? { topic: filters.topic } : {}),
  }

  const requestPayload = () =>
    buildRequestPayload({
      bookmarkedResources,
      lessonLength,
      lessonTemplate,
      teacherNotes,
      includeAssessmentData,
      classroomResources: classroomResourceLabels,
      reproducibleLanguage,
      noTechMode,
      classContext: classContextPayload,
      ...(includeAssessmentData && hasClassProgress ? { classProgress } : {}),
    })

  /**
   * Fans a generate-lesson response (fresh from the API, imported, or pasted)
   * into draft state and logs it to the lesson library.
   */
  const applyLessonData = (data: LessonResponseData) => {
    setLessonTitle(data.title ?? "")
    setCoveredCodes(data.curriculumCodesCovered ?? [])
    setMindsOnContent(data.mindsOnContent ?? "")
    setMindsOnDifferentiation(data.mindsOnDifferentiation ?? "")
    setActionContent(data.actionContent ?? "")
    setActionDifferentiation(data.actionDifferentiation ?? "")
    setConsolidationContent(data.consolidationContent ?? "")
    setConsolidationAssessment(data.consolidationAssessment ?? "")
    setMaterialsContent(data.materialsContent ?? "")
    setLearningGoal(data.learningGoal ?? "")
    setSuccessCriteria(data.successCriteria ?? [])
    setMaterialsResources(data.materials?.resources ?? [])
    setClassroomMaterialsUsed(data.materials?.classroomMaterials ?? [])
    setMaterialsPreparation(data.materials?.preparation ?? [])
    setExcludedResources(data.excludedResources ?? [])
    if (Array.isArray(data.sections) && data.sections.length > 0) {
      setTemplateSections(data.sections)
    }
    const incomingArtifacts = normalizeArtifacts(data.artifacts)
    setArtifacts(incomingArtifacts)
    const logged = logLesson({
      title: data.title ?? "",
      grade: normalizeGrades(bookmarkedResources[0]?.grade_level)[0] ?? "",
      subject: bookmarkedResources[0]?.subject ?? "",
      curriculumCodesCovered: data.curriculumCodesCovered ?? [],
      resourceIds: bookmarkedResources.map((r) => r.id),
      resources: bookmarkedResources,
      lessonLength,
      lessonTemplate,
      lessonContent: {
        mindsOn: (data.mindsOnContent ?? data.sections?.[0]?.content ?? "").slice(0, 600),
        action: (data.actionContent ?? data.sections?.[1]?.content ?? "").slice(0, 600),
        consolidation: (data.consolidationContent ?? data.sections?.[data.sections?.length - 1]?.content ?? "").slice(0, 600),
      },
      fullContent: {
        mindsOnContent: data.mindsOnContent ?? "",
        mindsOnDifferentiation: data.mindsOnDifferentiation ?? "",
        actionContent: data.actionContent ?? "",
        actionDifferentiation: data.actionDifferentiation ?? "",
        consolidationContent: data.consolidationContent ?? "",
        consolidationAssessment: data.consolidationAssessment ?? "",
        learningGoal: data.learningGoal ?? "",
        successCriteria: data.successCriteria ?? [],
        materials: data.materials ?? { resources: [], classroomMaterials: [], preparation: [] },
        excludedResources: data.excludedResources ?? [],
        sections: data.sections ?? [],
        artifacts: incomingArtifacts,
        reproducibleLanguage,
        noTechMode,
      },
    })
    setLatestLesson(logged)
    setLessonGenerated(true)
    clearBookmarks()
    const bundledQs = sanitizeQuestions(data.assessmentQuestions)
    if (import.meta.env.DEV) {
      if (data.assessmentQuestions == null) console.warn("[maplekey] API response had no assessmentQuestions field")
      else if (!bundledQs.length) console.warn("[maplekey] assessmentQuestions present but all dropped by sanitize:", data.assessmentQuestions)
      else console.info(`[maplekey] cached ${bundledQs.length} questions for ${logged.id}`)
    }
    if (bundledQs.length) cacheQuestions(logged.id, bundledQs)
  }

  const applyResponseJSON = (jsonText: string, onError: (msg: string) => void) => {
    try {
      applyLessonData(JSON.parse(jsonText))
      setGenerateError(null)
      setPasteError(null)
    } catch {
      onError("Invalid JSON — check the format and try again.")
    }
  }

  if (!isOpen) return null

  const callGenerateLesson = async (planningAnswers: PlanningAnswer[] = []) => {
    setIsGenerating(true)
    setGenerateError(null)
    setShowQuestionsStep(false)
    // Dev mock: set localStorage["maplekey_lesson_mock"] to a saved response JSON to skip the API
    if (import.meta.env.DEV) {
      const mockRaw = localStorage.getItem("maplekey_lesson_mock")
      if (mockRaw) {
        applyResponseJSON(mockRaw, (msg) => setGenerateError(msg))
        setIsGenerating(false)
        return
      }
    }
    try {
      const userEmail = getUserEmail()
      const res = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MK-Api-Key": import.meta.env.VITE_MK_API_KEY ?? "",
          ...(userEmail ? { "X-User-Email": userEmail } : {}),
        },
        body: JSON.stringify({
          ...requestPayload(),
          ...(planningAnswers.length > 0 ? { planningAnswers } : {}),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 402 || body.error === "API_BALANCE_LOW") {
          throw new Error("API_BALANCE_LOW")
        }
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      applyLessonData(await res.json())
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGenerateError(null)

    // Dev mock short-circuit: skip questions step entirely
    if (import.meta.env.DEV) {
      const mockRaw = localStorage.getItem("maplekey_lesson_mock")
      if (mockRaw) {
        applyResponseJSON(mockRaw, (msg) => setGenerateError(msg))
        setIsGenerating(false)
        return
      }
    }

    try {
      const qUserEmail = getUserEmail()
      const qRes = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-MK-Api-Key": import.meta.env.VITE_MK_API_KEY ?? "",
          ...(qUserEmail ? { "X-User-Email": qUserEmail } : {}),
        },
        body: JSON.stringify(requestPayload()),
      })
      if (qRes.ok) {
        const qData = await qRes.json()
        if (qData.status === "ok" && Array.isArray(qData.questions) && qData.questions.length > 0) {
          setPlanningQuestions(qData.questions)
          setQuestionSelections({})
          setIsGenerating(false)
          setShowQuestionsStep(true)
          return
        }
      }
    } catch {
      // generate-questions failed — degrade gracefully, fall through to direct lesson generation
    }

    // Degraded or failed: generate lesson directly with no planning answers
    await callGenerateLesson([])
  }

  const handleQuestionsSubmit = () => {
    const answers: PlanningAnswer[] = planningQuestions.map((q) => {
      const selected = questionSelections[q.id] ?? []
      return {
        questionId: q.id,
        questionPrompt: q.prompt,
        answer: selected.join(", "),
      }
    })
    callGenerateLesson(answers)
  }

  const advanceQuestion = (qId: string, selectedOpts?: string[]) => {
    const finalSelections = { ...questionSelections }
    if (selectedOpts !== undefined) {
      finalSelections[qId] = selectedOpts
    } else if (showingOpenResponse[qId] && openResponseValues[qId]?.trim()) {
      finalSelections[qId] = [openResponseValues[qId].trim()]
    }
    setQuestionSelections(finalSelections)

    if (currentQuestionIndex < planningQuestions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1)
    } else {
      const answers: PlanningAnswer[] = planningQuestions.map((q) => ({
        questionId: q.id,
        questionPrompt: q.prompt,
        answer: (finalSelections[q.id] ?? []).join(", "),
      }))
      setShowQuestionsStep(false)
      callGenerateLesson(answers)
    }
  }

  const handleRegenerate = () => {
    setLessonGenerated(false)
    persistApprovals({}) // regenerated content must be re-reviewed
    callGenerateLesson()
  }

  const handleExportPDF = () => {
    const opened = exportLessonPdf({
      lessonTitle,
      lessonLength,
      lessonTemplate,
      coveredCodes,
      learningGoal,
      successCriteria,
      materialsResources,
      classroomMaterialsUsed,
      materialsPreparation,
      materialsContent,
      mindsOnContent,
      mindsOnDifferentiation,
      actionContent,
      actionDifferentiation,
      consolidationContent,
      consolidationAssessment,
      templateSections,
      resources,
      isThreePart,
      templateDef,
      lessonMinutes,
    })
    if (!opened) {
      alert("Please allow popups to export the lesson plan")
    }
  }

  const handleExportResponseJSON = () => {
    downloadJson(
      buildResponseJSON({
        isThreePart,
        lessonTitle,
        learningGoal,
        successCriteria,
        coveredCodes,
        mindsOnContent,
        mindsOnDifferentiation,
        actionContent,
        actionDifferentiation,
        consolidationContent,
        consolidationAssessment,
        templateSections,
        materialsResources,
        classroomMaterialsUsed,
        materialsPreparation,
        excludedResources,
        assessmentQuestions: latestLesson ? getCachedQuestions(latestLesson.id) : null,
      }),
      responseFilename(lessonTitle),
    )
  }

  const handleImportResponseJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => applyResponseJSON(
      evt.target?.result as string,
      (msg) => setGenerateError(msg),
    )
    reader.readAsText(file)
    e.target.value = ""
  }

  const handleLanguageChange = (lang: ReproducibleLanguage) => {
    setReproducibleLanguageState(lang)
    setReproducibleLanguage(lang)
  }

  const handleNoTechModeChange = (value: boolean) => {
    setNoTechModeState(value)
    setNoTechMode(value)
  }

  const handleSetupModeChange = (mode: LessonSetupMode) => {
    setSetupModeState(mode)
    setLessonSetupMode(mode)
  }

  const goToWizardStep = (step: number) => {
    setWizardStep(Math.max(0, Math.min(step, WIZARD_STEPS.length - 1)))
  }

  const persistArtifacts = (next: LessonArtifact[]) => {
    setArtifacts(next)
    const id = activeLesson?.id
    if (id) updateLessonFullContent(id, { artifacts: next })
  }

  const handleArtifactStatusChange = (index: number, status: ArtifactStatus) => {
    persistArtifacts(artifacts.map((a, i) => (i === index ? { ...a, status } : a)))
  }

  const handleSaveOrganizerFields = (index: number, fields: Record<string, string>) => {
    persistArtifacts(
      artifacts.map((a, i) => (i === index ? { ...a, organizer: { fields } } : a)),
    )
  }

  function persistApprovals(next: Record<string, boolean>) {
    setApprovedSections(next)
    const id = activeLesson?.id
    if (id) updateLessonFullContent(id, { approvedSections: next })
  }

  const approveStage = (key: string) => persistApprovals({ ...approvedSections, [key]: true })

  // Editing a stage means it needs a fresh review, so drop any prior approval.
  const editStage = (key: string) => {
    setEditingSection(key)
    if (approvedSections[key]) persistApprovals({ ...approvedSections, [key]: false })
  }

  /** Inline edits on the generated plan arrive as a patch of changed fields. */
  const handleLessonContentChange = (patch: LessonContentPatch) => {
    if (patch.mindsOnContent !== undefined) setMindsOnContent(patch.mindsOnContent)
    if (patch.mindsOnDifferentiation !== undefined) setMindsOnDifferentiation(patch.mindsOnDifferentiation)
    if (patch.actionContent !== undefined) setActionContent(patch.actionContent)
    if (patch.actionDifferentiation !== undefined) setActionDifferentiation(patch.actionDifferentiation)
    if (patch.consolidationContent !== undefined) setConsolidationContent(patch.consolidationContent)
    if (patch.consolidationAssessment !== undefined) setConsolidationAssessment(patch.consolidationAssessment)
    if (patch.materialsPreparation !== undefined) setMaterialsPreparation(patch.materialsPreparation)
  }

  // Setup breathes on large screens; the finished lesson stays a readable measure.
  const contentWidthClass = lessonGenerated
    ? "max-w-3xl xl:max-w-4xl" // ~768–896px reading column
    : "max-w-3xl lg:max-w-5xl" // setup grows to ~1024px on lg+

  const generateErrorPanel = generateError && (
    <GenerateErrorPanel
      error={generateError}
      onDownloadRequest={() => downloadJson(requestPayload(), "lesson-request.json")}
      onCopyRequest={() => navigator.clipboard.writeText(JSON.stringify(requestPayload(), null, 2))}
      onCopyPrompt={() =>
        navigator.clipboard.writeText(
          buildFullPrompt({
            bookmarkedResources,
            lessonLength,
            lessonTemplate,
            teacherNotes,
            includeAssessmentData,
            classroomResources: classroomResourceLabels,
          }),
        )
      }
      onImportFile={handleImportResponseJSON}
      onPasteLoad={(text) => applyResponseJSON(text, (msg) => setPasteError(msg))}
      pasteError={pasteError}
      onClearPasteError={() => setPasteError(null)}
    />
  )

  const frenchHandoutsNotice = reproducibleLanguage === "French" && (
    <div className="mb-3 flex items-center gap-2 rounded-xl border-2 border-blue-300 bg-blue-50 px-4 py-2.5">
      <Languages size={18} className="text-blue-600 shrink-0" />
      <p className="text-sm font-medium text-blue-800">
        Student handouts will be generated in <strong>French</strong> — the lesson
        plan itself stays in English.
      </p>
    </div>
  )

  const generateButton = (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      aria-label={
        isGenerating
          ? "Generating your lesson plan"
          : `Generate lesson plan with ${bookmarkedResources.length} selected resource${bookmarkedResources.length === 1 ? "" : "s"}`
      }
      className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70"
    >
      {isGenerating ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          Generating your lesson...
        </>
      ) : (
        "Generate Lesson Plan"
      )}
    </button>
  )

  return (
    <div className={asSpace ? "w-full h-full overflow-hidden" : "fixed inset-0 z-[200] flex items-center justify-center"}>
      {!asSpace && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />}

      {/* Content */}
      <div className={asSpace ? "w-full h-full bg-[#FAF3E0] flex flex-col overflow-hidden" : "relative w-[95vw] h-[90vh] bg-[#FAF3E0] rounded-3xl shadow-2xl flex flex-col overflow-hidden"}>
        {/* Header */}
        <PageHeader
          icon={Lightbulb}
          title={lessonGenerated ? "Your Lesson Plan" : "Generate Lesson Plan"}
          iconColor="#16A34A"
          iconBg="bg-green-100"
          hideTitleOnMobile={!lessonGenerated}
        >
          <span className="hidden sm:inline whitespace-nowrap text-xs text-[#888]">
            {resources.length} resource{resources.length !== 1 ? "s" : ""} selected
          </span>
          {!asSpace && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#FFE5CC] rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X size={20} className="text-[#8B4513]" />
            </button>
          )}
        </PageHeader>

        {/* Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 lg:p-8">
          {isGenerating && !lessonGenerated ? (
            <LessonBuildingLoader />
          ) : (
          <div className={`${contentWidthClass} mx-auto space-y-6`}>
            {lessonGenerated ? (
              <GeneratedLessonView
                lessonTitle={lessonTitle}
                coveredCodes={coveredCodes}
                learningGoal={learningGoal}
                successCriteria={successCriteria}
                mindsOnContent={mindsOnContent}
                mindsOnDifferentiation={mindsOnDifferentiation}
                actionContent={actionContent}
                actionDifferentiation={actionDifferentiation}
                consolidationContent={consolidationContent}
                consolidationAssessment={consolidationAssessment}
                materialsContent={materialsContent}
                materialsResources={materialsResources}
                classroomMaterialsUsed={classroomMaterialsUsed}
                materialsPreparation={materialsPreparation}
                excludedResources={excludedResources}
                artifacts={artifacts}
                templateSections={templateSections}
                resources={resources}
                lessonLength={lessonLength}
                lessonTemplate={lessonTemplate}
                lessonMinutes={lessonMinutes}
                isThreePart={isThreePart}
                templateDef={templateDef}
                editingSection={editingSection}
                approvedSections={approvedSections}
                allStagesApproved={allStagesApproved}
                unapprovedCount={unapprovedCount}
                canRegenerate={bookmarkedResources.length > 0}
                canAssess={!!latestLesson}
                onEditSection={setEditingSection}
                onApproveStage={approveStage}
                onEditStage={editStage}
                onChange={handleLessonContentChange}
                onTemplateSectionsChange={setTemplateSections}
                onExportPDF={handleExportPDF}
                onExportJSON={handleExportResponseJSON}
                onRegenerate={handleRegenerate}
                onArtifactStatusChange={handleArtifactStatusChange}
                onOpenOrganizer={(i) => setOrganizerArtifactIndex(i)}
                onOpenFeedback={() => setShowFeedbackDialog(true)}
                onStartAssessment={() => setShowAssessment(true)}
              />
            ) : showQuestionsStep ? (
              <>
                {/* PLANNING QUESTIONS STEP — one question at a time */}
                <PlanningQuestionsStep state={planning} onAdvance={advanceQuestion} />
                <div className="h-6" />
              </>
            ) : (
              <SetupSteps
                setupMode={setupMode}
                wizardStep={wizardStep}
                onSetupModeChange={handleSetupModeChange}
                onGoToStep={goToWizardStep}
                classContextFilters={classContextFilters}
                onClassContextChange={handleClassContextChange}
                sidebarFilters={sidebarFilters}
                bookmarkedResources={bookmarkedResources}
                userMaterials={userMaterials}
                onUserMaterialsChange={setUserMaterials}
                onBrowseAll={onBack}
                includeAssessmentData={includeAssessmentData}
                onIncludeAssessmentDataChange={setIncludeAssessmentData}
                hasClassProgress={hasClassProgress}
                classProgress={classProgress}
                lessonMinutes={lessonMinutes}
                lessonTemplate={lessonTemplate}
                onLessonLengthChange={setLessonLength}
                onLessonTemplateChange={setLessonTemplate}
                noTechMode={noTechMode}
                onNoTechModeChange={handleNoTechModeChange}
                materialsSnapshot={materialsSnapshot}
                onOpenMaterialsEditor={() => setIsMaterialsEditorOpen(true)}
                reproducibleLanguage={reproducibleLanguage}
                onLanguageChange={handleLanguageChange}
                teacherNotes={teacherNotes}
                onTeacherNotesChange={setTeacherNotes}
              />
            )}
          </div>
          )}
        </div>

        {!lessonGenerated && showQuestionsStep && (
          <div className="sticky bottom-0 border-t-2 border-[#E8D5C4] bg-white px-6 py-4">
            <div className={`${contentWidthClass} mx-auto`}>
              <button
                onClick={handleQuestionsSubmit}
                className="w-full py-2 text-sm text-[#888] hover:text-violet-700 transition-colors"
              >
                Skip questions &amp; generate now
              </button>
            </div>
          </div>
        )}

        {!lessonGenerated && !showQuestionsStep && !isGenerating && !isWizard && (
          <div className="hidden md:block sticky bottom-0 border-t-2 border-[#E8D5C4] bg-white px-6 py-4">
            <div className={`${contentWidthClass} mx-auto space-y-3`}>
              {generateErrorPanel}
              {frenchHandoutsNotice}
              {generateButton}
            </div>
          </div>
        )}

        {!lessonGenerated && !showQuestionsStep && !isGenerating && isWizard && (
          <div className="sticky bottom-0 border-t-2 border-[#E8D5C4] bg-white px-6 py-4">
            <div className={`${contentWidthClass} mx-auto space-y-3`}>
              {isLastWizardStep && generateErrorPanel}
              {isLastWizardStep && frenchHandoutsNotice}
              <div className="flex items-center gap-3">
                {wizardStep > 0 && (
                  <button
                    type="button"
                    onClick={() => goToWizardStep(wizardStep - 1)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 border-2 border-[#E8D5C4] hover:bg-[#FAF3E0] text-[#8B4513] text-sm font-semibold rounded-xl transition-colors"
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>
                )}
                {isLastWizardStep ? (
                  generateButton
                ) : (
                  <button
                    type="button"
                    onClick={() => goToWizardStep(wizardStep + 1)}
                    className="w-full py-3 bg-[#FF6B35] hover:bg-[#e55a2a] text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    Next: {WIZARD_STEPS[wizardStep + 1].label}
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAssessment && latestLesson && (
        <AssessmentModal
          isOpen={showAssessment}
          onClose={() => setShowAssessment(false)}
          lesson={latestLesson}
        />
      )}

      {organizerArtifactIndex !== null && artifacts[organizerArtifactIndex] && (
        <ArtifactOrganizerModal
          artifact={artifacts[organizerArtifactIndex]}
          lessonTitle={lessonTitle}
          language={activeLesson?.fullContent?.reproducibleLanguage ?? reproducibleLanguage}
          onClose={() => setOrganizerArtifactIndex(null)}
          onSave={(fields) => handleSaveOrganizerFields(organizerArtifactIndex, fields)}
        />
      )}

      <MaterialsEditorModal
        isOpen={isMaterialsEditorOpen}
        onClose={() => setIsMaterialsEditorOpen(false)}
        onSaved={() => setMaterialsTick((t) => t + 1)}
      />

      {showFeedbackDialog && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFeedbackDialog(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-md mx-4">
            <button
              onClick={() => setShowFeedbackDialog(false)}
              className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close dialog"
            >
              <X size={20} className="text-gray-500" />
            </button>
            <div className="text-center pt-2">
              <MessageSquareText size={40} className="text-[#FF6B35] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[#2C2C2C] mb-3">Feedback Form</h3>
              <p className="text-sm text-[#666] leading-relaxed">
                Feedback form under construction. Please mail us at{" "}
                <a href="mailto:feedback@maplekey.ca" className="text-[#FF6B35] hover:underline font-medium">
                  feedback@maplekey.ca
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
