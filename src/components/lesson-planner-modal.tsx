"use client"

import { useState, useRef, useEffect } from "react"
import {
  X,
  Users,
  Layout,
  Clock,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Copy,
  Check,
  Lightbulb,
  Target,
  MessageCircle,
  ClipboardList,
  Pencil,
  MessageSquareText,
  School,
  Languages,
  MonitorOff,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react"
import type { Resource } from "@/lib/types"
import PageHeader from "@/components/page-header"
import { normalizeGrades } from "@/lib/utils"
import { logLesson, updateLessonFullContent } from "@/lib/lesson-metadata"
import type { LessonMetadata, LessonArtifact, ArtifactStatus, ReproducibleLanguage, TemplateSection } from "@/lib/lesson-metadata"
import ArtifactsSection from "@/components/artifacts-section"
import StageReviewFooter from "@/components/stage-review-footer"
import ArtifactOrganizerModal from "@/components/artifact-organizer-modal"
import LessonBuildingLoader from "@/components/lesson-building-loader"
import {
  openPrintWindow,
  escapeHtml,
  nl2br as nl2brHtml,
  PRINT_ON_LOAD_SCRIPT,
} from "@/lib/print-html"
import { useBookmarks } from "@/lib/bookmarks-context"
import { sanitizeQuestions } from "@/lib/assessment-types"
import { cacheQuestions, getCachedQuestions } from "@/lib/assessment-questions-cache"
import AssessmentModal from "@/components/assessment-modal"
import { readMaterialsSnapshot, getAllSelectedMaterialLabels } from "@/lib/classroom-resources"
import MaterialsSummary from "@/components/materials-summary"
import MaterialsEditorModal from "@/components/materials-editor-modal"
import { getProgressForCodes, type LevelCounts } from "@/lib/assessment-results"
import { LEVEL_META, LEVEL_ORDER } from "@/lib/assessment-types"
import { describeCode } from "@/lib/curriculum-codes"
import { LESSON_TEMPLATES, getTemplate, resolveTemplateId } from "@/lib/lesson-templates"
import { type UserMaterial } from "@/components/user-materials-section"
import { getUserEmail, getReproducibleLanguage, setReproducibleLanguage, getNoTechMode, setNoTechMode, getLessonSetupMode, setLessonSetupMode, type LessonSetupMode } from "@/lib/personalization"
import { useGlobalFilters } from "@/lib/global-filters"
import PlanResourcePicker from "@/components/plan-resource-picker"
import PlanContextBar from "@/components/plan-context-bar"
import type { SidebarFilters } from "@/lib/use-filtered-resources"
import type { Filters } from "@/lib/types"

interface PlanningQuestion {
  id: string
  prompt: string
  rationale: string
  answerFormat: "single-select" | "this-that-both" | "multi-select"
  options: string[]
}

interface PlanningAnswer {
  questionId: string
  questionPrompt: string
  answer: string
}

/**
 * Guided setup steps. Same form state as the single-page layout — the wizard
 * only changes which cards are visible at once, so switching modes mid-setup
 * never loses anything.
 */
const WIZARD_STEPS = [
  { label: "Class" },
  { label: "Resources" },
  { label: "Format" },
  { label: "Personalize" },
  { label: "Review" },
] as const

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
  onSidebarFilterChange,
}: LessonPlannerModalProps) {
  const { clearBookmarks, removeBookmark } = useBookmarks()
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
  const [showQuestionsStep, setShowQuestionsStep] = useState(false)
  const [planningQuestions, setPlanningQuestions] = useState<PlanningQuestion[]>([])
  const [questionSelections, setQuestionSelections] = useState<Record<string, string[]>>({})
  const [templateSections, setTemplateSections] = useState<TemplateSection[]>(fc?.sections ?? [])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [openResponseValues, setOpenResponseValues] = useState<Record<string, string>>({})
  const [showingOpenResponse, setShowingOpenResponse] = useState<Record<string, boolean>>({})

  const [generateError, setGenerateError] = useState<string | null>(null)
  const [showAssessment, setShowAssessment] = useState(false)
  const [latestLesson, setLatestLesson] = useState<LessonMetadata | null>(lesson)

  // Resources shown in the generated view come from the saved lesson snapshot
  // when reopening a stored lesson; otherwise from live bookmarks.
  const activeLesson = lesson ?? latestLesson
  const resources: Resource[] =
    activeLesson?.resources && activeLesson.resources.length > 0 ? activeLesson.resources : bookmarkedResources

  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [copiedState, setCopiedState] = useState<"request" | "prompt" | null>(null)
  const [showPastePanel, setShowPastePanel] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [pasteError, setPasteError] = useState<string | null>(null)

  const importInputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showQuestionsStep) {
      setCurrentQuestionIndex(0)
      setOpenResponseValues({})
      setShowingOpenResponse({})
    }
  }, [showQuestionsStep])

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

  if (!isOpen) return null

  const uniqueStrands = new Set(bookmarkedResources.flatMap((r) => r.strand || []))
  const showWarning = bookmarkedResources.length > 5 || uniqueStrands.size > 2

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
          resources: bookmarkedResources.map((r) => ({
            title: (r as any).topic_title,
            description: r.description,
            curriculum_expectations: r.curriculum_expectations ?? [],
            grade: (r as any).grade_level,
            subject: r.subject,
            publisher: (r as any).publisher_creator,
            instructional_modes: r.instructional_modes,
            usage_notes: r.usage_notes,
          })),
          lessonLength,
          lessonTemplate,
          teacherNotes,
          includeAssessmentData,
          classroomResources: classroomResourceLabels,
          reproducibleLanguage,
          noTechMode,
          ...classContextPayload,
          ...(planningAnswers.length > 0 ? { planningAnswers } : {}),
          ...(includeAssessmentData && hasClassProgress ? { classProgress } : {}),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (res.status === 402 || body.error === "API_BALANCE_LOW") {
          throw new Error("API_BALANCE_LOW")
        }
        throw new Error(body.error ?? `Server error ${res.status}`)
      }
      const data = await res.json()
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
      const incomingArtifacts: LessonArtifact[] = (data.artifacts ?? [])
        .map((a: any) => ({
          name: String(a?.name ?? "").trim(),
          purpose: String(a?.purpose ?? "").trim(),
          section: (["mindsOn", "action", "consolidation", "materials"].includes(a?.section)
            ? a.section
            : "materials") as LessonArtifact["section"],
          status: (["unset", "have", "will-make", "help-me"].includes(a?.status)
            ? a.status
            : "unset") as ArtifactStatus,
        }))
        .filter((a: LessonArtifact) => a.name.length > 0)
      setArtifacts(incomingArtifacts)
      const logged = logLesson({
        title: data.title ?? "",
        grade: normalizeGrades((bookmarkedResources[0] as any)?.grade_level)[0] ?? "",
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
        body: JSON.stringify(buildRequestPayload()),
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

  const handleExportRequestJSON = () => {
    const blob = new Blob([JSON.stringify(buildRequestPayload(), null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "lesson-request.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  const applyResponseJSON = (jsonText: string, onError: (msg: string) => void) => {
    try {
      const data = JSON.parse(jsonText)
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
      const incomingArtifacts: LessonArtifact[] = (data.artifacts ?? [])
        .map((a: any) => ({
          name: String(a?.name ?? "").trim(),
          purpose: String(a?.purpose ?? "").trim(),
          section: (["mindsOn", "action", "consolidation", "materials"].includes(a?.section)
            ? a.section
            : "materials") as LessonArtifact["section"],
          status: (["unset", "have", "will-make", "help-me"].includes(a?.status)
            ? a.status
            : "unset") as ArtifactStatus,
        }))
        .filter((a: LessonArtifact) => a.name.length > 0)
      setArtifacts(incomingArtifacts)
      const logged = logLesson({
        title: data.title ?? "",
        grade: normalizeGrades((bookmarkedResources[0] as any)?.grade_level)[0] ?? "",
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
      if (bundledQs.length) cacheQuestions(logged.id, bundledQs)
      setGenerateError(null)
      setShowPastePanel(false)
      setPasteText("")
      setPasteError(null)
    } catch {
      onError("Invalid JSON — check the format and try again.")
    }
  }

  const handleExportResponseJSON = () => {
    const cached = latestLesson ? getCachedQuestions(latestLesson.id) : null
    const responseData = isThreePart ? {
      title: lessonTitle,
      learningGoal,
      successCriteria,
      curriculumCodesCovered: coveredCodes,
      mindsOnContent,
      mindsOnDifferentiation,
      actionContent,
      actionDifferentiation,
      consolidationContent,
      consolidationAssessment,
      materials: { resources: materialsResources, classroomMaterials: classroomMaterialsUsed, preparation: materialsPreparation },
      ...(excludedResources.length ? { excludedResources } : {}),
      ...(cached && cached.length ? { assessmentQuestions: cached } : {}),
    } : {
      title: lessonTitle,
      learningGoal,
      successCriteria,
      curriculumCodesCovered: coveredCodes,
      sections: templateSections,
      materials: { resources: materialsResources, classroomMaterials: classroomMaterialsUsed, preparation: materialsPreparation },
      ...(excludedResources.length ? { excludedResources } : {}),
      ...(cached && cached.length ? { assessmentQuestions: cached } : {}),
    }
    const blob = new Blob([JSON.stringify(responseData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `lesson-${lessonTitle.slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase() || "response"}.json`
    a.click()
    URL.revokeObjectURL(url)
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

  const handlePasteLoad = () => {
    applyResponseJSON(pasteText, (msg) => setPasteError(msg))
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

  const buildRequestPayload = () => ({
    resources: bookmarkedResources.map((r) => ({
      title: (r as any).topic_title,
      description: r.description,
      curriculum_expectations: r.curriculum_expectations ?? [],
      grade: (r as any).grade_level,
      subject: r.subject,
      publisher: (r as any).publisher_creator,
      instructional_modes: r.instructional_modes,
      usage_notes: r.usage_notes,
    })),
    lessonLength,
    lessonTemplate,
    teacherNotes,
    includeAssessmentData,
    classroomResources: classroomResourceLabels,
    reproducibleLanguage,
    noTechMode,
    ...classContextPayload,
    ...(includeAssessmentData && hasClassProgress ? { classProgress } : {}),
  })

  const handleCopyRequestJSON = async () => {
    await navigator.clipboard.writeText(JSON.stringify(buildRequestPayload(), null, 2))
    setCopiedState("request")
    setTimeout(() => setCopiedState(null), 2000)
  }

  const handleCopyFullPrompt = async () => {
    const grade = String((bookmarkedResources[0] as any)?.grade_level ?? "unknown")
    const subject = bookmarkedResources[0]?.subject ?? "unknown"
    const allCodes = [...new Set(bookmarkedResources.flatMap((r) => r.curriculum_expectations ?? []))]
    const resourceList = bookmarkedResources
      .map((r, i) => {
        const lines = [
          `Resource ${i + 1}: "${(r as any).topic_title}"`,
          `  Description: ${r.description}`,
          `  Publisher: ${(r as any).publisher_creator ?? "unknown"}`,
          `  Curriculum codes: ${r.curriculum_expectations?.join(", ") || "not specified"}`,
        ]
        if (r.instructional_modes?.length) {
          lines.push(`  Best used as: ${r.instructional_modes.join(", ")}`)
        }
        if (r.usage_notes) {
          lines.push(`  Deployment note: ${r.usage_notes}`)
        }
        return lines.join("\n")
      })
      .join("\n\n")

    const classroomLine =
      classroomResourceLabels.length > 0
        ? `Classroom resources available: ${classroomResourceLabels.join(", ")}`
        : ""

    const systemPrompt = `You are an experienced Ontario elementary school teacher and curriculum expert. You create clear, practical, standards-aligned lesson plans for Canadian classrooms. You always respond with valid JSON only — no markdown fences, no extra text.`

    const userPrompt = `Create a ${lessonLength} lesson plan for Grade ${grade} ${subject} using the following bookmarked resources.

Template: ${lessonTemplate}
${teacherNotes ? `Teacher notes: ${teacherNotes}` : ""}
${classroomLine}
${includeAssessmentData ? "Include targeted differentiation strategies based on recent assessment data." : ""}

Resources to incorporate:
${resourceList}

Ontario curriculum codes available: ${allCodes.join(", ")}

You will also write "assessmentQuestions": a SHORT auto-graded formative quick check that gives the teacher a fast, actionable read on class readiness — NOT a thorough diagnostic.
- Write 3 to 5 questions TOTAL. Aim for 3; use 4 only if needed and 5 only for a large lesson spanning many distinct expectations. Never exceed 5.
- Write ONE well-designed question per curriculum expectation the lesson actually taught. Most lessons cover only 2-3 expectations — do not invent more. When several closely-related expectations are taught, CLUSTER them into a single well-designed question rather than adding more.
- Set each question's "code" to the single curriculum expectation it targets (for a clustered question, use the most representative code). If "curriculumCodesCovered" is empty, write 3 questions on the key concepts you actually taught and set each "code" to a short 2-4 word concept label (e.g., "Circumference and pi").
- Prefer "multiple-choice"; use "true-false" only when it genuinely tests the idea better. Multiple-choice: exactly 4 options with exactly one correct answer; "correctIndex" is the 0-based index of the correct option; distractors must be plausible.
- Every question needs a one-sentence "explanation" of the correct answer. Do NOT write open-ended or free-text questions, and do NOT write more than one question for the same expectation.

Return a JSON object with exactly these fields (string values are plain text, no markdown):
{
  "title": "Creative lesson title",
  "learningGoal": "One student-facing sentence describing what students will learn today",
  "successCriteria": ["I can ...", "I can ...", "I can ..."],
  "curriculumCodesCovered": ["code1", "code2"],
  "mindsOnContent": "Hook/activation activity description (2-4 sentences)",
  "mindsOnDifferentiation": "Differentiation strategies for Minds On phase",
  "actionContent": "Main learning activity description with any stations or tasks",
  "actionDifferentiation": "Differentiation strategies for Action phase",
  "consolidationContent": "Closing/consolidation activity description",
  "consolidationAssessment": "Assessment notes — which codes may need follow-up and plan for next steps",
  "materials": {
    "resources": ["Resource title 1", "Resource title 2"],
    "preparation": ["What to print or photocopy", "What to pre-load or test on devices"]
  },
  "excludedResources": [],
  "assessmentQuestions": [
    { "code": "D1.1", "type": "multiple-choice", "prompt": "...", "options": ["a", "b", "c", "d"], "correctIndex": 0, "explanation": "..." },
    { "code": "D1.2", "type": "true-false", "prompt": "...", "correct": true, "explanation": "..." }
  ]
}`

    const fullPrompt = `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userPrompt}`
    await navigator.clipboard.writeText(fullPrompt)
    setCopiedState("prompt")
    setTimeout(() => setCopiedState(null), 2000)
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

  const persistApprovals = (next: Record<string, boolean>) => {
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

  const lessonMinutes = Number.parseInt(lessonLength) || 60
  const mindsOnTime = Math.round(lessonMinutes * 0.17)
  const actionTime = Math.round(lessonMinutes * 0.58)
  const consolidationTime = Math.round(lessonMinutes * 0.25)
  const templateDef = getTemplate(lessonTemplate)
  const isThreePart = resolveTemplateId(lessonTemplate) === "3-part"

  // Export gating: every lesson stage (not Materials) must be approved first.
  const requiredStageKeys = isThreePart
    ? ["mindsOn", "action", "consolidation"]
    : templateSections.map((s) => `section-${s.id}`)
  const unapprovedCount = requiredStageKeys.filter((k) => !approvedSections[k]).length
  const allStagesApproved = requiredStageKeys.length > 0 && unapprovedCount === 0

  const handleExportPDF = () => {
    const esc = escapeHtml
    const nl2br = nl2brHtml

    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const gradeList = Array.from(new Set(resources.flatMap((r) => r.grade_level || []))).join(", ")
    const subjectList = Array.from(new Set(resources.map((r) => r.subject).filter(Boolean))).join(", ")
    const gradeSubject = [gradeList && `Grade ${gradeList}`, subjectList].filter(Boolean).join(" • ") || ""

    const curriculumCodes =
      coveredCodes.length > 0
        ? coveredCodes.join(", ")
        : resources
            .flatMap((r) => r.curriculum_expectations || [])
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 3)
            .join(", ") || ""

    const resourcesForDisplay =
      materialsResources.length > 0
        ? materialsResources.map((t) => ({ topic_title: t }))
        : resources.map((r) => ({ topic_title: r.topic_title }))

    const preparationSteps =
      materialsPreparation.length > 0
        ? materialsPreparation
        : materialsContent.split("\n").map((s) => s.trim()).filter(Boolean)

    const resourcesListHtml = resourcesForDisplay
      .map((r) => `<li><span class="bullet">•</span><span>${esc(r.topic_title)}</span></li>`)
      .join("")

    const classroomMaterialsHtml = classroomMaterialsUsed
      .map((m) => `<li><span class="bullet">•</span><span>${esc(m)}</span></li>`)
      .join("")

    const preparationHtml = preparationSteps
      .map((item, i) => `<li><span class="step-num">${i + 1}.</span><span>${esc(item)}</span></li>`)
      .join("")

    const actionResourcesHtml = resources
      .slice(0, 3)
      .map((r) => `<li><span class="bullet">•</span><span>${esc(r.topic_title)}</span></li>`)
      .join("")

    const successCriteriaHtml = successCriteria
      .map((sc) => `<li><span class="check">✓</span><span>${esc(sc)}</span></li>`)
      .join("")

    // PDF colors for non-3-Part section IDs
    const PDF_SECTION_COLORS: Record<string, { border: string; text: string; pillBg: string; pillText: string }> = {
      engage:             { border: "#F59E0B", text: "#D97706", pillBg: "#FEF3C7", pillText: "#92400E" },
      explore:            { border: "#14B8A6", text: "#0D9488", pillBg: "#CCFBF1", pillText: "#0F766E" },
      explain:            { border: "#0EA5E9", text: "#0284C7", pillBg: "#E0F2FE", pillText: "#075985" },
      elaborate:          { border: "#10B981", text: "#059669", pillBg: "#D1FAE5", pillText: "#047857" },
      evaluate:           { border: "#8B5CF6", text: "#7C3AED", pillBg: "#EDE9FE", pillText: "#6D28D9" },
      anticipatorySet:    { border: "#F97316", text: "#EA580C", pillBg: "#FFEDD5", pillText: "#9A3412" },
      directInstruction:  { border: "#3B82F6", text: "#2563EB", pillBg: "#DBEAFE", pillText: "#1D4ED8" },
      guidedPractice:     { border: "#06B6D4", text: "#0891B2", pillBg: "#CFFAFE", pillText: "#155E75" },
      independentPractice:{ border: "#22C55E", text: "#16A34A", pillBg: "#DCFCE7", pillText: "#166534" },
      closure:            { border: "#64748B", text: "#475569", pillBg: "#F1F5F9", pillText: "#334155" },
      connect:            { border: "#A855F7", text: "#9333EA", pillBg: "#F3E8FF", pillText: "#7E22CE" },
      launch:             { border: "#6366F1", text: "#4F46E5", pillBg: "#E0E7FF", pillText: "#3730A3" },
      activate:           { border: "#14B8A6", text: "#0D9488", pillBg: "#CCFBF1", pillText: "#0F766E" },
      apply:              { border: "#22C55E", text: "#16A34A", pillBg: "#DCFCE7", pillText: "#166534" },
      share:              { border: "#F97316", text: "#EA580C", pillBg: "#FFEDD5", pillText: "#9A3412" },
      synthesize:         { border: "#F43F5E", text: "#E11D48", pillBg: "#FFE4E6", pillText: "#9F1239" },
    }

    const templateSectionsHtml = !isThreePart && templateSections.length > 0
      ? templateSections.map((section) => {
          const sectionDef = templateDef.sections.find((s) => s.id === section.id)
          const colors = PDF_SECTION_COLORS[section.id] ?? { border: "#E8D5C4", text: "#666", pillBg: "#F5F1EC", pillText: "#6B4423" }
          const sectionTime = sectionDef ? Math.round(lessonMinutes * sectionDef.timeWeight) : 0
          const calloutIsAssessment = sectionDef?.calloutIsAssessment ?? false
          const calloutLabel = sectionDef?.calloutLabel ?? "Notes"
          return `
  <div class="card" style="border-left-color: ${colors.border};">
    <div class="card-head">
      <h2 class="card-title">${esc(section.label)}</h2>
      ${sectionTime > 0 ? `<span class="time-pill" style="background:${colors.pillBg}; color:${colors.pillText};">${sectionTime} min</span>` : ""}
    </div>
    <div class="subtitle" style="color:${colors.text};">${esc(section.subtitle)}</div>
    <p class="body-text">${nl2br(section.content)}</p>
    ${section.callout ? `<div class="callout ${calloutIsAssessment ? "assessment" : "diff"}">
      <div class="callout-title">${esc(calloutLabel)}</div>
      <p>${nl2br(section.callout)}</p>
    </div>` : ""}
  </div>`
        }).join("\n")
      : ""

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(lessonTitle || "Maple Key Lesson")}</title>
  <style>
    @page { size: Letter; margin: 0.5in; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', sans-serif;
      font-size: 10.5pt;
      line-height: 1.5;
      color: #2C2C2C;
      background: #FFF;
      font-weight: 400;
      font-synthesis: none;
      -webkit-font-smoothing: antialiased;
    }

    /* Subtle header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 16px;
      border-bottom: 1px solid #E5E5E5;
      font-size: 9pt;
      color: #888;
    }
    .header .brand { font-weight: 600; letter-spacing: 0.3px; color: #8B4513; }

    /* Title block */
    .lesson-title {
      font-size: 20pt;
      font-weight: 700;
      color: #2C2C2C;
      margin: 0 0 6px 0;
      line-height: 1.2;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 10px;
      font-size: 9.5pt;
      color: #555;
      margin-bottom: 16px;
    }
    .meta .pill {
      background: #F5F1EC;
      border: 1px solid #E8D5C4;
      color: #6B4423;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 9pt;
    }

    /* Cards */
    .card {
      background: #FFF;
      border: 1px solid #E5E5E5;
      border-left-width: 4px;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 14px;
      /* Allow tall cards (e.g. Action with body + Resources + Differentiation)
         to break across pages instead of forcing a full-page gap above. */
      orphans: 3;
      widows: 3;
    }
    /* Short cards stay together; long ones rely on callout/head atomicity below. */
    .card.compact { page-break-inside: avoid; break-inside: avoid; }
    .callout { page-break-inside: avoid; break-inside: avoid; }
    .card-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
      /* Keep the title pill glued to the first paragraph below it. */
      page-break-after: avoid;
      break-after: avoid;
    }
    .card-title {
      font-size: 13pt;
      font-weight: 700;
      color: #2C2C2C;
      margin: 0;
    }
    .time-pill {
      font-size: 8.5pt;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .subtitle {
      font-size: 8.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 0 0 8px 0;
    }
    .body-text {
      font-size: 10.5pt;
      color: #3A3A3A;
      margin: 0;
    }

    /* Color variants */
    .learning  { border-left-color: #E8D5C4; background: #FFFDFB; }
    .learning .label { color: #8B4513; font-weight: 600; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
    .learning ul { list-style: none; padding: 0; margin: 4px 0 0 0; }
    .learning li { display: flex; gap: 6px; align-items: flex-start; font-size: 10pt; margin-bottom: 4px; color: #3A3A3A; }
    .learning .check { color: #10B981; font-weight: 700; }

    .materials { border-left-color: #A8A29E; }
    .materials .cols { display: flex; gap: 12px; }
    .materials .col-resources { width: 30%; }
    .materials .col-prep { flex: 1; }
    .materials .panel {
      background: #FAFAF9;
      border: 1px solid #E7E5E4;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .materials .panel-title {
      font-size: 8.5pt;
      font-weight: 700;
      color: #57534E;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 0 0 6px 0;
    }
    .materials ul { list-style: none; padding: 0; margin: 0; }
    .materials li { display: flex; gap: 6px; align-items: flex-start; font-size: 9.5pt; color: #3A3A3A; margin-bottom: 4px; }
    .materials .bullet { color: #A8A29E; }
    .materials .step-num { color: #A8A29E; min-width: 14px; }

    .minds-on       { border-left-color: #3B82F6; }
    .minds-on .card-title-icon { color: #2563EB; }
    .minds-on .time-pill { background: #DBEAFE; color: #1D4ED8; }
    .minds-on .subtitle  { color: #2563EB; }

    .action          { border-left-color: #10B981; }
    .action .time-pill { background: #D1FAE5; color: #047857; }
    .action .subtitle  { color: #059669; }

    .consolidation          { border-left-color: #8B5CF6; }
    .consolidation .time-pill { background: #EDE9FE; color: #6D28D9; }
    .consolidation .subtitle  { color: #7C3AED; }

    /* Callout boxes inside cards */
    .callout {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid;
      font-size: 9.5pt;
    }
    .callout .callout-title {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin-bottom: 4px;
    }
    .callout p { margin: 0; }

    .callout.diff { background: #FFFBEB; border-color: #FDE68A; }
    .callout.diff .callout-title { color: #92400E; }
    .callout.diff p { color: #78350F; }

    .callout.resources { background: #FAFAF9; border-color: #E7E5E4; }
    .callout.resources .callout-title { color: #57534E; }
    .callout.resources ul { list-style: none; padding: 0; margin: 0; }
    .callout.resources li { display: flex; gap: 6px; font-size: 9.5pt; color: #44403C; margin-bottom: 2px; }
    .callout.resources .bullet { color: #A8A29E; }

    .callout.assessment { background: #F5F3FF; border-color: #DDD6FE; }
    .callout.assessment .callout-title { color: #5B21B6; }
    .callout.assessment p { color: #6D28D9; }

    .footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #E5E5E5;
      text-align: center;
      font-size: 8.5pt;
      color: #999;
    }

    @media print {
      .card { box-shadow: none; }
      a { color: inherit; text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <span class="brand">Maple Key</span>
    <span>${esc(currentDate)}</span>
  </div>

  <h1 class="lesson-title">${esc(lessonTitle || "Untitled Lesson")}</h1>
  <div class="meta">
    ${gradeSubject ? `<span class="pill">${esc(gradeSubject)}</span>` : ""}
    <span class="pill">${esc(lessonLength)}</span>
    <span class="pill">${esc(lessonTemplate.split("(")[0].trim() || "3-Part Lesson")}</span>
    ${curriculumCodes ? `<span class="pill">${esc(curriculumCodes)}</span>` : ""}
  </div>

  ${
    learningGoal || successCriteria.length > 0
      ? `
  <div class="card compact learning">
    ${
      learningGoal
        ? `<div style="margin-bottom:${successCriteria.length > 0 ? "10px" : "0"};">
             <div class="label">Learning Goal</div>
             <p class="body-text" style="margin-top:4px;">${nl2br(learningGoal)}</p>
           </div>`
        : ""
    }
    ${
      successCriteria.length > 0
        ? `<div>
             <div class="label">Success Criteria</div>
             <ul>${successCriteriaHtml}</ul>
           </div>`
        : ""
    }
  </div>`
      : ""
  }

  <div class="card compact materials">
    <div class="card-head">
      <h2 class="card-title">Materials &amp; Preparation</h2>
    </div>
    <div class="cols">
      <div class="col-resources">
        <div class="panel">
          <div class="panel-title">Resources</div>
          <ul>${resourcesListHtml || "<li><span>No resources selected</span></li>"}</ul>
        </div>
        ${classroomMaterialsHtml ? `<div class="panel" style="margin-top:8px;">
          <div class="panel-title">Classroom Materials</div>
          <ul>${classroomMaterialsHtml}</ul>
        </div>` : ""}
      </div>
      <div class="col-prep">
        <div class="panel">
          <div class="panel-title">Preparation</div>
          <ul>${preparationHtml || "<li><span>No preparation steps listed</span></li>"}</ul>
        </div>
      </div>
    </div>
  </div>

  ${isThreePart ? `
  <div class="card minds-on">
    <div class="card-head">
      <h2 class="card-title">Minds On</h2>
      <span class="time-pill">${mindsOnTime} minutes</span>
    </div>
    <div class="subtitle">Activating Prior Knowledge</div>
    <p class="body-text">${nl2br(mindsOnContent)}</p>
    ${
      mindsOnDifferentiation
        ? `<div class="callout diff">
             <div class="callout-title">Differentiation</div>
             <p>${nl2br(mindsOnDifferentiation)}</p>
           </div>`
        : ""
    }
  </div>

  <div class="card action">
    <div class="card-head">
      <h2 class="card-title">Action</h2>
      <span class="time-pill">${actionTime} minutes</span>
    </div>
    <div class="subtitle">Exploring &amp; Applying</div>
    <p class="body-text">${nl2br(actionContent)}</p>
    ${
      actionResourcesHtml
        ? `<div class="callout resources">
             <div class="callout-title">Resources Used</div>
             <ul>${actionResourcesHtml}</ul>
           </div>`
        : ""
    }
    ${
      actionDifferentiation
        ? `<div class="callout diff">
             <div class="callout-title">Differentiation</div>
             <p>${nl2br(actionDifferentiation)}</p>
           </div>`
        : ""
    }
  </div>

  <div class="card consolidation">
    <div class="card-head">
      <h2 class="card-title">Consolidation</h2>
      <span class="time-pill">${consolidationTime} minutes</span>
    </div>
    <div class="subtitle">Reflecting &amp; Connecting</div>
    <p class="body-text">${nl2br(consolidationContent)}</p>
    ${
      consolidationAssessment
        ? `<div class="callout assessment">
             <div class="callout-title">Assessment Note</div>
             <p>${nl2br(consolidationAssessment)}</p>
           </div>`
        : ""
    }
  </div>
  ` : templateSectionsHtml}

  <div class="footer">Maple Key • maplekey.ca</div>
  ${PRINT_ON_LOAD_SCRIPT}
</body>
</html>
    `

    if (!openPrintWindow(htmlContent)) {
      alert("Please allow popups to export the lesson plan")
    }
  }

  // ——— Setup form pieces, shared between the guided wizard and the
  // single-page "all options" layout. Both render the same state, so
  // switching modes mid-setup keeps every choice.
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

  // Setup breathes on large screens; the finished lesson stays a readable measure.
  const contentWidthClass = lessonGenerated
    ? "max-w-3xl xl:max-w-4xl" // ~768–896px reading column
    : "max-w-3xl lg:max-w-5xl" // setup grows to ~1024px on lg+

  // Unified setup nav: the Guided/All-options toggle and the stage progress are
  // one decision, so they live in one strip. Guided expands the four stages
  // (highlighting as you advance); All options collapses them to a single page.
  const setupNav = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="inline-flex flex-shrink-0 rounded-lg border-2 border-[#E8D5C4] p-0.5 bg-white" role="group" aria-label="Setup layout">
        {([["wizard", "Guided"], ["full", "All options"]] as const).map(([mode, label]) => {
          const selected = setupMode === mode
          return (
            <button
              key={mode}
              type="button"
              onClick={() => handleSetupModeChange(mode)}
              aria-pressed={selected}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                selected ? "bg-[#FF6B35] text-white shadow-sm" : "text-[#888] hover:text-[#FF6B35]"
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {isWizard ? (
        <nav aria-label="Setup steps" className="flex flex-wrap items-center gap-1.5">
          {WIZARD_STEPS.map((s, i) => {
            const done = i < wizardStep
            const current = i === wizardStep
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => done && goToWizardStep(i)}
                disabled={!done}
                aria-current={current ? "step" : undefined}
                aria-label={`Step ${i + 1}: ${s.label}`}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  current
                    ? "bg-[#FF6B35]/10 text-[#FF6B35] ring-1 ring-inset ring-[#FF6B35]/30"
                    : done
                    ? "text-[#8B4513] hover:bg-[#FFF5ED] cursor-pointer"
                    : "text-[#C8B8AA]"
                }`}
              >
                {done ? (
                  <Check size={11} strokeWidth={3} aria-hidden />
                ) : (
                  <span className="tabular-nums">{i + 1}</span>
                )}
                {s.label}
              </button>
            )
          })}
        </nav>
      ) : (
        <span className="text-xs font-medium text-[#A8998E]">Everything on one page</span>
      )}
    </div>
  )

  const reviewRows: { label: string; value: string; step: number }[] = [
    {
      label: "Class",
      value:
        [
          globalFilters.state.grade && `Grade ${globalFilters.state.grade}`,
          globalFilters.state.subject,
          globalFilters.state.province,
          filters.topic && `“${filters.topic}”`,
        ]
          .filter(Boolean)
          .join(" · ") || "Not set",
      step: 0,
    },
    {
      label: "Resources",
      value:
        bookmarkedResources.length > 0
          ? bookmarkedResources.map((r) => r.topic_title).join(", ")
          : "None selected",
      step: 1,
    },
    { label: "Lesson length", value: `${lessonMinutes} minutes`, step: 2 },
    { label: "Template", value: templateDef.displayName, step: 2 },
    { label: "No-Tech Mode", value: noTechMode ? "On — nothing for students to operate" : "Off", step: 2 },
    {
      label: "Classroom materials",
      value: materialsSnapshot.total > 0 ? `${materialsSnapshot.total} selected` : "None selected",
      step: 3,
    },
    { label: "Student handouts", value: reproducibleLanguage === "French" ? "Français" : "English", step: 3 },
    { label: "Additional notes", value: teacherNotes.trim() || "None", step: 3 },
  ]

  const wizardReviewCard = (
    <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList size={18} className="text-[#8B4513]" />
        <h3 className="text-lg font-semibold text-[#2C2C2C]">Your lesson setup</h3>
      </div>
      <dl className="divide-y divide-[#F0E4D6]">
        {reviewRows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 py-2.5">
            <div className="min-w-0">
              <dt className="text-xs font-semibold text-[#8B4513] uppercase tracking-wide">{row.label}</dt>
              <dd className="text-sm text-[#444] mt-0.5 break-words">{row.value}</dd>
            </div>
            <button
              type="button"
              onClick={() => goToWizardStep(row.step)}
              className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-[#888] hover:text-[#FF6B35] transition-colors mt-0.5"
              aria-label={`Edit ${row.label}`}
            >
              <Pencil size={12} />
              Edit
            </button>
          </div>
        ))}
      </dl>
      {bookmarkedResources.length === 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            No resources are selected yet — you can still generate, but the plan won't build on curated resources.{" "}
            <button
              type="button"
              onClick={() => goToWizardStep(1)}
              className="font-semibold underline hover:text-amber-900"
            >
              Pick resources
            </button>
          </p>
        </div>
      )}
    </div>
  )

  const generateErrorPanel = generateError && (
    <div className={`rounded-lg px-4 py-3 border ${generateError === "API_BALANCE_LOW" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${generateError === "API_BALANCE_LOW" ? "text-amber-500" : "text-red-500"}`} />
        <p className={`text-sm ${generateError === "API_BALANCE_LOW" ? "text-amber-800" : "text-red-700"}`}>
          {generateError === "API_BALANCE_LOW"
            ? "The AI service is temporarily unavailable while we top up our API credits. Please try again shortly — we're working on it!"
            : generateError}
        </p>
      </div>
      {generateError === "API_BALANCE_LOW" && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportRequestJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              <Download size={13} />
              Download request JSON
            </button>
            <button
              onClick={handleCopyRequestJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              {copiedState === "request" ? <Check size={13} /> : <Copy size={13} />}
              {copiedState === "request" ? "Copied!" : "Copy request JSON"}
            </button>
            <button
              onClick={handleCopyFullPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              {copiedState === "prompt" ? <Check size={13} /> : <Copy size={13} />}
              {copiedState === "prompt" ? "Copied!" : "Copy prompt for LLM"}
            </button>
            <button
              onClick={() => { setShowPastePanel((v) => !v); setPasteError(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              <ClipboardList size={13} />
              Paste response JSON
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors border border-amber-300"
            >
              <Upload size={13} />
              Import file
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportResponseJSON}
              className="hidden"
            />
          </div>
          {showPastePanel && (
            <div className="space-y-2">
              <textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setPasteError(null) }}
                rows={6}
                placeholder={'Paste the JSON response from the LLM here, e.g.:\n{\n  "title": "...",\n  "mindsOnContent": "...",\n  ...\n}'}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-xs font-mono text-[#444] focus:outline-none focus:border-amber-500 transition-colors resize-none"
              />
              {pasteError && (
                <p className="text-xs text-red-600">{pasteError}</p>
              )}
              <button
                onClick={handlePasteLoad}
                disabled={!pasteText.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                Load lesson
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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
              <>{/* lesson view below */}
                {/* SUCCESS BANNER */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                  <CheckCircle size={24} className="text-emerald-600 flex-shrink-0" />
                  <span className="text-emerald-800 font-medium">Lesson plan generated successfully!</span>
                </div>

                {/* LESSON HEADER */}
                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-[#2C2C2C]">
                        {lessonTitle}
                      </h3>
                      <p className="text-sm text-[#666] mt-1">
                        {resources[0]?.grade_level?.[0] ? `Grade ${resources[0].grade_level[0]}` : ""}
                        {resources[0]?.grade_level?.[0] && " • "}
                        {lessonLength} • {lessonTemplate.split(" (")[0]}
                      </p>
                      {coveredCodes.length > 0 && (
                        <p className="text-xs text-[#888] mt-1">
                          Curriculum: {coveredCodes.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={handleExportPDF}
                        disabled={!allStagesApproved}
                        title={allStagesApproved ? undefined : "Approve every lesson stage before exporting"}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
                      >
                        <Download size={16} />
                        Export PDF
                      </button>
                      <button
                        onClick={handleExportResponseJSON}
                        disabled={!allStagesApproved}
                        title={allStagesApproved ? "Save the full lesson JSON (including quiz questions) so you can reload it later without using API credits" : "Approve every lesson stage before saving"}
                        className="px-4 py-2 border-2 border-[#E8D5C4] hover:bg-[#FAF3E0] text-[#8B4513] text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      >
                        <Download size={16} />
                        Save JSON
                      </button>
                      {bookmarkedResources.length > 0 && (
                        <button
                          onClick={handleRegenerate}
                          className="px-4 py-2 border-2 border-[#E8D5C4] hover:bg-[#FAF3E0] text-[#8B4513] text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <RefreshCw size={16} />
                          Regenerate
                        </button>
                      )}
                      {unapprovedCount > 0 && (
                        <p className="basis-full text-right text-xs font-medium text-amber-700">
                          {unapprovedCount === 1
                            ? "1 stage still needs review before export"
                            : `${unapprovedCount} stages still need review before export`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* LEARNING GOAL & SUCCESS CRITERIA */}
                {(learningGoal || successCriteria.length > 0) && (
                  <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                    {learningGoal && (
                      <div className={successCriteria.length > 0 ? "mb-4" : ""}>
                        <p className="text-xs font-semibold text-[#8B4513] uppercase tracking-wide mb-1">Learning Goal</p>
                        <p className="text-sm text-[#2C2C2C] leading-relaxed">{learningGoal}</p>
                      </div>
                    )}
                    {successCriteria.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[#8B4513] uppercase tracking-wide mb-2">Success Criteria</p>
                        <ul className="space-y-1.5">
                          {successCriteria.map((sc, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-[#444]">
                              <CheckCircle size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                              <span>{sc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* EXCLUDED RESOURCES NOTICE */}
                {excludedResources.length > 0 && (
                  <div className="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-stone-600 mb-2">Resources not used in this lesson</p>
                    <ul className="space-y-1">
                      {excludedResources.map((ex, i) => (
                        <li key={i} className="text-xs text-stone-600">
                          <span className="font-medium">{ex.title}:</span> {ex.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* MATERIALS & PREPARATION SECTION - Moved above Minds On */}
                <div className="bg-white rounded-xl border-l-4 border-stone-400 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <ClipboardList size={20} className="text-stone-600" />
                        <h4 className="text-lg font-semibold text-[#2C2C2C]">Materials & Preparation</h4>
                      </div>
                      <button
                        onClick={() => setEditingSection(editingSection === "materials" ? null : "materials")}
                        className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
                        aria-label="Edit Materials section"
                      >
                        <Pencil size={16} className="text-stone-600" />
                      </button>
                    </div>

                    {editingSection === "materials" ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-stone-600 mb-2">
                            Resources (auto-generated from bookmarks)
                          </p>
                          <p className="text-sm text-[#444] bg-stone-50 p-2 rounded-lg">
                            {(materialsResources.length > 0 ? materialsResources : resources.map((r) => r.topic_title)).join(", ")}
                          </p>
                        </div>
                        {classroomMaterialsUsed.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-stone-600 mb-2">
                              Classroom materials used
                            </p>
                            <p className="text-sm text-[#444] bg-stone-50 p-2 rounded-lg">
                              {classroomMaterialsUsed.join(", ")}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-stone-600 mb-2">
                            Preparation steps (one per line)
                          </p>
                          <textarea
                            value={materialsPreparation.join("\n")}
                            onChange={(e) => setMaterialsPreparation(e.target.value.split("\n"))}
                            rows={6}
                            className="w-full px-3 py-2 border-2 border-stone-300 rounded-lg bg-white text-sm focus:outline-none focus:border-stone-500 transition-colors resize-none"
                          />
                        </div>
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-3 py-1.5 bg-stone-500 hover:bg-stone-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Done Editing
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        {/* Left box - Resources + classroom materials (1/4 width) */}
                        <div className="w-1/4 bg-stone-50 border border-stone-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-stone-700 mb-2">Materials</p>
                          <ul className="text-xs text-[#444] space-y-1.5">
                            {(materialsResources.length > 0 ? materialsResources.map((t) => ({ topic_title: t })) : resources).map((r, index) => (
                              <li key={index} className="flex items-start gap-1.5">
                                <span className="text-stone-400 flex-shrink-0">•</span>
                                <span>{r.topic_title}</span>
                              </li>
                            ))}
                          </ul>
                          {classroomMaterialsUsed.length > 0 && (
                            <>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 mt-3 mb-1.5">
                                From your classroom
                              </p>
                              <ul className="text-xs text-[#444] space-y-1.5">
                                {classroomMaterialsUsed.map((m, index) => (
                                  <li key={index} className="flex items-start gap-1.5">
                                    <span className="text-emerald-500 flex-shrink-0">▪</span>
                                    <span>{m}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>

                        {/* Right box - Preparation steps (3/4 width) */}
                        <div className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-stone-700 mb-2">Preparation</p>
                          <ul className="text-sm text-[#444] space-y-2">
                            {(materialsPreparation.length > 0
                              ? materialsPreparation
                              : materialsContent.split("\n").filter(Boolean)
                            ).map((item, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-stone-400 flex-shrink-0">{index + 1}.</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CLASSROOM ARTIFACTS - triage what the teacher will bring/build */}
                {artifacts.length > 0 && (
                  <ArtifactsSection
                    artifacts={artifacts}
                    onStatusChange={handleArtifactStatusChange}
                    onOpenOrganizer={(i) => setOrganizerArtifactIndex(i)}
                  />
                )}

                {isThreePart && (<>
                {/* SECTION A - MINDS ON */}
                <div className="bg-white rounded-xl border-l-4 border-blue-500 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Lightbulb size={20} className="text-blue-600" />
                        <h4 className="text-lg font-semibold text-[#2C2C2C]">Minds On</h4>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {mindsOnTime} minutes
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-3">
                      Activating Prior Knowledge
                    </p>

                    {editingSection === "mindsOn" ? (
                      <div className="space-y-3">
                        <textarea
                          value={mindsOnContent}
                          onChange={(e) => setMindsOnContent(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                        />
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-amber-800 mb-2">Differentiation</p>
                          <textarea
                            value={mindsOnDifferentiation}
                            onChange={(e) => setMindsOnDifferentiation(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-xs focus:outline-none focus:border-amber-500 transition-colors resize-none"
                          />
                        </div>
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Done Editing
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-[#444] leading-relaxed">{mindsOnContent}</p>
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-amber-800 mb-1">Differentiation</p>
                          <p className="text-xs text-amber-700">{mindsOnDifferentiation}</p>
                        </div>
                      </>
                    )}
                    {editingSection !== "mindsOn" && (
                      <StageReviewFooter
                        approved={!!approvedSections["mindsOn"]}
                        onApprove={() => approveStage("mindsOn")}
                        onEdit={() => editStage("mindsOn")}
                      />
                    )}
                  </div>
                </div>

                {/* SECTION B - ACTION */}
                <div className="bg-white rounded-xl border-l-4 border-emerald-500 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Target size={20} className="text-emerald-600" />
                        <h4 className="text-lg font-semibold text-[#2C2C2C]">Action</h4>
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                          {actionTime} minutes
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-3">
                      Exploring & Applying
                    </p>

                    {editingSection === "action" ? (
                      <div className="space-y-3">
                        <textarea
                          value={actionContent}
                          onChange={(e) => setActionContent(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border-2 border-emerald-300 rounded-lg bg-white text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                        />
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-stone-700 mb-2">Resources Used</p>
                          <div className="space-y-1">
                            {resources.slice(0, 3).map((resource) => (
                              <a
                                key={resource.url}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline block truncate"
                              >
                                • {resource.topic_title}
                              </a>
                            ))}
                          </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-amber-800 mb-2">Differentiation</p>
                          <textarea
                            value={actionDifferentiation}
                            onChange={(e) => setActionDifferentiation(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-xs focus:outline-none focus:border-amber-500 transition-colors resize-none"
                          />
                        </div>
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Done Editing
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-[#444] leading-relaxed">{actionContent}</p>
                        <div className="mt-4 bg-stone-50 border border-stone-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-stone-700 mb-2">Resources Used</p>
                          <div className="space-y-1">
                            {resources.slice(0, 3).map((resource) => (
                              <a
                                key={resource.url}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline block truncate"
                              >
                                • {resource.topic_title}
                              </a>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-amber-800 mb-1">Differentiation</p>
                          <p className="text-xs text-amber-700">{actionDifferentiation}</p>
                        </div>
                      </>
                    )}
                    {editingSection !== "action" && (
                      <StageReviewFooter
                        approved={!!approvedSections["action"]}
                        onApprove={() => approveStage("action")}
                        onEdit={() => editStage("action")}
                      />
                    )}
                  </div>
                </div>

                {/* SECTION C - CONSOLIDATION */}
                <div className="bg-white rounded-xl border-l-4 border-violet-500 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <MessageCircle size={20} className="text-violet-600" />
                        <h4 className="text-lg font-semibold text-[#2C2C2C]">Consolidation</h4>
                        <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-medium">
                          {consolidationTime} minutes
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-violet-600 font-medium uppercase tracking-wide mb-3">
                      Reflecting & Connecting
                    </p>

                    {editingSection === "consolidation" ? (
                      <div className="space-y-3">
                        <textarea
                          value={consolidationContent}
                          onChange={(e) => setConsolidationContent(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border-2 border-violet-300 rounded-lg bg-white text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
                        />
                        <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-violet-800 mb-2">Assessment Note</p>
                          <textarea
                            value={consolidationAssessment}
                            onChange={(e) => setConsolidationAssessment(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-violet-300 rounded-lg bg-white text-xs focus:outline-none focus:border-violet-500 transition-colors resize-none"
                          />
                        </div>
                        <button
                          onClick={() => setEditingSection(null)}
                          className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Done Editing
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-[#444] leading-relaxed">{consolidationContent}</p>
                        <div className="mt-4 bg-violet-50 border border-violet-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-violet-800 mb-1">Assessment Note</p>
                          <p className="text-xs text-violet-700">{consolidationAssessment}</p>
                        </div>
                      </>
                    )}
                    {editingSection !== "consolidation" && (
                      <StageReviewFooter
                        approved={!!approvedSections["consolidation"]}
                        onApprove={() => approveStage("consolidation")}
                        onEdit={() => editStage("consolidation")}
                      />
                    )}
                  </div>
                </div>
                </>)}

                {/* TEMPLATE SECTIONS (non-3-Part templates) */}
                {!isThreePart && templateSections.map((section) => {
                  const sectionDef = templateDef.sections.find((s) => s.id === section.id)
                  if (!sectionDef) return null
                  const sectionTime = Math.round(lessonMinutes * sectionDef.timeWeight)
                  const editKey = `section-${section.id}`
                  return (
                    <div key={section.id} className={`bg-white rounded-xl border-l-4 ${sectionDef.colors.border} shadow-sm overflow-hidden`}>
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className={`text-lg font-semibold text-[#2C2C2C]`}>{section.label}</h4>
                            <span className={`text-xs ${sectionDef.colors.pillBg} ${sectionDef.colors.pillText} px-2 py-1 rounded-full font-medium`}>
                              {sectionTime} minutes
                            </span>
                          </div>
                        </div>
                        <p className={`text-xs ${sectionDef.colors.accent} font-medium uppercase tracking-wide mb-3`}>
                          {section.subtitle}
                        </p>

                        {editingSection === editKey ? (
                          <div className="space-y-3">
                            <textarea
                              value={section.content}
                              onChange={(e) => setTemplateSections((prev) =>
                                prev.map((s) => s.id === section.id ? { ...s, content: e.target.value } : s)
                              )}
                              rows={5}
                              className={`w-full px-3 py-2 border-2 border-[#E8D5C4] rounded-lg bg-white text-sm focus:outline-none ${sectionDef.colors.focusBorder} transition-colors resize-none`}
                            />
                            <div className={`${sectionDef.calloutIsAssessment ? "bg-violet-50 border border-violet-200" : "bg-amber-50 border border-amber-200"} rounded-lg p-3`}>
                              <p className={`text-xs font-medium ${sectionDef.calloutIsAssessment ? "text-violet-800" : "text-amber-800"} mb-2`}>
                                {sectionDef.calloutLabel}
                              </p>
                              <textarea
                                value={section.callout ?? ""}
                                onChange={(e) => setTemplateSections((prev) =>
                                  prev.map((s) => s.id === section.id ? { ...s, callout: e.target.value } : s)
                                )}
                                rows={2}
                                className={`w-full px-3 py-2 border ${sectionDef.calloutIsAssessment ? "border-violet-300" : "border-amber-300"} rounded-lg bg-white text-xs focus:outline-none transition-colors resize-none`}
                              />
                            </div>
                            <button
                              onClick={() => setEditingSection(null)}
                              className={`px-3 py-1.5 ${sectionDef.colors.doneBg} ${sectionDef.colors.doneHover} text-white text-xs font-medium rounded-lg transition-colors`}
                            >
                              Done Editing
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm text-[#444] leading-relaxed">{section.content}</p>
                            {section.callout && (
                              <div className={`mt-4 ${sectionDef.calloutIsAssessment ? "bg-violet-50 border border-violet-200" : "bg-amber-50 border border-amber-200"} rounded-lg p-3`}>
                                <p className={`text-xs font-medium ${sectionDef.calloutIsAssessment ? "text-violet-800" : "text-amber-800"} mb-1`}>
                                  {sectionDef.calloutLabel}
                                </p>
                                <p className={`text-xs ${sectionDef.calloutIsAssessment ? "text-violet-700" : "text-amber-700"}`}>
                                  {section.callout}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                        {editingSection !== editKey && (
                          <StageReviewFooter
                            approved={!!approvedSections[editKey]}
                            onApprove={() => approveStage(editKey)}
                            onEdit={() => editStage(editKey)}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-6 text-center">
                  <MessageSquareText size={32} className="text-[#A8998E] mx-auto mb-3" />
                  <p className="text-[#666] mb-4">Did you like this lesson? Do you have feedback?</p>
                  <button
                    onClick={() => setShowFeedbackDialog(true)}
                    className="px-6 py-2.5 bg-[#FF6B35] hover:bg-[#e55a2a] text-white font-semibold rounded-xl transition-colors"
                  >
                    Submit Feedback
                  </button>
                </div>

                {/* Assessment CTA */}
                {latestLesson && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-amber-900">Check student understanding</p>
                      {coveredCodes.length > 0 && (
                        <p className="text-sm text-amber-700 mt-0.5">
                          Quick formative check on {coveredCodes.join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowAssessment(true)}
                      className="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Start Assessment
                    </button>
                  </div>
                )}

                {/* Spacer for bottom */}
                <div className="h-6" />
              </>
            ) : showQuestionsStep ? (
              <>
                {/* PLANNING QUESTIONS STEP — one question at a time */}
                {(() => {
                  const q = planningQuestions[currentQuestionIndex]
                  if (!q) return null
                  const isLastQuestion = currentQuestionIndex === planningQuestions.length - 1
                  const selections = questionSelections[q.id] ?? []
                  const openText = openResponseValues[q.id] ?? ""
                  const isOpenActive = showingOpenResponse[q.id] ?? false
                  const hasAnswer = selections.length > 0 || (isOpenActive && openText.trim().length > 0)
                  const opts = q.answerFormat === "this-that-both" ? [...q.options, "Both"] : q.options

                  const handleSelect = (opt: string) => {
                    setQuestionSelections((prev) => ({ ...prev, [q.id]: [opt] }))
                    setShowingOpenResponse((prev) => ({ ...prev, [q.id]: false }))
                    setTimeout(() => advanceQuestion(q.id, [opt]), 250)
                  }

                  const handleMultiToggle = (opt: string) => {
                    const cur = questionSelections[q.id] ?? []
                    setShowingOpenResponse((prev) => ({ ...prev, [q.id]: false }))
                    setQuestionSelections((prev) => ({
                      ...prev,
                      [q.id]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt],
                    }))
                  }

                  return (
                    <>
                      {/* Progress indicator */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {currentQuestionIndex > 0 && (
                            <button
                              onClick={() => setCurrentQuestionIndex((i) => i - 1)}
                              className="text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors"
                            >
                              ← Back
                            </button>
                          )}
                          <p className="text-sm font-medium text-violet-700">
                            Question {currentQuestionIndex + 1} of {planningQuestions.length}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          {planningQuestions.map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 w-6 rounded-full transition-colors ${
                                i < currentQuestionIndex
                                  ? "bg-violet-400"
                                  : i === currentQuestionIndex
                                  ? "bg-violet-600"
                                  : "bg-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Question card */}
                      <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                        <p className="font-medium text-[#2C2C2C] mb-1">{q.prompt}</p>
                        <p className="text-xs text-[#888] mb-4">{q.rationale}</p>

                        <div className="flex flex-col gap-2">
                          {opts.map((opt, i) => {
                            const isSelected =
                              q.answerFormat === "multi-select" ? selections.includes(opt) : selections[0] === opt
                            const isRecommended = i === 0

                            return (
                              <button
                                key={opt}
                                onClick={() =>
                                  q.answerFormat === "multi-select" ? handleMultiToggle(opt) : handleSelect(opt)
                                }
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm border-2 transition-colors flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? "bg-violet-600 border-violet-600 text-white"
                                    : "bg-white border-[#E8D5C4] text-[#2C2C2C] hover:border-violet-400"
                                }`}
                              >
                                <span>{opt}</span>
                                {isRecommended && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                      isSelected ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"
                                    }`}
                                  >
                                    Recommended
                                  </span>
                                )}
                              </button>
                            )
                          })}

                          {/* Open response option */}
                          {isOpenActive ? (
                            <div className="border-2 border-violet-400 rounded-lg p-3 bg-violet-50">
                              <p className="text-xs font-medium text-violet-700 mb-2">Your answer:</p>
                              <input
                                autoFocus
                                type="text"
                                value={openText}
                                onChange={(e) =>
                                  setOpenResponseValues((prev) => ({ ...prev, [q.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && openText.trim()) advanceQuestion(q.id)
                                }}
                                placeholder="Type your own answer..."
                                className="w-full px-3 py-2 border border-violet-300 rounded-lg bg-white text-sm focus:outline-none focus:border-violet-500"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setQuestionSelections((prev) => ({ ...prev, [q.id]: [] }))
                                setShowingOpenResponse((prev) => ({ ...prev, [q.id]: true }))
                              }}
                              className="w-full text-left px-4 py-3 rounded-lg text-sm border-2 border-dashed border-[#E8D5C4] text-[#888] hover:border-violet-400 hover:text-violet-600 transition-colors"
                            >
                              Other (write your own)…
                            </button>
                          )}

                          {/* Continue / Generate button for multi-select and open response */}
                          {(q.answerFormat === "multi-select" || isOpenActive) && hasAnswer && (
                            <button
                              onClick={() => advanceQuestion(q.id)}
                              className="mt-2 w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                            >
                              {isLastQuestion ? "Generate Lesson Plan" : "Continue →"}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )
                })()}
                <div className="h-6" />
              </>
            ) : (
              <>
                {setupNav}

                {/* Step 1 — class context (province / grade / subject / topic). Sets
                    the authoritative filters that scope the Recommended box below and
                    are threaded into lesson generation, instead of guessing from the
                    first bookmarked resource. */}
                {(!isWizard || wizardStep === 0) && (
                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap size={16} className="text-[#8B4513]" />
                    <h3 className="text-lg font-semibold text-[#2C2C2C]">What are you teaching?</h3>
                  </div>
                  <p className="text-sm text-[#666] mb-4">
                    This scopes your recommendations and tailors the generated lesson. Topic is optional —
                    it nudges the best matches to the top without hiding anything.
                  </p>
                  <PlanContextBar filters={classContextFilters} setFilters={handleClassContextChange} />
                </div>
                )}

                {/* Step 2 — resources (all cards visible at once in all-options mode) */}
                {(!isWizard || wizardStep === 1) && (<>
                {/* Unified resource picker: search / recommended / add-my-own + tray */}
                <PlanResourcePicker
                  filters={{
                    ...filters,
                    province: globalFilters.state.province,
                    grade: globalFilters.state.grade,
                    subject: globalFilters.state.subject,
                    strand: globalFilters.state.strand,
                  }}
                  sidebarFilters={sidebarFilters}
                  bookmarkedResources={bookmarkedResources}
                  userMaterials={userMaterials}
                  onUserMaterialsChange={setUserMaterials}
                  onBrowseAll={onBack}
                  fillHeight={isWizard}
                />

                {/* Student Progress Data Section — temporarily hidden; will be re-enabled later */}
                {false && (
                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={20} className="text-[#8B4513]" />
                    <h3 className="font-semibold text-[#2C2C2C]">Student Progress Data</h3>
                    <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">Optional</span>
                  </div>

                  <label className={`flex items-start gap-3 ${hasClassProgress ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
                    <input
                      type="checkbox"
                      checked={includeAssessmentData}
                      disabled={!hasClassProgress}
                      onChange={(e) => setIncludeAssessmentData(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-stone-300 text-orange-500 focus:ring-orange-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-[#2C2C2C]">Include recent assessment data</span>
                      <p className="text-xs text-[#666] mt-0.5">
                        {hasClassProgress
                          ? `Found ${Object.values(classProgress).reduce((sum, c) => sum + c.level1 + c.level2 + c.level3 + c.level4, 0)} responses across ${Object.keys(classProgress).length} of these expectations — used to target differentiation.`
                          : "No prior quick check responses for these expectations yet."}
                      </p>
                    </div>
                  </label>

                  {includeAssessmentData && hasClassProgress && (
                    <div className="mt-4 bg-stone-50 rounded-lg p-4 border border-stone-200 space-y-3">
                      {Object.entries(classProgress)
                        .filter(([, c]) => c.level1 + c.level2 + c.level3 + c.level4 > 0)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([code, counts]) => {
                          const t = counts.level1 + counts.level2 + counts.level3 + counts.level4
                          return (
                            <div key={code}>
                              <div className="flex items-start gap-2 mb-1.5">
                                <span className="flex-shrink-0 rounded-full bg-white border border-stone-200 px-1.5 py-0.5 text-[11px] font-bold text-stone-700">
                                  {code}
                                </span>
                                <span className="text-xs leading-snug text-[#666]">
                                  {describeCode(bookmarkedResources[0]?.subject ?? "", code, bookmarkedResources[0]?.grade_level?.[0]?.toString()) ?? code}
                                </span>
                              </div>
                              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                                {LEVEL_ORDER.map((level) => {
                                  const v = counts[level]
                                  if (v === 0) return null
                                  return <div key={level} className={LEVEL_META[level].barClass} style={{ width: `${(v / t) * 100}%` }} />
                                })}
                              </div>
                              <p className="mt-1 text-[11px] leading-relaxed">
                                {LEVEL_ORDER.filter((level) => counts[level] > 0).map((level, i, arr) => (
                                  <span key={level}>
                                    <span className={`font-semibold ${LEVEL_META[level].textClass}`}>{counts[level]}</span>
                                    <span className="text-[#888]"> {LEVEL_META[level].phrase}</span>
                                    {i < arr.length - 1 && <span className="text-[#C8B8AA]"> · </span>}
                                  </span>
                                ))}
                              </p>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </div>
                )}

                </>)}

                {/* Step 3 — lesson format */}
                {(!isWizard || wizardStep === 2) && (
                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Layout size={16} className="text-[#8B4513]" />
                    <h3 className="text-lg font-semibold text-[#2C2C2C]">Lesson Configuration</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Lesson Length */}
                    <div>
                      <label className="flex items-center justify-between gap-2 text-sm font-medium text-[#2C2C2C] mb-2">
                        <span className="flex items-center gap-2">
                          <Clock size={16} className="text-[#8B4513]" />
                          Lesson Length
                        </span>
                        <span className="text-sm font-semibold text-[#FF6B35]">{lessonMinutes} minutes</span>
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={120}
                        step={5}
                        value={lessonMinutes}
                        onChange={(e) => setLessonLength(`${e.target.value} minutes`)}
                        className="w-full accent-[#FF6B35]"
                        aria-label="Lesson length in minutes"
                      />
                      <div className="flex justify-between text-xs text-[#8B4513]/60 mt-1">
                        <span>10 min</span>
                        <span>120 min</span>
                      </div>
                    </div>

                    {/* Lesson Template Card Picker */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[#2C2C2C] mb-3">
                        <Layout size={16} className="text-[#8B4513]" />
                        Lesson Template
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {LESSON_TEMPLATES.map((tmpl) => {
                          const isSelected = resolveTemplateId(lessonTemplate) === tmpl.id
                          return (
                            <button
                              key={tmpl.id}
                              onClick={() => setLessonTemplate(tmpl.apiKey)}
                              className={`relative text-left p-3.5 rounded-xl border-2 transition-all ${
                                isSelected
                                  ? "border-[#FF6B35] bg-[#FFF6EC]"
                                  : "border-[#E8D5C4] bg-white hover:border-[#FF6B35]/50 hover:bg-[#FFFAF5]"
                              }`}
                            >
                              {isSelected && (
                                <div className="absolute top-2.5 right-2.5">
                                  <CheckCircle size={14} className="text-[#FF6B35]" />
                                </div>
                              )}
                              <div className="flex items-baseline gap-2 mb-1 pr-5">
                                <p className="font-semibold text-[#2C2C2C] text-sm">{tmpl.displayName}</p>
                                {tmpl.displayName !== tmpl.name && (
                                  <span className="text-[10px] text-[#aaa] font-medium">{tmpl.name}</span>
                                )}
                              </div>
                              <p className="text-xs text-[#888] leading-snug mb-2.5">{tmpl.description}</p>
                              <div className="flex flex-wrap gap-1">
                                {tmpl.sections.map((s) => (
                                  <span
                                    key={s.id}
                                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.colors.pillBg} ${s.colors.pillText}`}
                                  >
                                    {s.label}
                                  </span>
                                ))}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* No-Tech Mode */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={noTechMode}
                        onChange={(e) => handleNoTechModeChange(e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded-lg border-2 border-[#E8D5C4] cursor-pointer accent-[#FF6B35]"
                      />
                      <div className="flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium text-[#2C2C2C]">
                          <MonitorOff size={16} className="text-[#8B4513]" />
                          No-Tech Mode
                        </span>
                        <p className="text-xs text-[#888] mt-0.5">
                          Keep students completely off screens. Planning and a projector for whole-class display are still fine — nothing for students to hold or operate themselves.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
                )}

                {/* Step 4 — personalize */}
                {(!isWizard || wizardStep === 3) && (<>
                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <School size={18} className="text-[#8B4513]" />
                      <h3 className="text-sm font-semibold text-[#2C2C2C]">Your Classroom Materials</h3>
                      {materialsSnapshot.total > 0 && (
                        <span className="rounded-full bg-[#FF6B35] px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {materialsSnapshot.total}
                        </span>
                      )}
                    </div>
                  </div>
                  <MaterialsSummary
                    snapshot={materialsSnapshot}
                    onEdit={() => setIsMaterialsEditorOpen(true)}
                  />
                  <p className="text-xs text-[#888] mt-3">
                    Hover a row to see what's selected. Editing here doesn't reset your planning progress.
                  </p>
                </div>

                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-[#8B4513]" />
                      <h3 className="text-lg font-semibold text-[#2C2C2C]">Additional Notes</h3>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optional</span>
                    </div>

                    {/* Language for student reproducibles (artifacts + printable organizer) */}
                    <div className="flex items-center gap-1.5">
                      <Languages size={15} className="text-[#8B4513]" />
                      <span className="text-xs font-medium text-[#888] mr-1 hidden sm:inline">
                        Student handouts
                      </span>
                      <div className="inline-flex rounded-lg border-2 border-[#E8D5C4] p-0.5 bg-white">
                        {(["English", "French"] as const).map((lang) => {
                          const selected = reproducibleLanguage === lang
                          const label = lang === "French" ? "Français" : "English"
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() => handleLanguageChange(lang)}
                              aria-pressed={selected}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                                selected
                                  ? "bg-[#FF6B35] text-white shadow-sm"
                                  : "text-[#888] hover:text-[#FF6B35]"
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  <textarea
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    rows={4}
                    placeholder="Add any notes about your planning preferences, classroom environment, specific student needs, themes you'd like to emphasize..."
                    className="w-full px-3 py-2 border-2 border-[#E8D5C4] rounded-lg bg-white text-sm focus:outline-none focus:border-[#FF6B35] transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Example: "My class loves competition and games. Marcus and James could lead small groups."
                    {" "}The <strong>Student handouts</strong> toggle only translates the printable activity sheets — your lesson plan stays in English.
                  </p>
                </div>
                </>)}

                {/* Step 5 — review (wizard only; the all-options page doesn't need it) */}
                {isWizard && wizardStep === 4 && wizardReviewCard}

                {/* Spacer for bottom */}
                <div className="h-6" />
              </>
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
