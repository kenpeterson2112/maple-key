export type TemplateId = "3-part" | "5e" | "hunter" | "claass"

export interface SectionColors {
  border: string
  accent: string
  pillBg: string
  pillText: string
  hoverBg: string
  focusBorder: string
  doneBg: string
  doneHover: string
}

export interface TemplateSectionDef {
  id: string
  label: string
  subtitle: string
  timeWeight: number
  calloutLabel: string
  calloutIsAssessment: boolean
  colors: SectionColors
}

export interface LessonTemplateDef {
  id: TemplateId
  name: string
  shortName: string
  description: string
  apiKey: string
  sections: TemplateSectionDef[]
}

export const LESSON_TEMPLATES: LessonTemplateDef[] = [
  {
    id: "3-part",
    name: "3-Part Lesson",
    shortName: "3-Part",
    description: "Ontario's classic: activate prior knowledge, explore & apply, then consolidate.",
    apiKey: "3-Part Lesson",
    sections: [
      {
        id: "mindsOn", label: "Minds On", subtitle: "Activating Prior Knowledge",
        timeWeight: 0.17, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-blue-500", accent: "text-blue-600", pillBg: "bg-blue-100", pillText: "text-blue-700", hoverBg: "hover:bg-blue-50", focusBorder: "focus:border-blue-500", doneBg: "bg-blue-500", doneHover: "hover:bg-blue-600" },
      },
      {
        id: "action", label: "Action", subtitle: "Exploring & Applying",
        timeWeight: 0.58, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-emerald-500", accent: "text-emerald-600", pillBg: "bg-emerald-100", pillText: "text-emerald-700", hoverBg: "hover:bg-emerald-50", focusBorder: "focus:border-emerald-500", doneBg: "bg-emerald-500", doneHover: "hover:bg-emerald-600" },
      },
      {
        id: "consolidation", label: "Consolidation", subtitle: "Reflecting & Connecting",
        timeWeight: 0.25, calloutLabel: "Assessment Note", calloutIsAssessment: true,
        colors: { border: "border-violet-500", accent: "text-violet-600", pillBg: "bg-violet-100", pillText: "text-violet-700", hoverBg: "hover:bg-violet-50", focusBorder: "focus:border-violet-500", doneBg: "bg-violet-500", doneHover: "hover:bg-violet-600" },
      },
    ],
  },
  {
    id: "5e",
    name: "5E Model",
    shortName: "5E",
    description: "Inquiry-rich constructivist cycle with strong evidence base for student-led discovery.",
    apiKey: "5E Model",
    sections: [
      {
        id: "engage", label: "Engage", subtitle: "Spark Curiosity",
        timeWeight: 0.10, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-amber-500", accent: "text-amber-600", pillBg: "bg-amber-100", pillText: "text-amber-700", hoverBg: "hover:bg-amber-50", focusBorder: "focus:border-amber-500", doneBg: "bg-amber-500", doneHover: "hover:bg-amber-600" },
      },
      {
        id: "explore", label: "Explore", subtitle: "Investigate & Discover",
        timeWeight: 0.25, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-teal-500", accent: "text-teal-600", pillBg: "bg-teal-100", pillText: "text-teal-700", hoverBg: "hover:bg-teal-50", focusBorder: "focus:border-teal-500", doneBg: "bg-teal-500", doneHover: "hover:bg-teal-600" },
      },
      {
        id: "explain", label: "Explain", subtitle: "Connect to Concepts",
        timeWeight: 0.20, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-sky-500", accent: "text-sky-600", pillBg: "bg-sky-100", pillText: "text-sky-700", hoverBg: "hover:bg-sky-50", focusBorder: "focus:border-sky-500", doneBg: "bg-sky-500", doneHover: "hover:bg-sky-600" },
      },
      {
        id: "elaborate", label: "Elaborate", subtitle: "Deepen & Extend",
        timeWeight: 0.30, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-emerald-500", accent: "text-emerald-600", pillBg: "bg-emerald-100", pillText: "text-emerald-700", hoverBg: "hover:bg-emerald-50", focusBorder: "focus:border-emerald-500", doneBg: "bg-emerald-500", doneHover: "hover:bg-emerald-600" },
      },
      {
        id: "evaluate", label: "Evaluate", subtitle: "Reflect & Assess",
        timeWeight: 0.15, calloutLabel: "Assessment Note", calloutIsAssessment: true,
        colors: { border: "border-violet-500", accent: "text-violet-600", pillBg: "bg-violet-100", pillText: "text-violet-700", hoverBg: "hover:bg-violet-50", focusBorder: "focus:border-violet-500", doneBg: "bg-violet-500", doneHover: "hover:bg-violet-600" },
      },
    ],
  },
  {
    id: "hunter",
    name: "Madeline Hunter",
    shortName: "Hunter",
    description: "Structured direct instruction cycle. Clear and beginner-friendly for new skill introduction.",
    apiKey: "Madeline Hunter",
    sections: [
      {
        id: "anticipatorySet", label: "Anticipatory Set", subtitle: "Hook & Motivation",
        timeWeight: 0.10, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-orange-500", accent: "text-orange-600", pillBg: "bg-orange-100", pillText: "text-orange-700", hoverBg: "hover:bg-orange-50", focusBorder: "focus:border-orange-500", doneBg: "bg-orange-500", doneHover: "hover:bg-orange-600" },
      },
      {
        id: "directInstruction", label: "Direct Instruction", subtitle: "Input & Modeling",
        timeWeight: 0.25, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-blue-500", accent: "text-blue-600", pillBg: "bg-blue-100", pillText: "text-blue-700", hoverBg: "hover:bg-blue-50", focusBorder: "focus:border-blue-500", doneBg: "bg-blue-500", doneHover: "hover:bg-blue-600" },
      },
      {
        id: "guidedPractice", label: "Guided Practice", subtitle: "We Do Together",
        timeWeight: 0.25, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-cyan-500", accent: "text-cyan-600", pillBg: "bg-cyan-100", pillText: "text-cyan-700", hoverBg: "hover:bg-cyan-50", focusBorder: "focus:border-cyan-500", doneBg: "bg-cyan-500", doneHover: "hover:bg-cyan-600" },
      },
      {
        id: "independentPractice", label: "Independent Practice", subtitle: "You Do",
        timeWeight: 0.30, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-green-500", accent: "text-green-600", pillBg: "bg-green-100", pillText: "text-green-700", hoverBg: "hover:bg-green-50", focusBorder: "focus:border-green-500", doneBg: "bg-green-500", doneHover: "hover:bg-green-600" },
      },
      {
        id: "closure", label: "Closure", subtitle: "Wrap Up & Check Understanding",
        timeWeight: 0.10, calloutLabel: "Assessment Note", calloutIsAssessment: true,
        colors: { border: "border-slate-500", accent: "text-slate-600", pillBg: "bg-slate-100", pillText: "text-slate-700", hoverBg: "hover:bg-slate-50", focusBorder: "focus:border-slate-500", doneBg: "bg-slate-500", doneHover: "hover:bg-slate-600" },
      },
    ],
  },
  {
    id: "claass",
    name: "CLAASS",
    shortName: "CLAASS",
    description: "Engagement-centered: connects through active, collaborative, inquiry-driven phases.",
    apiKey: "CLAASS",
    sections: [
      {
        id: "connect", label: "Connect", subtitle: "Activate Prior Knowledge",
        timeWeight: 0.15, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-purple-500", accent: "text-purple-600", pillBg: "bg-purple-100", pillText: "text-purple-700", hoverBg: "hover:bg-purple-50", focusBorder: "focus:border-purple-500", doneBg: "bg-purple-500", doneHover: "hover:bg-purple-600" },
      },
      {
        id: "launch", label: "Launch", subtitle: "Introduce the Concept",
        timeWeight: 0.15, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-indigo-500", accent: "text-indigo-600", pillBg: "bg-indigo-100", pillText: "text-indigo-700", hoverBg: "hover:bg-indigo-50", focusBorder: "focus:border-indigo-500", doneBg: "bg-indigo-500", doneHover: "hover:bg-indigo-600" },
      },
      {
        id: "activate", label: "Activate", subtitle: "Engage with Content",
        timeWeight: 0.20, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-teal-500", accent: "text-teal-600", pillBg: "bg-teal-100", pillText: "text-teal-700", hoverBg: "hover:bg-teal-50", focusBorder: "focus:border-teal-500", doneBg: "bg-teal-500", doneHover: "hover:bg-teal-600" },
      },
      {
        id: "apply", label: "Apply", subtitle: "Practice & Deepen",
        timeWeight: 0.25, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-green-500", accent: "text-green-600", pillBg: "bg-green-100", pillText: "text-green-700", hoverBg: "hover:bg-green-50", focusBorder: "focus:border-green-500", doneBg: "bg-green-500", doneHover: "hover:bg-green-600" },
      },
      {
        id: "share", label: "Share", subtitle: "Collaborate & Discuss",
        timeWeight: 0.15, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: { border: "border-orange-500", accent: "text-orange-600", pillBg: "bg-orange-100", pillText: "text-orange-700", hoverBg: "hover:bg-orange-50", focusBorder: "focus:border-orange-500", doneBg: "bg-orange-500", doneHover: "hover:bg-orange-600" },
      },
      {
        id: "synthesize", label: "Synthesize", subtitle: "Reflect & Consolidate",
        timeWeight: 0.10, calloutLabel: "Assessment Note", calloutIsAssessment: true,
        colors: { border: "border-rose-500", accent: "text-rose-600", pillBg: "bg-rose-100", pillText: "text-rose-700", hoverBg: "hover:bg-rose-50", focusBorder: "focus:border-rose-500", doneBg: "bg-rose-500", doneHover: "hover:bg-rose-600" },
      },
    ],
  },
]

export function resolveTemplateId(lessonTemplate: string): TemplateId {
  const lower = lessonTemplate.toLowerCase()
  if (lower.includes("5e") || lower === "5e model") return "5e"
  if (lower.includes("hunter") || lower.includes("madeline")) return "hunter"
  if (lower.includes("claass")) return "claass"
  return "3-part"
}

export function getTemplate(lessonTemplate: string): LessonTemplateDef {
  const id = resolveTemplateId(lessonTemplate)
  return LESSON_TEMPLATES.find((t) => t.id === id) ?? LESSON_TEMPLATES[0]
}
