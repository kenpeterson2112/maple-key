"use client"

import { useState, useRef } from "react"
import {
  ArrowLeft,
  Sparkles,
  X,
  Info,
  Users,
  BookOpen,
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
} from "lucide-react"
import type { Resource } from "@/lib/types"
import { withBasePath } from "@/lib/base-path"
import { logLesson, getLatestLesson } from "@/lib/lesson-metadata"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import AssessmentModal from "@/components/assessment-modal"
import { getClassroomResources, getClassroomResourceLabels } from "@/lib/classroom-resources"

interface LessonPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  bookmarkedResources: Resource[]
  asSpace?: boolean
}

export default function LessonPlannerModal({ isOpen, onClose, onBack, bookmarkedResources, asSpace = false }: LessonPlannerModalProps) {
  const [includeAssessmentData, setIncludeAssessmentData] = useState(false)
  const [lessonLength, setLessonLength] = useState("60 minutes")
  const [lessonTemplate, setLessonTemplate] = useState("3-Part Lesson (Minds On, Action, Consolidation)")
  const [teacherNotes, setTeacherNotes] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [lessonGenerated, setLessonGenerated] = useState(false)

  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [lessonTitle, setLessonTitle] = useState("")
  const [coveredCodes, setCoveredCodes] = useState<string[]>([])
  const [mindsOnContent, setMindsOnContent] = useState("")
  const [mindsOnDifferentiation, setMindsOnDifferentiation] = useState("")
  const [actionContent, setActionContent] = useState("")
  const [actionDifferentiation, setActionDifferentiation] = useState("")
  const [consolidationContent, setConsolidationContent] = useState("")
  const [consolidationAssessment, setConsolidationAssessment] = useState("")
  const [materialsContent, setMaterialsContent] = useState("")
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [showAssessment, setShowAssessment] = useState(false)
  const [latestLesson, setLatestLesson] = useState<LessonMetadata | null>(null)

  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false)
  const [copiedState, setCopiedState] = useState<"request" | "prompt" | null>(null)
  const [showPastePanel, setShowPastePanel] = useState(false)
  const [pasteText, setPasteText] = useState("")
  const [pasteError, setPasteError] = useState<string | null>(null)

  const importInputRef = useRef<HTMLInputElement>(null)

  const classroomResourceIds = getClassroomResources()
  const classroomResourceLabels = getClassroomResourceLabels(classroomResourceIds)

  if (!isOpen) return null

  const uniqueStrands = new Set(bookmarkedResources.flatMap((r) => r.strand || []))
  const showWarning = bookmarkedResources.length > 5 || uniqueStrands.size > 2

  const callGenerateLesson = async () => {
    setIsGenerating(true)
    setGenerateError(null)
    try {
      const res = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resources: bookmarkedResources.map((r) => ({
            title: (r as any).topic_title,
            description: r.description,
            curriculum_expectations: r.curriculum_expectations ?? [],
            grade: (r as any).grade_level,
            subject: r.subject,
            publisher: (r as any).publisher_creator,
          })),
          lessonLength,
          lessonTemplate,
          teacherNotes,
          includeAssessmentData,
          classroomResources: classroomResourceLabels,
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
      const logged = logLesson({
        title: data.title ?? "",
        grade: String((bookmarkedResources[0] as any)?.grade_level ?? ""),
        subject: bookmarkedResources[0]?.subject ?? "",
        curriculumCodesCovered: data.curriculumCodesCovered ?? [],
        resourceIds: bookmarkedResources.map((r) => r.id),
        lessonContent: {
          mindsOn: (data.mindsOnContent ?? "").slice(0, 600),
          action: (data.actionContent ?? "").slice(0, 600),
          consolidation: (data.consolidationContent ?? "").slice(0, 600),
        },
      })
      setLatestLesson(logged)
      setLessonGenerated(true)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = () => callGenerateLesson()

  const handleRegenerate = () => {
    setLessonGenerated(false)
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
      const logged = logLesson({
        title: data.title ?? "",
        grade: String((bookmarkedResources[0] as any)?.grade_level ?? ""),
        subject: bookmarkedResources[0]?.subject ?? "",
        curriculumCodesCovered: data.curriculumCodesCovered ?? [],
        resourceIds: bookmarkedResources.map((r) => r.id),
        lessonContent: {
          mindsOn: (data.mindsOnContent ?? "").slice(0, 600),
          action: (data.actionContent ?? "").slice(0, 600),
          consolidation: (data.consolidationContent ?? "").slice(0, 600),
        },
      })
      setLatestLesson(logged)
      setLessonGenerated(true)
      setGenerateError(null)
      setShowPastePanel(false)
      setPasteText("")
      setPasteError(null)
    } catch {
      onError("Invalid JSON — check the format and try again.")
    }
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

  const buildRequestPayload = () => ({
    resources: bookmarkedResources.map((r) => ({
      title: (r as any).topic_title,
      description: r.description,
      curriculum_expectations: r.curriculum_expectations ?? [],
      grade: (r as any).grade_level,
      subject: r.subject,
      publisher: (r as any).publisher_creator,
    })),
    lessonLength,
    lessonTemplate,
    teacherNotes,
    includeAssessmentData,
    classroomResources: classroomResourceLabels,
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
      .map(
        (r, i) =>
          `Resource ${i + 1}: "${(r as any).topic_title}"\n  Description: ${r.description}\n  Publisher: ${(r as any).publisher_creator ?? "unknown"}\n  Curriculum codes: ${r.curriculum_expectations?.join(", ") || "not specified"}`,
      )
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

Return a JSON object with exactly these fields (all values are plain text strings, no markdown):
{
  "title": "Creative lesson title",
  "curriculumCodesCovered": ["code1", "code2"],
  "mindsOnContent": "Hook/activation activity description (2-4 sentences)",
  "mindsOnDifferentiation": "Differentiation strategies for Minds On phase",
  "actionContent": "Main learning activity description with any stations or tasks",
  "actionDifferentiation": "Differentiation strategies for Action phase",
  "consolidationContent": "Closing/consolidation activity description",
  "consolidationAssessment": "Assessment notes — which codes may need follow-up and plan for next steps",
  "materialsContent": "Materials list and preparation steps"
}`

    const fullPrompt = `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userPrompt}`
    await navigator.clipboard.writeText(fullPrompt)
    setCopiedState("prompt")
    setTimeout(() => setCopiedState(null), 2000)
  }

  const lessonMinutes = Number.parseInt(lessonLength) || 60
  const mindsOnTime = Math.round(lessonMinutes * 0.17)
  const actionTime = Math.round(lessonMinutes * 0.58)
  const consolidationTime = Math.round(lessonMinutes * 0.25)

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Please allow popups to export the lesson plan")
      return
    }

    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const gradeSubject =
      bookmarkedResources.length > 0
        ? `Grade ${bookmarkedResources[0].grade_level} ${bookmarkedResources[0].subject}`
        : "Grade 6 Math"

    const curriculumCodes =
      coveredCodes.length > 0
        ? coveredCodes.join(", ")
        : bookmarkedResources
            .flatMap((r) => r.curriculum_expectations || [])
            .filter((v, i, a) => a.indexOf(v) === i)
            .slice(0, 3)
            .join(", ") || "N/A"

    const resourcesList = bookmarkedResources.map((r) => `<li>${r.topic_title} - ${r.publisher_creator}</li>`).join("")

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lesson Plan - ${lessonTitle || "Maple Key Lesson"}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #1a1a1a;
      background: white;
      padding: 0.5in;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e5e5;
    }
    
    .logo {
      height: 48px;
    }
    
    .header-right {
      text-align: right;
      font-size: 10pt;
      color: #666;
    }
    
    .lesson-title {
      font-size: 20pt;
      font-weight: bold;
      color: #2c2c2c;
      margin-bottom: 8px;
    }
    
    .meta-info {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
      font-size: 11pt;
    }
    
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .meta-label {
      font-weight: 600;
      color: #444;
    }
    
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 2px solid;
    }
    
    .section-header.minds-on { border-color: #3b82f6; }
    .section-header.action { border-color: #10b981; }
    .section-header.consolidation { border-color: #8b5cf6; }
    .section-header.materials { border-color: #78716c; }
    
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #2c2c2c;
    }
    
    .section-time {
      font-size: 10pt;
      color: #666;
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 12px;
    }
    
    .section-subtitle {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .section-subtitle.minds-on { color: #3b82f6; }
    .section-subtitle.action { color: #10b981; }
    .section-subtitle.consolidation { color: #8b5cf6; }
    
    .section-content {
      font-size: 11pt;
      color: #444;
      white-space: pre-wrap;
    }
    
    .differentiation-box {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      background: #fffbeb;
    }
    
    .differentiation-title {
      font-size: 10pt;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 4px;
    }
    
    .differentiation-content {
      font-size: 10pt;
      color: #78350f;
    }
    
    .assessment-box {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid #8b5cf6;
      border-radius: 8px;
      background: #f5f3ff;
    }
    
    .assessment-title {
      font-size: 10pt;
      font-weight: 600;
      color: #5b21b6;
      margin-bottom: 4px;
    }
    
    .assessment-content {
      font-size: 10pt;
      color: #6b21a8;
    }
    
    .resources-box {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid #d4d4d4;
      border-radius: 8px;
      background: #fafafa;
    }
    
    .resources-title {
      font-size: 10pt;
      font-weight: 600;
      color: #525252;
      margin-bottom: 4px;
    }
    
    .resources-list {
      font-size: 10pt;
      color: #525252;
      padding-left: 16px;
    }
    
    .resources-list li {
      margin-bottom: 4px;
    }
    
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e5e5e5;
      text-align: center;
      font-size: 9pt;
      color: #888;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .header {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${withBasePath("/Maple_Key_Transp_Background.png")}" alt="Maple Key" class="logo" onerror="this.style.display='none'">
    <div class="header-right">
      <div>Generated: ${currentDate}</div>
      <div>Maple Key Lesson Planner</div>
    </div>
  </div>
  
  <h1 class="lesson-title">Data Detectives: Exploring Space Through Numbers</h1>
  
  <div class="meta-info">
    <div class="meta-item">
      <span class="meta-label">Grade/Subject:</span>
      <span>${gradeSubject}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Duration:</span>
      <span>${lessonLength}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Curriculum:</span>
      <span>${curriculumCodes}</span>
    </div>
  </div>
  
  <!-- MATERIALS & PREPARATION SECTION -->
  <div class="section">
    <div class="section-header materials">
      <span class="section-title">Materials & Preparation</span>
    </div>
    <div class="section-content">
      <div class="flex gap-4">
        {/* Left box - Resources (1/4 width) */}
        <div class="w-1/4 bg-stone-50 border border-stone-200 rounded-lg p-3">
          <p class="text-xs font-semibold text-stone-700 mb-2">Resources</p>
          <ul class="text-xs text-[#444] space-y-1.5">
            ${resourcesList.length > 0 ? resourcesList : "<li>No resources selected</li>"}
          </ul>
        </div>

        {/* Right box - Preparation steps (3/4 width) */}
        <div class="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-3">
          <p class="text-xs font-semibold text-stone-700 mb-2">Preparation</p>
          <ul class="text-sm text-[#444] space-y-2">
            ${
              materialsContent
                .split("\n")
                .filter(Boolean)
                .map(
                  (item, index) =>
                    `<li key=${index} className="flex items-start gap-2"><span className="text-stone-400 flex-shrink-0">${index + 1}.</span><span>${item}</span></li>`,
                )
                .join("") || "<li>No preparation steps listed</li>"
            }
          </ul>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Minds On Section -->
  <div class="section">
    <div class="section-header minds-on">
      <span class="section-title">Minds On</span>
      <span class="section-time">${mindsOnTime} minutes</span>
    </div>
    <div class="section-subtitle minds-on">Activating Prior Knowledge</div>
    <div class="section-content">${mindsOnContent}</div>
    <div class="differentiation-box">
      <div class="differentiation-title">Differentiation</div>
      <div class="differentiation-content">${mindsOnDifferentiation}</div>
    </div>
  </div>
  
  <!-- Action Section -->
  <div class="section">
    <div class="section-header action">
      <span class="section-title">Action</span>
      <span class="section-time">${actionTime} minutes</span>
    </div>
    <div class="section-subtitle action">Exploring & Applying</div>
    <div class="section-content">${actionContent}</div>
    <div class="resources-box">
      <div class="resources-title">Resources Used</div>
      <ul class="resources-list">
        ${resourcesList || "<li>No resources selected</li>"}
      </ul>
    </div>
    <div class="differentiation-box">
      <div class="differentiation-title">Differentiation</div>
      <div class="differentiation-content">${actionDifferentiation}</div>
    </div>
  </div>
  
  <!-- Consolidation Section -->
  <div class="section">
    <div class="section-header consolidation">
      <span class="section-title">Consolidation</span>
      <span class="section-time">${consolidationTime} minutes</span>
    </div>
    <div class="section-subtitle consolidation">Reflecting & Connecting</div>
    <div class="section-content">${consolidationContent}</div>
    <div class="assessment-box">
      <div class="assessment-title">Assessment Note</div>
      <div class="assessment-content">${consolidationAssessment}</div>
    </div>
  </div>
  
  <div class="footer">
    Generated by Maple Key • ${currentDate} • maplekey.ca
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  return (
    <div className={asSpace ? "fixed inset-0 z-[200] overflow-hidden" : "fixed inset-0 z-[200] flex items-center justify-center"}>
      {!asSpace && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />}

      {/* Content */}
      <div className={asSpace ? "w-full h-full bg-[#FAF3E0] flex flex-col overflow-hidden" : "relative w-[95vw] h-[90vh] bg-[#FAF3E0] rounded-3xl shadow-2xl flex flex-col overflow-hidden"}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b-2 border-[#E8D5C4] bg-white">
          <div className="flex items-center gap-4">
            {/* Back button */}
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#FFE5CC] rounded-full transition-all duration-200"
              aria-label="Back to saved resources"
            >
              <ArrowLeft size={24} className="text-[#8B4513]" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={24} className="text-violet-600" />
                <h2 className="text-2xl font-bold text-[#2C2C2C]">
                  {lessonGenerated ? "Your Lesson Plan" : "Generate Lesson Plan"}
                </h2>
              </div>
              <p className="text-sm text-[#666] mt-1">
                {bookmarkedResources.length} resource{bookmarkedResources.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-[#FFE5CC] rounded-full transition-all duration-200"
            aria-label="Close modal"
          >
            <X size={28} className="text-[#8B4513]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {lessonGenerated ? (
              <>
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
                        {bookmarkedResources[0]?.grade_level?.[0] ? `Grade ${bookmarkedResources[0].grade_level[0]}` : ""}
                        {bookmarkedResources[0]?.grade_level?.[0] && " • "}
                        {lessonLength} • {lessonTemplate.split(" (")[0]}
                      </p>
                      {coveredCodes.length > 0 && (
                        <p className="text-xs text-[#888] mt-1">
                          Curriculum: {coveredCodes.join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportPDF}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Download size={16} />
                        Export PDF
                      </button>
                      <button
                        onClick={handleRegenerate}
                        className="px-4 py-2 border-2 border-[#E8D5C4] hover:bg-[#FAF3E0] text-[#8B4513] text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw size={16} />
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>

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
                            {bookmarkedResources.map((r) => r.topic_title).join(", ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-stone-600 mb-2">
                            Preparation & Materials (one per line)
                          </p>
                          <textarea
                            value={materialsContent}
                            onChange={(e) => setMaterialsContent(e.target.value)}
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
                        {/* Left box - Resources (1/4 width) */}
                        <div className="w-1/4 bg-stone-50 border border-stone-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-stone-700 mb-2">Resources</p>
                          <ul className="text-xs text-[#444] space-y-1.5">
                            {bookmarkedResources.map((resource, index) => (
                              <li key={index} className="flex items-start gap-1.5">
                                <span className="text-stone-400 flex-shrink-0">•</span>
                                <span>{resource.topic_title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Right box - Preparation steps (3/4 width) */}
                        <div className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-3">
                          <p className="text-xs font-semibold text-stone-700 mb-2">Preparation</p>
                          <ul className="text-sm text-[#444] space-y-2">
                            {materialsContent
                              .split("\n")
                              .filter(Boolean)
                              .map((item, index) => (
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
                      <button
                        onClick={() => setEditingSection(editingSection === "mindsOn" ? null : "mindsOn")}
                        className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                        aria-label="Edit Minds On section"
                      >
                        <Pencil size={16} className="text-blue-600" />
                      </button>
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
                      <button
                        onClick={() => setEditingSection(editingSection === "action" ? null : "action")}
                        className="p-1.5 hover:bg-emerald-50 rounded-lg transition-colors"
                        aria-label="Edit Action section"
                      >
                        <Pencil size={16} className="text-emerald-600" />
                      </button>
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
                            {bookmarkedResources.slice(0, 3).map((resource) => (
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
                            {bookmarkedResources.slice(0, 3).map((resource) => (
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
                      <button
                        onClick={() => setEditingSection(editingSection === "consolidation" ? null : "consolidation")}
                        className="p-1.5 hover:bg-violet-50 rounded-lg transition-colors"
                        aria-label="Edit Consolidation section"
                      >
                        <Pencil size={16} className="text-violet-600" />
                      </button>
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
                  </div>
                </div>

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
            ) : (
              <>
                {/* District Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">District Settings Active:</span> Your district administrator has
                    configured the lesson planner to align with approved pedagogical frameworks and instructional
                    standards.
                  </p>
                </div>

                {/* Student Progress Data Section */}
                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={20} className="text-[#8B4513]" />
                    <h3 className="font-semibold text-[#2C2C2C]">Student Progress Data</h3>
                    <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">Optional</span>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAssessmentData}
                      onChange={(e) => setIncludeAssessmentData(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-stone-300 text-orange-500 focus:ring-orange-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-[#2C2C2C]">Include recent assessment data</span>
                      <p className="text-xs text-[#666] mt-0.5">
                        Personalize the lesson based on student readiness levels
                      </p>
                    </div>
                  </label>

                  {includeAssessmentData && (
                    <div className="mt-4 bg-stone-50 rounded-lg p-4 border border-stone-200">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-[#2C2C2C]">Grade 6 - Ms. Thompson</span>
                        <span className="text-xs text-[#666]">January 15, 2025</span>
                      </div>
                      <p className="text-xs text-[#666] mb-3">
                        Recent assessment: Data Literacy & Probability (D1.1, D2.1, D2.2)
                      </p>

                      {/* Progress bar */}
                      <div className="h-4 rounded-full overflow-hidden flex mb-2">
                        <div className="bg-emerald-500 h-full" style={{ width: "33%" }} />
                        <div className="bg-yellow-400 h-full" style={{ width: "25%" }} />
                        <div className="bg-orange-400 h-full" style={{ width: "29%" }} />
                        <div className="bg-red-400 h-full" style={{ width: "13%" }} />
                      </div>

                      {/* Legend */}
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span className="text-[#666]">Ready (8)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-yellow-400" />
                          <span className="text-[#666]">Almost (6)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-orange-400" />
                          <span className="text-[#666]">Support (7)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400" />
                          <span className="text-[#666]">Intervention (3)</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-stone-200">
                        <p className="text-xs font-medium text-[#2C2C2C] mb-1">Common Misconceptions Identified:</p>
                        <ul className="text-xs text-[#666] space-y-0.5">
                          <li>• Difficulty reading and interpreting multi-variable graphs</li>
                          <li>• Confusing theoretical vs experimental probability</li>
                          <li>• Struggling to identify bias in data collection methods</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={20} className="text-[#8B4513]" />
                    <h3 className="text-lg font-semibold text-[#2C2C2C]">Selected Resources</h3>
                  </div>

                  {false && showWarning && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-3 mb-4">
                      <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">
                        You've selected resources across multiple topics. Consider narrowing your selection for a more
                        focused lesson, or the generated plan will cover concepts at a higher level.
                      </p>
                    </div>
                  )}

                  <div className="bg-stone-50 rounded-lg p-3 space-y-2">
                    {bookmarkedResources.map((resource, index) => (
                      <div
                        key={resource.url}
                        className="flex items-center gap-3 py-2 px-3 bg-white rounded-lg border border-stone-200"
                      >
                        <div className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm text-[#2C2C2C] flex-1 truncate">{resource.topic_title}</span>
                        {resource.curriculum_expectations && resource.curriculum_expectations.length > 0 && (
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {resource.curriculum_expectations.join(", ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Layout size={16} className="text-[#8B4513]" />
                    <h3 className="text-lg font-semibold text-[#2C2C2C]">Lesson Configuration</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Lesson Length Dropdown */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[#2C2C2C] mb-2">
                        <Clock size={16} className="text-[#8B4513]" />
                        Lesson Length
                      </label>
                      <select
                        value={lessonLength}
                        onChange={(e) => setLessonLength(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-[#E8D5C4] rounded-lg bg-white text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                      >
                        <option value="40 minutes">40 minutes</option>
                        <option value="60 minutes">60 minutes</option>
                        <option value="75 minutes">75 minutes</option>
                        <option value="90 minutes">90 minutes</option>
                        <option value="120 minutes">120 minutes (double)</option>
                      </select>
                    </div>

                    {/* Lesson Template Dropdown */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-[#2C2C2C] mb-2">
                        <Layout size={16} className="text-[#8B4513]" />
                        Lesson Template
                      </label>
                      <select
                        value={lessonTemplate}
                        onChange={(e) => setLessonTemplate(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-[#E8D5C4] rounded-lg bg-white text-sm focus:outline-none focus:border-[#FF6B35] transition-colors"
                      >
                        <option value="3-Part Lesson (Minds On, Action, Consolidation)">
                          3-Part Lesson (Minds On, Action, Consolidation)
                        </option>
                        <option value="5E Model (Engage, Explore, Explain, Elaborate, Evaluate)">
                          5E Model (Engage, Explore, Explain, Elaborate, Evaluate)
                        </option>
                        <option value="Direct Instruction (I Do, We Do, You Do)">
                          Direct Instruction (I Do, We Do, You Do)
                        </option>
                        <option value="Inquiry-Based Learning">Inquiry-Based Learning</option>
                        <option value="Workshop Model">Workshop Model</option>
                      </select>
                    </div>
                  </div>
                </div>

                {classroomResourceLabels.length > 0 && (
                  <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <School size={18} className="text-[#8B4513]" />
                      <h3 className="text-sm font-semibold text-[#2C2C2C]">Your Classroom Resources</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {classroomResourceLabels.map((label) => (
                        <span
                          key={label}
                          className="inline-block px-2.5 py-1 bg-[#FFF6EC] border border-[#E8D5C4] rounded-full text-xs text-[#8B4513] font-medium"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[#888] mt-2">These will inform your lesson plan. Update them in Settings.</p>
                  </div>
                )}

                <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText size={20} className="text-[#8B4513]" />
                    <h3 className="text-lg font-semibold text-[#2C2C2C]">Additional Notes</h3>
                    <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Optional</span>
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
                  </p>
                </div>

                {/* Spacer for bottom */}
                <div className="h-6" />
              </>
            )}
          </div>
        </div>

        {!lessonGenerated && (
          <div className="sticky bottom-0 border-t-2 border-[#E8D5C4] bg-white px-6 py-4">
            <div className="max-w-3xl mx-auto space-y-3">
              {generateError && (
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
              )}
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Generating your lesson...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate Lesson Plan
                  </>
                )}
              </button>
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
