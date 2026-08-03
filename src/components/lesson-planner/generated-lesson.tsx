"use client"

import {
  CheckCircle,
  ClipboardList,
  Download,
  Lightbulb,
  MessageCircle,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Target,
} from "lucide-react"
import ArtifactsSection from "@/components/artifacts-section"
import StageReviewFooter from "@/components/stage-review-footer"
import type { Resource } from "@/lib/types"
import type {
  ArtifactStatus,
  LessonArtifact,
  TemplateSection,
} from "@/lib/lesson-metadata"
import type { LessonTemplateDef } from "@/lib/lesson-templates"

/**
 * Fields the teacher can edit inline on the generated plan. Patches rather than
 * per-field setters, so the planner can swap its flat useState pile for a
 * reducer without touching this component.
 */
export interface LessonContentPatch {
  mindsOnContent?: string
  mindsOnDifferentiation?: string
  actionContent?: string
  actionDifferentiation?: string
  consolidationContent?: string
  consolidationAssessment?: string
  materialsPreparation?: string[]
}

export interface GeneratedLessonViewProps {
  /** Generated content */
  lessonTitle: string
  coveredCodes: string[]
  learningGoal: string
  successCriteria: string[]
  mindsOnContent: string
  mindsOnDifferentiation: string
  actionContent: string
  actionDifferentiation: string
  consolidationContent: string
  consolidationAssessment: string
  materialsContent: string
  materialsResources: string[]
  classroomMaterialsUsed: string[]
  materialsPreparation: string[]
  excludedResources: { title: string; reason: string }[]
  artifacts: LessonArtifact[]
  templateSections: TemplateSection[]

  /** Lesson context */
  resources: Resource[]
  lessonLength: string
  lessonTemplate: string
  lessonMinutes: number
  isThreePart: boolean
  templateDef: LessonTemplateDef

  /** Per-stage review gating */
  editingSection: string | null
  approvedSections: Record<string, boolean>
  allStagesApproved: boolean
  unapprovedCount: number

  canRegenerate: boolean
  canAssess: boolean

  onEditSection: (key: string | null) => void
  onApproveStage: (key: string) => void
  onEditStage: (key: string) => void
  onChange: (patch: LessonContentPatch) => void
  onTemplateSectionsChange: (updater: (prev: TemplateSection[]) => TemplateSection[]) => void
  onExportPDF: () => void
  onExportJSON: () => void
  onRegenerate: () => void
  onArtifactStatusChange: (index: number, status: ArtifactStatus) => void
  onOpenOrganizer: (index: number) => void
  onOpenFeedback: () => void
  onStartAssessment: () => void
}

/**
 * The finished lesson plan: header + export actions, learning goal, materials,
 * handout artifacts, and the per-stage cards with their inline editors and
 * approve/edit gates. Export stays disabled until every stage is approved.
 */
export default function GeneratedLessonView({
  lessonTitle,
  coveredCodes,
  learningGoal,
  successCriteria,
  mindsOnContent,
  mindsOnDifferentiation,
  actionContent,
  actionDifferentiation,
  consolidationContent,
  consolidationAssessment,
  materialsContent,
  materialsResources,
  classroomMaterialsUsed,
  materialsPreparation,
  excludedResources,
  artifacts,
  templateSections,
  resources,
  lessonLength,
  lessonTemplate,
  lessonMinutes,
  isThreePart,
  templateDef,
  editingSection,
  approvedSections,
  allStagesApproved,
  unapprovedCount,
  canRegenerate,
  canAssess,
  onEditSection,
  onApproveStage,
  onEditStage,
  onChange,
  onTemplateSectionsChange,
  onExportPDF,
  onExportJSON,
  onRegenerate,
  onArtifactStatusChange,
  onOpenOrganizer,
  onOpenFeedback,
  onStartAssessment,
}: GeneratedLessonViewProps) {
  const mindsOnTime = Math.round(lessonMinutes * 0.17)
  const actionTime = Math.round(lessonMinutes * 0.58)
  const consolidationTime = Math.round(lessonMinutes * 0.25)

  return (
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
              onClick={onExportPDF}
              disabled={!allStagesApproved}
              title={allStagesApproved ? undefined : "Approve every lesson stage before exporting"}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-500"
            >
              <Download size={16} />
              Export PDF
            </button>
            <button
              onClick={onExportJSON}
              disabled={!allStagesApproved}
              title={allStagesApproved ? "Save the full lesson JSON (including quiz questions) so you can reload it later without using API credits" : "Approve every lesson stage before saving"}
              className="px-4 py-2 border-2 border-[#E8D5C4] hover:bg-[#FAF3E0] text-[#8B4513] text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <Download size={16} />
              Save JSON
            </button>
            {canRegenerate && (
              <button
                onClick={onRegenerate}
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
              onClick={() => onEditSection(editingSection === "materials" ? null : "materials")}
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
                  onChange={(e) => onChange({ materialsPreparation: e.target.value.split("\n") })}
                  rows={6}
                  className="w-full px-3 py-2 border-2 border-stone-300 rounded-lg bg-white text-sm focus:outline-none focus:border-stone-500 transition-colors resize-none"
                />
              </div>
              <button
                onClick={() => onEditSection(null)}
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
          onStatusChange={onArtifactStatusChange}
          onOpenOrganizer={onOpenOrganizer}
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
                onChange={(e) => onChange({ mindsOnContent: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg bg-white text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-800 mb-2">Differentiation</p>
                <textarea
                  value={mindsOnDifferentiation}
                  onChange={(e) => onChange({ mindsOnDifferentiation: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-xs focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>
              <button
                onClick={() => onEditSection(null)}
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
              onApprove={() => onApproveStage("mindsOn")}
              onEdit={() => onEditStage("mindsOn")}
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
                onChange={(e) => onChange({ actionContent: e.target.value })}
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
                  onChange={(e) => onChange({ actionDifferentiation: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-xs focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>
              <button
                onClick={() => onEditSection(null)}
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
              onApprove={() => onApproveStage("action")}
              onEdit={() => onEditStage("action")}
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
                onChange={(e) => onChange({ consolidationContent: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border-2 border-violet-300 rounded-lg bg-white text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <p className="text-xs font-medium text-violet-800 mb-2">Assessment Note</p>
                <textarea
                  value={consolidationAssessment}
                  onChange={(e) => onChange({ consolidationAssessment: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-violet-300 rounded-lg bg-white text-xs focus:outline-none focus:border-violet-500 transition-colors resize-none"
                />
              </div>
              <button
                onClick={() => onEditSection(null)}
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
              onApprove={() => onApproveStage("consolidation")}
              onEdit={() => onEditStage("consolidation")}
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
                    onChange={(e) => onTemplateSectionsChange((prev) =>
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
                      onChange={(e) => onTemplateSectionsChange((prev) =>
                        prev.map((s) => s.id === section.id ? { ...s, callout: e.target.value } : s)
                      )}
                      rows={2}
                      className={`w-full px-3 py-2 border ${sectionDef.calloutIsAssessment ? "border-violet-300" : "border-amber-300"} rounded-lg bg-white text-xs focus:outline-none transition-colors resize-none`}
                    />
                  </div>
                  <button
                    onClick={() => onEditSection(null)}
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
                  onApprove={() => onApproveStage(editKey)}
                  onEdit={() => onEditStage(editKey)}
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
          onClick={onOpenFeedback}
          className="px-6 py-2.5 bg-[#FF6B35] hover:bg-[#e55a2a] text-white font-semibold rounded-xl transition-colors"
        >
          Submit Feedback
        </button>
      </div>

      {/* Assessment CTA */}
      {canAssess && (
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
            onClick={onStartAssessment}
            className="flex-shrink-0 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Start Assessment
          </button>
        </div>
      )}

      {/* Spacer for bottom */}
      <div className="h-6" />
    </>
  )
}
