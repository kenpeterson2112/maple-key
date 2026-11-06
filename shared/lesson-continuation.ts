// "Continue from this lesson": the trimmed summary of a previous lesson that
// rides along with a generate-lesson request. Shared by the client (which
// builds it), api/generate-lesson.ts (which re-clamps and formats it) and the
// manual-fallback prompt in src/components/lesson-planner/lesson-export.ts, so
// the prompt block is written once. Spec: LESSON_SPEC.md → "Continuation lessons".

export interface ContinuationLevelCounts {
  level1: number
  level2: number
  level3: number
  level4: number
}

export interface ContinuationContext {
  title: string
  grade?: string
  subject?: string
  learningGoal?: string
  successCriteria?: string[]
  curriculumCodes?: string[]
  /** Short excerpts of what students did (Minds On / Action, or template phases). */
  activities?: string[]
  /** How the lesson was planned to end: consolidation content. */
  consolidation?: string
  consolidationAssessment?: string
  reflectionCheckpoint?: string
  resourceTitles?: string[]
  /** Quick-check totals per expectation, when the teacher recorded any. */
  quickCheck?: Record<string, ContinuationLevelCounts>
}

/** Per-field caps. Consolidation is the one that gets long, so it's tightest
 *  relative to its usual size. Applied on both ends. */
export const CONTINUATION_CAPS = {
  title: 200,
  grade: 20,
  subject: 60,
  learningGoal: 400,
  criterion: 200,
  criteriaCount: 6,
  code: 30,
  codesCount: 20,
  activity: 300,
  activitiesCount: 6,
  consolidation: 800,
  consolidationAssessment: 400,
  reflectionCheckpoint: 300,
  resourceTitle: 160,
  resourcesCount: 10,
  quickCheckCodes: 20,
} as const

/** Trims to `max` characters on a word boundary where possible. */
export function clip(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined
  const s = value.replace(/\s+/g, " ").trim()
  if (!s) return undefined
  if (s.length <= max) return s
  const cut = s.slice(0, max - 1)
  const space = cut.lastIndexOf(" ")
  return `${space > max * 0.6 ? cut.slice(0, space) : cut}…`
}

function clipList(value: unknown, itemMax: number, countMax: number): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out = value
    .map((v) => clip(v, itemMax))
    .filter((v): v is string => !!v)
    .slice(0, countMax)
  return out.length > 0 ? out : undefined
}

function toCount(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0
}

/** Normalizes untrusted input into a capped ContinuationContext, or null. */
export function clampContinuation(raw: unknown): ContinuationContext | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const C = CONTINUATION_CAPS
  const title = clip(r.title, C.title)
  if (!title) return null

  let quickCheck: Record<string, ContinuationLevelCounts> | undefined
  if (r.quickCheck && typeof r.quickCheck === "object") {
    const entries = Object.entries(r.quickCheck as Record<string, unknown>)
      .slice(0, C.quickCheckCodes)
      .map(([code, c]) => {
        const k = (c ?? {}) as Record<string, unknown>
        const counts = {
          level1: toCount(k.level1),
          level2: toCount(k.level2),
          level3: toCount(k.level3),
          level4: toCount(k.level4),
        }
        return [clip(code, C.code), counts] as const
      })
      .filter(([code, c]) => !!code && c.level1 + c.level2 + c.level3 + c.level4 > 0)
    if (entries.length > 0) quickCheck = Object.fromEntries(entries)
  }

  const ctx: ContinuationContext = {
    title,
    grade: clip(r.grade, C.grade),
    subject: clip(r.subject, C.subject),
    learningGoal: clip(r.learningGoal, C.learningGoal),
    successCriteria: clipList(r.successCriteria, C.criterion, C.criteriaCount),
    curriculumCodes: clipList(r.curriculumCodes, C.code, C.codesCount),
    activities: clipList(r.activities, C.activity, C.activitiesCount),
    consolidation: clip(r.consolidation, C.consolidation),
    consolidationAssessment: clip(r.consolidationAssessment, C.consolidationAssessment),
    reflectionCheckpoint: clip(r.reflectionCheckpoint, C.reflectionCheckpoint),
    resourceTitles: clipList(r.resourceTitles, C.resourceTitle, C.resourcesCount),
    quickCheck,
  }
  for (const key of Object.keys(ctx) as (keyof ContinuationContext)[]) {
    if (ctx[key] === undefined) delete ctx[key]
  }
  return ctx
}

/**
 * The PREVIOUS LESSON prompt block. Deliberately context, not rules: no
 * directive about how to open, which codes to target or what to avoid. The
 * teacher's notes and choices take priority.
 */
export function formatContinuationBlock(ctx: ContinuationContext | null | undefined): string {
  if (!ctx) return ""
  const lines: string[] = [`  Title: ${ctx.title}`]
  if (ctx.grade || ctx.subject) lines.push(`  Class: ${[ctx.grade && `Grade ${ctx.grade}`, ctx.subject].filter(Boolean).join(" ")}`)
  if (ctx.learningGoal) lines.push(`  Learning goal: ${ctx.learningGoal}`)
  if (ctx.successCriteria?.length) lines.push(`  Success criteria: ${ctx.successCriteria.join("; ")}`)
  if (ctx.curriculumCodes?.length) lines.push(`  Expectations covered: ${ctx.curriculumCodes.join(", ")}`)
  if (ctx.activities?.length) lines.push(`  What students did:\n${ctx.activities.map((a) => `    - ${a}`).join("\n")}`)
  if (ctx.consolidation) lines.push(`  Planned consolidation: ${ctx.consolidation}`)
  if (ctx.consolidationAssessment) lines.push(`  Planned assessment: ${ctx.consolidationAssessment}`)
  if (ctx.reflectionCheckpoint) lines.push(`  Reflection checkpoint: ${ctx.reflectionCheckpoint}`)
  if (ctx.resourceTitles?.length) lines.push(`  Resources used: ${ctx.resourceTitles.join("; ")}`)
  if (ctx.quickCheck) {
    const qc = Object.entries(ctx.quickCheck)
      .map(([code, c]) => `    ${code}: ${c.level4} surpassing, ${c.level3} meeting, ${c.level2} approaching, ${c.level1} needs critical attention`)
      .join("\n")
    lines.push(`  Quick-check results from that lesson:\n${qc}`)
  }
  return `PREVIOUS LESSON — here is what the class just did. Use it as context to build naturally from it. The teacher's notes and choices take priority: if the teacher notes say the class got somewhere different from the planned consolidation below, go with the teacher notes.
${lines.join("\n")}`
}
