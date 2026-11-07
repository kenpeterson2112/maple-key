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

// Section colours draw on the categorical --hue-* tokens (src/index.css), so
// they follow dark mode. Each entry is written out in full because Tailwind
// only generates classes it finds verbatim in the source.
const SECTION_HUES = {
  blue: {
    border: "border-hue-blue",
    accent: "text-hue-blue",
    pillBg: "bg-hue-blue/10",
    pillText: "text-hue-blue",
    hoverBg: "hover:bg-hue-blue/10",
    focusBorder: "focus:border-hue-blue",
    doneBg: "bg-hue-blue",
    doneHover: "hover:bg-hue-blue/90",
  },
  green: {
    border: "border-hue-green",
    accent: "text-hue-green",
    pillBg: "bg-hue-green/10",
    pillText: "text-hue-green",
    hoverBg: "hover:bg-hue-green/10",
    focusBorder: "focus:border-hue-green",
    doneBg: "bg-hue-green",
    doneHover: "hover:bg-hue-green/90",
  },
  violet: {
    border: "border-hue-violet",
    accent: "text-hue-violet",
    pillBg: "bg-hue-violet/10",
    pillText: "text-hue-violet",
    hoverBg: "hover:bg-hue-violet/10",
    focusBorder: "focus:border-hue-violet",
    doneBg: "bg-hue-violet",
    doneHover: "hover:bg-hue-violet/90",
  },
  amber: {
    border: "border-hue-amber",
    accent: "text-hue-amber",
    pillBg: "bg-hue-amber/10",
    pillText: "text-hue-amber",
    hoverBg: "hover:bg-hue-amber/10",
    focusBorder: "focus:border-hue-amber",
    doneBg: "bg-hue-amber",
    doneHover: "hover:bg-hue-amber/90",
  },
  teal: {
    border: "border-hue-teal",
    accent: "text-hue-teal",
    pillBg: "bg-hue-teal/10",
    pillText: "text-hue-teal",
    hoverBg: "hover:bg-hue-teal/10",
    focusBorder: "focus:border-hue-teal",
    doneBg: "bg-hue-teal",
    doneHover: "hover:bg-hue-teal/90",
  },
  cyan: {
    border: "border-hue-cyan",
    accent: "text-hue-cyan",
    pillBg: "bg-hue-cyan/10",
    pillText: "text-hue-cyan",
    hoverBg: "hover:bg-hue-cyan/10",
    focusBorder: "focus:border-hue-cyan",
    doneBg: "bg-hue-cyan",
    doneHover: "hover:bg-hue-cyan/90",
  },
  orange: {
    border: "border-hue-orange",
    accent: "text-hue-orange",
    pillBg: "bg-hue-orange/10",
    pillText: "text-hue-orange",
    hoverBg: "hover:bg-hue-orange/10",
    focusBorder: "focus:border-hue-orange",
    doneBg: "bg-hue-orange",
    doneHover: "hover:bg-hue-orange/90",
  },
  rose: {
    border: "border-hue-rose",
    accent: "text-hue-rose",
    pillBg: "bg-hue-rose/10",
    pillText: "text-hue-rose",
    hoverBg: "hover:bg-hue-rose/10",
    focusBorder: "focus:border-hue-rose",
    doneBg: "bg-hue-rose",
    doneHover: "hover:bg-hue-rose/90",
  },
  indigo: {
    border: "border-hue-indigo",
    accent: "text-hue-indigo",
    pillBg: "bg-hue-indigo/10",
    pillText: "text-hue-indigo",
    hoverBg: "hover:bg-hue-indigo/10",
    focusBorder: "focus:border-hue-indigo",
    doneBg: "bg-hue-indigo",
    doneHover: "hover:bg-hue-indigo/90",
  },
  slate: {
    border: "border-hue-slate",
    accent: "text-hue-slate",
    pillBg: "bg-hue-slate/10",
    pillText: "text-hue-slate",
    hoverBg: "hover:bg-hue-slate/10",
    focusBorder: "focus:border-hue-slate",
    doneBg: "bg-hue-slate",
    doneHover: "hover:bg-hue-slate/90",
  },
} satisfies Record<string, SectionColors>

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
  displayName: string
  shortName: string
  description: string
  apiKey: string
  sections: TemplateSectionDef[]
}

export const LESSON_TEMPLATES: LessonTemplateDef[] = [
  {
    id: "3-part",
    name: "3-Part Lesson",
    displayName: "3-Part Lesson",
    shortName: "3-Part",
    description: "Ontario's classic: activate prior knowledge, explore & apply, then consolidate.",
    apiKey: "3-Part Lesson",
    sections: [
      {
        id: "mindsOn", label: "Minds On", subtitle: "Activating Prior Knowledge",
        timeWeight: 0.17, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.blue,
      },
      {
        id: "action", label: "Action", subtitle: "Exploring & Applying",
        timeWeight: 0.58, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.green,
      },
      {
        id: "consolidation", label: "Consolidation", subtitle: "Reflecting & Connecting",
        timeWeight: 0.25, calloutLabel: "Assessment Note", calloutIsAssessment: true,
        colors: SECTION_HUES.violet,
      },
    ],
  },
  {
    id: "5e",
    name: "5E Model",
    displayName: "Inquiry Lesson",
    shortName: "5E",
    description: "Inquiry-rich constructivist cycle with strong evidence base for student-led discovery.",
    apiKey: "5E Model",
    sections: [
      {
        id: "engage", label: "Engage", subtitle: "Spark Curiosity",
        timeWeight: 0.10, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.amber,
      },
      {
        id: "explore", label: "Explore", subtitle: "Investigate & Discover",
        timeWeight: 0.25, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.teal,
      },
      {
        id: "explain", label: "Explain", subtitle: "Connect to Concepts",
        timeWeight: 0.20, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.cyan,
      },
      {
        id: "elaborate", label: "Elaborate", subtitle: "Deepen & Extend",
        timeWeight: 0.30, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.green,
      },
      {
        id: "evaluate", label: "Evaluate", subtitle: "Reflect & Assess",
        timeWeight: 0.15, calloutLabel: "Assessment Note", calloutIsAssessment: true,
        colors: SECTION_HUES.violet,
      },
    ],
  },
  {
    id: "hunter",
    name: "Madeline Hunter",
    displayName: "Direct Instruction",
    shortName: "Hunter",
    description: "Structured direct instruction cycle. Clear and beginner-friendly for new skill introduction.",
    apiKey: "Madeline Hunter",
    sections: [
      {
        id: "anticipatorySet", label: "Anticipatory Set", subtitle: "Hook & Motivation",
        timeWeight: 0.10, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.orange,
      },
      {
        id: "directInstruction", label: "Direct Instruction", subtitle: "Input & Modeling",
        timeWeight: 0.20, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.blue,
      },
      {
        id: "checkForUnderstanding", label: "Check for Understanding", subtitle: "Gauge & Adjust",
        timeWeight: 0.10, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.amber,
      },
      {
        id: "guidedPractice", label: "Guided Practice", subtitle: "We Do Together",
        timeWeight: 0.25, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.cyan,
      },
      {
        id: "independentPractice", label: "Independent Practice", subtitle: "You Do",
        timeWeight: 0.25, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.green,
      },
      {
        id: "closure", label: "Closure", subtitle: "Wrap Up & Reflect",
        timeWeight: 0.10, calloutLabel: "Assessment Note", calloutIsAssessment: true,
        colors: SECTION_HUES.slate,
      },
    ],
  },
  {
    id: "claass",
    name: "CLAASS",
    displayName: "Engagement Lesson",
    shortName: "CLAASS",
    description: "Engagement-centered: connects through active, collaborative, inquiry-driven phases.",
    apiKey: "CLAASS",
    sections: [
      {
        id: "connect", label: "Connect", subtitle: "Activate Prior Knowledge",
        timeWeight: 0.15, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.violet,
      },
      {
        id: "launch", label: "Launch", subtitle: "Introduce the Concept",
        timeWeight: 0.15, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.indigo,
      },
      {
        id: "activate", label: "Activate", subtitle: "Engage with Content",
        timeWeight: 0.20, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.teal,
      },
      {
        id: "apply", label: "Apply", subtitle: "Practice & Deepen",
        timeWeight: 0.25, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.green,
      },
      {
        id: "share", label: "Share", subtitle: "Collaborate & Discuss",
        timeWeight: 0.15, calloutLabel: "Differentiation", calloutIsAssessment: false,
        colors: SECTION_HUES.orange,
      },
      {
        id: "synthesize", label: "Synthesize", subtitle: "Reflect & Consolidate",
        timeWeight: 0.10, calloutLabel: "Assessment Note", calloutIsAssessment: true,
        colors: SECTION_HUES.rose,
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
