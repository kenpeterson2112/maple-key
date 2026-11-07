// One subject → colour mapping for every surface that codes by subject
// (resource cards, lesson overview cards). Colours come from the --subject-*
// tokens in src/index.css, which carry a light and a dark value each.
//
// The class strings are written out in full rather than built from the key:
// Tailwind only generates utilities it can find verbatim in the source.

export interface SubjectTheme {
  /** Solid swatch: the card's accent bar, a dot. */
  dot: string
  /** Filled button or badge, with readable text on it. */
  badge: string
  /** Soft panel background. */
  bg: string
  /** Panel border. */
  border: string
  /** Subject-coloured text, readable on the panel background. */
  label: string
}

const THEMES = {
  math: {
    dot: "bg-subject-math",
    badge: "bg-subject-math text-subject-foreground",
    bg: "bg-subject-math/10",
    border: "border-subject-math/40",
    label: "text-subject-math",
  },
  science: {
    dot: "bg-subject-science",
    badge: "bg-subject-science text-subject-foreground",
    bg: "bg-subject-science/10",
    border: "border-subject-science/40",
    label: "text-subject-science",
  },
  fsl: {
    dot: "bg-subject-fsl",
    badge: "bg-subject-fsl text-subject-foreground",
    bg: "bg-subject-fsl/10",
    border: "border-subject-fsl/40",
    label: "text-subject-fsl",
  },
  language: {
    dot: "bg-subject-language",
    badge: "bg-subject-language text-subject-foreground",
    bg: "bg-subject-language/10",
    border: "border-subject-language/40",
    label: "text-subject-language",
  },
  social: {
    dot: "bg-subject-social",
    badge: "bg-subject-social text-subject-foreground",
    bg: "bg-subject-social/10",
    border: "border-subject-social/40",
    label: "text-subject-social",
  },
  health: {
    dot: "bg-subject-health",
    badge: "bg-subject-health text-subject-foreground",
    bg: "bg-subject-health/10",
    border: "border-subject-health/40",
    label: "text-subject-health",
  },
  arts: {
    dot: "bg-subject-arts",
    badge: "bg-subject-arts text-subject-foreground",
    bg: "bg-subject-arts/10",
    border: "border-subject-arts/40",
    label: "text-subject-arts",
  },
  // Anything unrecognised wears the brand colour.
  other: {
    dot: "bg-primary",
    badge: "bg-primary text-primary-foreground",
    bg: "bg-primary-tint",
    border: "border-primary/40",
    label: "text-primary-strong",
  },
} satisfies Record<string, SubjectTheme>

// Order matters: "FSL" is checked before the broader language match, and
// History / Geography share the Social Studies colour on cards.
function subjectFamily(subject: string): keyof typeof THEMES {
  const s = (subject || "").toLowerCase()
  if (s.includes("math")) return "math"
  if (s.includes("science")) return "science"
  if (s.includes("fsl")) return "fsl"
  if (s.includes("language") || s.includes("english") || s.includes("french") || s.includes("literacy")) return "language"
  if (s.includes("social") || s.includes("history") || s.includes("geo")) return "social"
  if (s.includes("health") || s.includes("physical")) return "health"
  if (s.includes("art") || s.includes("music") || s.includes("drama") || s.includes("dance")) return "arts"
  return "other"
}

export function getSubjectTheme(subject: string): SubjectTheme {
  return THEMES[subjectFamily(subject)]
}
