"use client"

import {
  AlertTriangle,
  Check,
  CheckCircle,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  Languages,
  Layout,
  MonitorOff,
  Pencil,
  School,
  Users,
} from "lucide-react"
import MaterialsSummary from "@/components/materials-summary"
import PlanContextBar from "@/components/plan-context-bar"
import PlanResourcePicker from "@/components/plan-resource-picker"
import { type UserMaterial } from "@/components/user-materials-section"
import { LESSON_TEMPLATES, getTemplate, resolveTemplateId } from "@/lib/lesson-templates"
import { LEVEL_META, LEVEL_ORDER } from "@/lib/assessment-types"
import { describeCode } from "@/lib/curriculum-codes"
import type { LevelCounts } from "@/lib/assessment-results"
import type { MaterialsSnapshot } from "@/lib/classroom-resources"
import type { ReproducibleLanguage } from "@/lib/lesson-metadata"
import type { LessonSetupMode } from "@/lib/personalization"
import type { SidebarFilters } from "@/lib/use-filtered-resources"
import type { Filters, Resource } from "@/lib/types"

/**
 * Guided setup steps. Same form state as the single-page layout — the wizard
 * only changes which cards are visible at once, so switching modes mid-setup
 * never loses anything.
 */
export const WIZARD_STEPS = [
  { label: "Class" },
  { label: "Resources" },
  { label: "Format" },
  { label: "Personalize" },
  { label: "Review" },
] as const

export interface SetupStepsProps {
  setupMode: LessonSetupMode
  wizardStep: number
  onSetupModeChange: (mode: LessonSetupMode) => void
  onGoToStep: (step: number) => void

  /**
   * Class context — province/grade/subject/strand off the persisted global
   * filters, plus the App-level free-text topic. Also scopes the resource
   * picker's Recommended panel, so it doubles as the picker's filters.
   */
  classContextFilters: Filters
  onClassContextChange: (next: Filters) => void

  /** Resource picker */
  sidebarFilters: SidebarFilters
  bookmarkedResources: Resource[]
  userMaterials: UserMaterial[]
  onUserMaterialsChange: (materials: UserMaterial[]) => void
  onBrowseAll: () => void

  /** Assessment-data opt-in (currently parked behind a flag, see below) */
  includeAssessmentData: boolean
  onIncludeAssessmentDataChange: (value: boolean) => void
  hasClassProgress: boolean
  classProgress: Record<string, LevelCounts>

  /** Format */
  lessonMinutes: number
  lessonTemplate: string
  onLessonLengthChange: (length: string) => void
  onLessonTemplateChange: (template: string) => void
  noTechMode: boolean
  onNoTechModeChange: (value: boolean) => void

  /** Personalize */
  materialsSnapshot: MaterialsSnapshot
  onOpenMaterialsEditor: () => void
  reproducibleLanguage: ReproducibleLanguage
  onLanguageChange: (lang: ReproducibleLanguage) => void
  teacherNotes: string
  onTeacherNotesChange: (notes: string) => void
}

export default function SetupSteps({
  setupMode,
  wizardStep,
  onSetupModeChange,
  onGoToStep,
  classContextFilters,
  onClassContextChange,
  sidebarFilters,
  bookmarkedResources,
  userMaterials,
  onUserMaterialsChange,
  onBrowseAll,
  includeAssessmentData,
  onIncludeAssessmentDataChange,
  hasClassProgress,
  classProgress,
  lessonMinutes,
  lessonTemplate,
  onLessonLengthChange,
  onLessonTemplateChange,
  noTechMode,
  onNoTechModeChange,
  materialsSnapshot,
  onOpenMaterialsEditor,
  reproducibleLanguage,
  onLanguageChange,
  teacherNotes,
  onTeacherNotesChange,
}: SetupStepsProps) {
  const isWizard = setupMode === "wizard"
  const templateDef = getTemplate(lessonTemplate)

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
              onClick={() => onSetupModeChange(mode)}
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
                onClick={() => done && onGoToStep(i)}
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
          classContextFilters.grade && `Grade ${classContextFilters.grade}`,
          classContextFilters.subject,
          classContextFilters.province,
          classContextFilters.topic && `“${classContextFilters.topic}”`,
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
              onClick={() => onGoToStep(row.step)}
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
              onClick={() => onGoToStep(1)}
              className="font-semibold underline hover:text-amber-900"
            >
              Pick resources
            </button>
          </p>
        </div>
      )}
    </div>
  )

  return (
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
        <PlanContextBar filters={classContextFilters} setFilters={onClassContextChange} />
      </div>
      )}

      {/* Step 2 — resources (all cards visible at once in all-options mode) */}
      {(!isWizard || wizardStep === 1) && (<>
      {/* Unified resource picker: search / recommended / add-my-own + tray */}
      <PlanResourcePicker
        filters={classContextFilters}
        sidebarFilters={sidebarFilters}
        bookmarkedResources={bookmarkedResources}
        userMaterials={userMaterials}
        onUserMaterialsChange={onUserMaterialsChange}
        onBrowseAll={onBrowseAll}
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
            onChange={(e) => onIncludeAssessmentDataChange(e.target.checked)}
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
              onChange={(e) => onLessonLengthChange(`${e.target.value} minutes`)}
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
                    onClick={() => onLessonTemplateChange(tmpl.apiKey)}
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
              onChange={(e) => onNoTechModeChange(e.target.checked)}
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
          onEdit={onOpenMaterialsEditor}
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
                    onClick={() => onLanguageChange(lang)}
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
          onChange={(e) => onTeacherNotesChange(e.target.value)}
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
  )
}
