"use client"

import FollowsLink from "@/components/follows-link"
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  ClipboardCheck,
  ClipboardList,
  Download,
  Lightbulb,
  MessageCircle,
  MessageSquareText,
  Pencil,
  RefreshCw,
  Search,
  CornerDownRight,
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
  /** CRRP and equity framing; empty on lessons saved before LESSON_SPEC.md added it. */
  equityFraming: string
  /** Student self-assessment moment against the success criteria. */
  reflectionCheckpoint: string
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
  /** "What's next?" exits: the saved-lessons library, and Search for the next lesson. */
  onOpenLibrary: () => void
  onPlanAnother: () => void
  /** "Continue from this lesson": starts a fresh plan that builds on this one. */
  onPlanNext?: () => void
  /** The lesson this one continues from. `onOpen` is absent once it has dropped out of the log. */
  follows?: { title: string; onOpen?: () => void } | null
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
  equityFraming,
  reflectionCheckpoint,
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
  onOpenLibrary,
  onPlanAnother,
  onPlanNext,
  follows,
}: GeneratedLessonViewProps) {
  const mindsOnTime = Math.round(lessonMinutes * 0.17)
  const actionTime = Math.round(lessonMinutes * 0.58)
  const consolidationTime = Math.round(lessonMinutes * 0.25)

  return (
    <>
      {/* SUCCESS BANNER */}
      <div className="bg-success-tint border border-success/40 rounded-lg p-4 flex items-center gap-3">
        <CheckCircle size={24} className="text-success flex-shrink-0" />
        <span className="text-success font-medium">Lesson plan generated successfully!</span>
      </div>

      {/* LESSON HEADER */}
      <div className="bg-card rounded-xl border-2 border-border p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-foreground">
              {lessonTitle}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {resources[0]?.grade_level?.[0] ? `Grade ${resources[0].grade_level[0]}` : ""}
              {resources[0]?.grade_level?.[0] && " • "}
              {lessonLength} • {lessonTemplate.split(" (")[0]}
            </p>
            {follows && <FollowsLink follows={follows} className="mt-1" />}
            {coveredCodes.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Curriculum: {coveredCodes.join(", ")}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={onExportPDF}
              disabled={!allStagesApproved}
              title={allStagesApproved ? undefined : "Approve every lesson stage before exporting"}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
            >
              <Download size={16} />
              Export PDF
            </button>
            <button
              onClick={onExportJSON}
              disabled={!allStagesApproved}
              title={allStagesApproved ? "Save the full lesson JSON (including quiz questions) so you can reload it later without using API credits" : "Approve every lesson stage before saving"}
              className="px-4 py-2 border-2 border-border hover:bg-accent text-secondary-strong text-sm font-medium rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <Download size={16} />
              Save JSON
            </button>
            {canRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-4 py-2 border-2 border-border hover:bg-accent text-secondary-strong text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={16} />
                Regenerate
              </button>
            )}
            {unapprovedCount > 0 && (
              <p className="basis-full text-right text-xs font-medium text-pop-strong">
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
        <div className="bg-card rounded-xl border-2 border-border p-5">
          {learningGoal && (
            <div className={successCriteria.length > 0 ? "mb-4" : ""}>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1">Learning Goal</p>
              <p className="text-sm text-foreground leading-relaxed">{learningGoal}</p>
            </div>
          )}
          {successCriteria.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Success Criteria</p>
              <ul className="space-y-1.5">
                {successCriteria.map((sc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle size={14} className="text-success flex-shrink-0 mt-0.5" />
                    <span>{sc}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* CRRP & EQUITY + REFLECTION CHECKPOINT (all templates) */}
      {(equityFraming || reflectionCheckpoint) && (
        <div className="bg-card rounded-xl border-2 border-border p-5 space-y-4">
          {equityFraming && (
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">CRRP &amp; Equity</p>
              <p className="text-sm text-card-foreground leading-relaxed">{equityFraming}</p>
            </div>
          )}
          {reflectionCheckpoint && (
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Reflection Checkpoint</p>
              <p className="text-sm text-card-foreground leading-relaxed">{reflectionCheckpoint}</p>
            </div>
          )}
        </div>
      )}

      {/* EXCLUDED RESOURCES NOTICE */}
      {excludedResources.length > 0 && (
        <div className="bg-muted border border-border rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Resources not used in this lesson</p>
          <ul className="space-y-1">
            {excludedResources.map((ex, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <span className="font-medium">{ex.title}:</span> {ex.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* MATERIALS & PREPARATION SECTION - Moved above Minds On */}
      <div className="bg-card rounded-xl border-l-4 border-muted-foreground shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <ClipboardList size={20} className="text-muted-foreground" />
              <h4 className="text-lg font-semibold text-foreground">Materials & Preparation</h4>
            </div>
            <button
              onClick={() => onEditSection(editingSection === "materials" ? null : "materials")}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              aria-label="Edit Materials section"
            >
              <Pencil size={16} className="text-muted-foreground" />
            </button>
          </div>

          {editingSection === "materials" ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Resources (auto-generated from bookmarks)
                </p>
                <p className="text-sm text-foreground bg-muted p-2 rounded-lg">
                  {(materialsResources.length > 0 ? materialsResources : resources.map((r) => r.topic_title)).join(", ")}
                </p>
              </div>
              {classroomMaterialsUsed.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Classroom materials used
                  </p>
                  <p className="text-sm text-foreground bg-muted p-2 rounded-lg">
                    {classroomMaterialsUsed.join(", ")}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Preparation steps (one per line)
                </p>
                <textarea
                  value={materialsPreparation.join("\n")}
                  onChange={(e) => onChange({ materialsPreparation: e.target.value.split("\n") })}
                  rows={6}
                  className="w-full px-3 py-2 border-2 border-border-strong rounded-lg bg-card text-sm focus:outline-none focus:border-ring transition-colors resize-none"
                />
              </div>
              <button
                onClick={() => onEditSection(null)}
                className="px-3 py-1.5 bg-foreground hover:bg-foreground/85 text-background text-xs font-medium rounded-lg transition-colors"
              >
                Done Editing
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              {/* Left box - Resources + classroom materials (1/4 width) */}
              <div className="w-1/4 bg-muted border border-border rounded-lg p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Materials</p>
                <ul className="text-xs text-foreground space-y-1.5">
                  {(materialsResources.length > 0 ? materialsResources.map((t) => ({ topic_title: t })) : resources).map((r, index) => (
                    <li key={index} className="flex items-start gap-1.5">
                      <span className="text-muted-foreground flex-shrink-0">•</span>
                      <span>{r.topic_title}</span>
                    </li>
                  ))}
                </ul>
                {classroomMaterialsUsed.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-3 mb-1.5">
                      From your classroom
                    </p>
                    <ul className="text-xs text-foreground space-y-1.5">
                      {classroomMaterialsUsed.map((m, index) => (
                        <li key={index} className="flex items-start gap-1.5">
                          <span className="text-success flex-shrink-0">▪</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Right box - Preparation steps (3/4 width) */}
              <div className="flex-1 bg-muted border border-border rounded-lg p-3">
                <p className="text-xs font-semibold text-foreground mb-2">Preparation</p>
                <ul className="text-sm text-foreground space-y-2">
                  {(materialsPreparation.length > 0
                    ? materialsPreparation
                    : materialsContent.split("\n").filter(Boolean)
                  ).map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-muted-foreground flex-shrink-0">{index + 1}.</span>
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
      <div className="bg-card rounded-xl border-l-4 border-hue-blue shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Lightbulb size={20} className="text-hue-blue" />
              <h4 className="text-lg font-semibold text-foreground">Minds On</h4>
              <span className="text-xs bg-hue-blue/10 text-hue-blue px-2 py-1 rounded-full font-medium">
                {mindsOnTime} minutes
              </span>
            </div>
          </div>
          <p className="text-xs text-hue-blue font-medium uppercase tracking-wide mb-3">
            Activating Prior Knowledge
          </p>

          {editingSection === "mindsOn" ? (
            <div className="space-y-3">
              <textarea
                value={mindsOnContent}
                onChange={(e) => onChange({ mindsOnContent: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border-2 border-hue-blue/40 rounded-lg bg-card text-sm focus:outline-none focus:border-hue-blue transition-colors resize-none"
              />
              <div className="bg-pop-tint border border-pop/50 rounded-lg p-3">
                <p className="text-xs font-medium text-pop-strong mb-2">Differentiation</p>
                <textarea
                  value={mindsOnDifferentiation}
                  onChange={(e) => onChange({ mindsOnDifferentiation: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-pop/50 rounded-lg bg-card text-xs focus:outline-none focus:border-ring transition-colors resize-none"
                />
              </div>
              <button
                onClick={() => onEditSection(null)}
                className="px-3 py-1.5 bg-hue-blue hover:bg-hue-blue/90 text-hue-foreground text-xs font-medium rounded-lg transition-colors"
              >
                Done Editing
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground leading-relaxed">{mindsOnContent}</p>
              <div className="mt-4 bg-pop-tint border border-pop/50 rounded-lg p-3">
                <p className="text-xs font-medium text-pop-strong mb-1">Differentiation</p>
                <p className="text-xs text-pop-strong">{mindsOnDifferentiation}</p>
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
      <div className="bg-card rounded-xl border-l-4 border-hue-green shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-hue-green" />
              <h4 className="text-lg font-semibold text-foreground">Action</h4>
              <span className="text-xs bg-hue-green/10 text-hue-green px-2 py-1 rounded-full font-medium">
                {actionTime} minutes
              </span>
            </div>
          </div>
          <p className="text-xs text-hue-green font-medium uppercase tracking-wide mb-3">
            Exploring & Applying
          </p>

          {editingSection === "action" ? (
            <div className="space-y-3">
              <textarea
                value={actionContent}
                onChange={(e) => onChange({ actionContent: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border-2 border-hue-green/40 rounded-lg bg-card text-sm focus:outline-none focus:border-hue-green transition-colors resize-none"
              />
              <div className="bg-muted border border-border rounded-lg p-3">
                <p className="text-xs font-medium text-foreground mb-2">Resources Used</p>
                <div className="space-y-1">
                  {resources.slice(0, 3).map((resource) => (
                    <a
                      key={resource.url}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-secondary-strong hover:underline block truncate"
                    >
                      • {resource.topic_title}
                    </a>
                  ))}
                </div>
              </div>
              <div className="bg-pop-tint border border-pop/50 rounded-lg p-3">
                <p className="text-xs font-medium text-pop-strong mb-2">Differentiation</p>
                <textarea
                  value={actionDifferentiation}
                  onChange={(e) => onChange({ actionDifferentiation: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-pop/50 rounded-lg bg-card text-xs focus:outline-none focus:border-ring transition-colors resize-none"
                />
              </div>
              <button
                onClick={() => onEditSection(null)}
                className="px-3 py-1.5 bg-hue-green hover:bg-hue-green/90 text-hue-foreground text-xs font-medium rounded-lg transition-colors"
              >
                Done Editing
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground leading-relaxed">{actionContent}</p>
              <div className="mt-4 bg-muted border border-border rounded-lg p-3">
                <p className="text-xs font-medium text-foreground mb-2">Resources Used</p>
                <div className="space-y-1">
                  {resources.slice(0, 3).map((resource) => (
                    <a
                      key={resource.url}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-secondary-strong hover:underline block truncate"
                    >
                      • {resource.topic_title}
                    </a>
                  ))}
                </div>
              </div>
              <div className="mt-4 bg-pop-tint border border-pop/50 rounded-lg p-3">
                <p className="text-xs font-medium text-pop-strong mb-1">Differentiation</p>
                <p className="text-xs text-pop-strong">{actionDifferentiation}</p>
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
      <div className="bg-card rounded-xl border-l-4 border-hue-violet shadow-sm overflow-hidden">
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <MessageCircle size={20} className="text-hue-violet" />
              <h4 className="text-lg font-semibold text-foreground">Consolidation</h4>
              <span className="text-xs bg-hue-violet/10 text-hue-violet px-2 py-1 rounded-full font-medium">
                {consolidationTime} minutes
              </span>
            </div>
          </div>
          <p className="text-xs text-hue-violet font-medium uppercase tracking-wide mb-3">
            Reflecting & Connecting
          </p>

          {editingSection === "consolidation" ? (
            <div className="space-y-3">
              <textarea
                value={consolidationContent}
                onChange={(e) => onChange({ consolidationContent: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border-2 border-hue-violet/40 rounded-lg bg-card text-sm focus:outline-none focus:border-hue-violet transition-colors resize-none"
              />
              <div className="bg-hue-violet/10 border border-hue-violet/40 rounded-lg p-3">
                <p className="text-xs font-medium text-hue-violet mb-2">Assessment Note</p>
                <textarea
                  value={consolidationAssessment}
                  onChange={(e) => onChange({ consolidationAssessment: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-hue-violet/40 rounded-lg bg-card text-xs focus:outline-none focus:border-hue-violet transition-colors resize-none"
                />
              </div>
              <button
                onClick={() => onEditSection(null)}
                className="px-3 py-1.5 bg-hue-violet hover:bg-hue-violet/90 text-hue-foreground text-xs font-medium rounded-lg transition-colors"
              >
                Done Editing
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-foreground leading-relaxed">{consolidationContent}</p>
              <div className="mt-4 bg-hue-violet/10 border border-hue-violet/40 rounded-lg p-3">
                <p className="text-xs font-medium text-hue-violet mb-1">Assessment Note</p>
                <p className="text-xs text-hue-violet">{consolidationAssessment}</p>
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
          <div key={section.id} className={`bg-card rounded-xl border-l-4 ${sectionDef.colors.border} shadow-sm overflow-hidden`}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className={`text-lg font-semibold text-foreground`}>{section.label}</h4>
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
                    className={`w-full px-3 py-2 border-2 border-border rounded-lg bg-card text-sm focus:outline-none ${sectionDef.colors.focusBorder} transition-colors resize-none`}
                  />
                  <div className={`${sectionDef.calloutIsAssessment ? "bg-hue-violet/10 border border-hue-violet/40" : "bg-pop-tint border border-pop/50"} rounded-lg p-3`}>
                    <p className={`text-xs font-medium ${sectionDef.calloutIsAssessment ? "text-hue-violet" : "text-pop-strong"} mb-2`}>
                      {sectionDef.calloutLabel}
                    </p>
                    <textarea
                      value={section.callout ?? ""}
                      onChange={(e) => onTemplateSectionsChange((prev) =>
                        prev.map((s) => s.id === section.id ? { ...s, callout: e.target.value } : s)
                      )}
                      rows={2}
                      className={`w-full px-3 py-2 border ${sectionDef.calloutIsAssessment ? "border-hue-violet/40" : "border-pop/50"} rounded-lg bg-card text-xs focus:outline-none transition-colors resize-none`}
                    />
                  </div>
                  <button
                    onClick={() => onEditSection(null)}
                    className={`px-3 py-1.5 ${sectionDef.colors.doneBg} ${sectionDef.colors.doneHover} text-hue-foreground text-xs font-medium rounded-lg transition-colors`}
                  >
                    Done Editing
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-foreground leading-relaxed">{section.content}</p>
                  {section.callout && (
                    <div className={`mt-4 ${sectionDef.calloutIsAssessment ? "bg-hue-violet/10 border border-hue-violet/40" : "bg-pop-tint border border-pop/50"} rounded-lg p-3`}>
                      <p className={`text-xs font-medium ${sectionDef.calloutIsAssessment ? "text-hue-violet" : "text-pop-strong"} mb-1`}>
                        {sectionDef.calloutLabel}
                      </p>
                      <p className={`text-xs ${sectionDef.calloutIsAssessment ? "text-hue-violet" : "text-pop-strong"}`}>
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

      {/* NEXT STEPS — the plan is saved, so point the teacher somewhere useful */}
      <section aria-labelledby="next-steps-heading" className="bg-card rounded-xl border-2 border-border p-5 sm:p-6">
        <h4 id="next-steps-heading" className="text-lg font-semibold text-foreground">What&apos;s next?</h4>
        <p className="text-sm text-muted-foreground mt-1">This lesson is saved to your Lessons library.</p>

        {canAssess && (
          <button
            onClick={onStartAssessment}
            className="mt-4 w-full flex items-center gap-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground p-4 text-left transition-colors"
          >
            <ClipboardCheck size={24} className="flex-shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="block font-semibold">Start a quick check</span>
              <span className="block text-sm opacity-90 mt-1">
                {coveredCodes.length > 0
                  ? `Formative assessment on ${coveredCodes.join(", ")}`
                  : "Formative assessment on this lesson's learning goal"}
              </span>
            </span>
            <ArrowRight size={20} className="flex-shrink-0" />
          </button>
        )}

        {onPlanNext && (
          <button
            onClick={onPlanNext}
            className="mt-3 w-full flex items-center gap-3 rounded-xl border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 p-4 text-left transition-colors"
          >
            <CornerDownRight size={20} className="text-primary flex-shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Plan the next lesson</span>
              <span className="block text-xs text-muted-foreground mt-1">Pick up where this lesson leaves off</span>
            </span>
            <ArrowRight size={18} className="text-primary flex-shrink-0" />
          </button>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            onClick={onOpenLibrary}
            className="flex items-center gap-3 rounded-xl border-2 border-border hover:bg-muted/40 p-4 text-left transition-colors"
          >
            <BookOpen size={20} className="text-primary flex-shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Go to my lessons</span>
              <span className="block text-xs text-muted-foreground mt-1">Revisit, export, or teach a saved plan</span>
            </span>
          </button>
          <button
            onClick={onPlanAnother}
            className="flex items-center gap-3 rounded-xl border-2 border-border hover:bg-muted/40 p-4 text-left transition-colors"
          >
            <Search size={20} className="text-primary flex-shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Plan another lesson</span>
              <span className="block text-xs text-muted-foreground mt-1">Find resources for your next lesson</span>
            </span>
          </button>
        </div>
      </section>

      {/* FEEDBACK — deliberately last and low-key so it doesn't compete with next steps */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-2 text-center">
        <MessageSquareText size={18} className="text-muted-foreground flex-shrink-0" />
        <p className="text-sm text-muted-foreground">Did you like this lesson? Do you have feedback?</p>
        <button
          onClick={onOpenFeedback}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Submit Feedback
        </button>
      </div>

      {/* Spacer for bottom */}
      <div className="h-6" />
    </>
  )
}
