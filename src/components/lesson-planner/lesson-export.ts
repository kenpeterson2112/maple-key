/**
 * Pure export/import helpers for the lesson planner: the print-to-PDF HTML
 * builder, the request/response JSON round-trip, and the copyable full prompt.
 *
 * Everything here is a plain function over the lesson draft — no React state, no
 * side effects beyond the browser download/print calls at the very edges. That
 * keeps the PDF layout (which does NOT honor the app's font fallback chain and
 * has to be verified in the export, not on screen) reviewable on its own.
 */

import type { Resource } from "@/lib/types"
import type { LessonArtifact, TemplateSection } from "@/lib/lesson-metadata"
import type { LessonTemplateDef } from "@/lib/lesson-templates"
import type { AssessmentQuestion } from "@/lib/assessment-types"
import {
  openPrintWindow,
  escapeHtml as esc,
  nl2br,
  PRINT_ON_LOAD_SCRIPT,
} from "@/lib/print-html"

/**
 * The `generate-lesson` response shape, as it arrives from the API or from a
 * teacher-supplied file/paste. Every field is optional: the manual fallback
 * path means this can be hand-assembled by another LLM, so nothing is trusted
 * to be present.
 */
export interface LessonResponseData {
  title?: string
  curriculumCodesCovered?: string[]
  mindsOnContent?: string
  mindsOnDifferentiation?: string
  actionContent?: string
  actionDifferentiation?: string
  consolidationContent?: string
  consolidationAssessment?: string
  materialsContent?: string
  learningGoal?: string
  successCriteria?: string[]
  materials?: { resources: string[]; classroomMaterials?: string[]; preparation: string[] }
  excludedResources?: { title: string; reason: string }[]
  sections?: TemplateSection[]
  artifacts?: unknown
  assessmentQuestions?: unknown
}

/** Lesson colors for non-3-Part section IDs. Print-only, so plain hex is fine. */
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

export interface LessonPdfInput {
  lessonTitle: string
  lessonLength: string
  lessonTemplate: string
  coveredCodes: string[]
  learningGoal: string
  successCriteria: string[]
  materialsResources: string[]
  classroomMaterialsUsed: string[]
  materialsPreparation: string[]
  materialsContent: string
  mindsOnContent: string
  mindsOnDifferentiation: string
  actionContent: string
  actionDifferentiation: string
  consolidationContent: string
  consolidationAssessment: string
  templateSections: TemplateSection[]
  resources: Resource[]
  isThreePart: boolean
  templateDef: LessonTemplateDef
  lessonMinutes: number
}

/** Builds the standalone print document. Exported separately so the markup can be snapshotted. */
export function buildLessonPdfHtml(input: LessonPdfInput): string {
  const {
    lessonTitle, lessonLength, lessonTemplate, coveredCodes, learningGoal, successCriteria,
    materialsResources, classroomMaterialsUsed, materialsPreparation, materialsContent,
    mindsOnContent, mindsOnDifferentiation, actionContent, actionDifferentiation,
    consolidationContent, consolidationAssessment, templateSections, resources,
    isThreePart, templateDef, lessonMinutes,
  } = input

  const mindsOnTime = Math.round(lessonMinutes * 0.17)
  const actionTime = Math.round(lessonMinutes * 0.58)
  const consolidationTime = Math.round(lessonMinutes * 0.25)

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

  return `
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
}

/** Opens the print window. Returns false when the popup was blocked. */
export function exportLessonPdf(input: LessonPdfInput): boolean {
  return openPrintWindow(buildLessonPdfHtml(input))
}

// ——— Request / response JSON ————————————————————————————————————————

export interface LessonRequestInput {
  bookmarkedResources: Resource[]
  lessonLength: string
  lessonTemplate: string
  teacherNotes: string
  includeAssessmentData: boolean
  classroomResources: string[]
  reproducibleLanguage: string
  noTechMode: boolean
  classContext: Record<string, string>
  classProgress?: Record<string, unknown>
}

/** The payload both API calls share. `generate-lesson` adds `planningAnswers` on top. */
export function buildRequestPayload(input: LessonRequestInput): Record<string, unknown> {
  return {
    resources: input.bookmarkedResources.map((r) => ({
      title: r.topic_title,
      description: r.description,
      curriculum_expectations: r.curriculum_expectations ?? [],
      grade: r.grade_level,
      subject: r.subject,
      publisher: r.publisher_creator,
      instructional_modes: r.instructional_modes,
      usage_notes: r.usage_notes,
    })),
    lessonLength: input.lessonLength,
    lessonTemplate: input.lessonTemplate,
    teacherNotes: input.teacherNotes,
    includeAssessmentData: input.includeAssessmentData,
    classroomResources: input.classroomResources,
    reproducibleLanguage: input.reproducibleLanguage,
    noTechMode: input.noTechMode,
    ...input.classContext,
    ...(input.classProgress ? { classProgress: input.classProgress } : {}),
  }
}

export interface LessonResponseInput {
  isThreePart: boolean
  lessonTitle: string
  learningGoal: string
  successCriteria: string[]
  coveredCodes: string[]
  mindsOnContent: string
  mindsOnDifferentiation: string
  actionContent: string
  actionDifferentiation: string
  consolidationContent: string
  consolidationAssessment: string
  templateSections: TemplateSection[]
  materialsResources: string[]
  classroomMaterialsUsed: string[]
  materialsPreparation: string[]
  excludedResources: { title: string; reason: string }[]
  assessmentQuestions: AssessmentQuestion[] | null
}

/** Serializes the current draft back into the API's response shape, so a saved
 *  lesson can be reloaded later without spending API credits. */
export function buildResponseJSON(input: LessonResponseInput): Record<string, unknown> {
  const cached = input.assessmentQuestions
  const shared = {
    title: input.lessonTitle,
    learningGoal: input.learningGoal,
    successCriteria: input.successCriteria,
    curriculumCodesCovered: input.coveredCodes,
    materials: {
      resources: input.materialsResources,
      classroomMaterials: input.classroomMaterialsUsed,
      preparation: input.materialsPreparation,
    },
    ...(input.excludedResources.length ? { excludedResources: input.excludedResources } : {}),
    ...(cached && cached.length ? { assessmentQuestions: cached } : {}),
  }
  return input.isThreePart
    ? {
        ...shared,
        mindsOnContent: input.mindsOnContent,
        mindsOnDifferentiation: input.mindsOnDifferentiation,
        actionContent: input.actionContent,
        actionDifferentiation: input.actionDifferentiation,
        consolidationContent: input.consolidationContent,
        consolidationAssessment: input.consolidationAssessment,
      }
    : { ...shared, sections: input.templateSections }
}

/** Normalizes the `artifacts` array off a raw API/imported response. */
export function normalizeArtifacts(raw: unknown): LessonArtifact[] {
  if (!Array.isArray(raw)) return []
  return (raw as Record<string, unknown>[])
    .map((a) => ({
      name: String(a?.name ?? "").trim(),
      purpose: String(a?.purpose ?? "").trim(),
      section: (["mindsOn", "action", "consolidation", "materials"].includes(a?.section as string)
        ? a.section
        : "materials") as LessonArtifact["section"],
      status: (["unset", "have", "will-make", "help-me"].includes(a?.status as string)
        ? a.status
        : "unset") as LessonArtifact["status"],
    }))
    .filter((a) => a.name.length > 0)
}

/** Triggers a browser download of `data` as pretty-printed JSON. */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Filename for a saved response JSON, derived from the lesson title. */
export function responseFilename(lessonTitle: string): string {
  const slug = lessonTitle.slice(0, 30).replace(/[^a-z0-9]/gi, "-").toLowerCase()
  return `lesson-${slug || "response"}.json`
}

// ——— Manual-fallback prompt ——————————————————————————————————————————

/**
 * The copyable prompt teachers paste into their own LLM when our API credits
 * run dry. Mirrors what `api/generate-lesson.ts` sends.
 */
export function buildFullPrompt(input: {
  bookmarkedResources: Resource[]
  lessonLength: string
  lessonTemplate: string
  teacherNotes: string
  includeAssessmentData: boolean
  classroomResources: string[]
}): string {
  const { bookmarkedResources, lessonLength, lessonTemplate, teacherNotes, includeAssessmentData } = input
  const grade = String(bookmarkedResources[0]?.grade_level ?? "unknown")
  const subject = bookmarkedResources[0]?.subject ?? "unknown"
  const allCodes = [...new Set(bookmarkedResources.flatMap((r) => r.curriculum_expectations ?? []))]
  const resourceList = bookmarkedResources
    .map((r, i) => {
      const lines = [
        `Resource ${i + 1}: "${r.topic_title}"`,
        `  Description: ${r.description}`,
        `  Publisher: ${r.publisher_creator ?? "unknown"}`,
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
    input.classroomResources.length > 0
      ? `Classroom resources available: ${input.classroomResources.join(", ")}`
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

  return `[SYSTEM]\n${systemPrompt}\n\n[USER]\n${userPrompt}`
}
