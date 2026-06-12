export type QuestionType = "multiple-choice" | "true-false"

interface BaseQuestion {
  id: string
  code: string | null
  type: QuestionType
  prompt: string
  explanation?: string
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple-choice"
  options: string[]
  correctIndex: number
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: "true-false"
  correct: boolean
}

export type AssessmentQuestion = MultipleChoiceQuestion | TrueFalseQuestion

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0
}

// Turns arbitrary parsed JSON (API response, pasted text, dev mock) into well-formed
// questions, dropping anything malformed. An empty result signals "use the fallback".
export function sanitizeQuestions(raw: unknown): AssessmentQuestion[] {
  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { questions?: unknown })?.questions)
      ? (raw as { questions: unknown[] }).questions
      : []

  const out: AssessmentQuestion[] = []
  const usedIds = new Set<string>()

  arr.forEach((item: any, i: number) => {
    if (!item || typeof item !== "object" || !isNonEmptyString(item.prompt)) return
    const code = isNonEmptyString(item.code) ? item.code : null
    const explanation = isNonEmptyString(item.explanation) ? item.explanation : undefined

    // Normalise type names — models sometimes use underscores, camelCase, or abbreviations.
    const rawType = typeof item.type === "string" ? item.type.toLowerCase().replace(/[\s_]/g, "-") : ""
    const ismc = rawType === "multiple-choice" || rawType === "multiplechoice" || rawType === "mc"
    const istf = rawType === "true-false" || rawType === "truefalse" || rawType === "tf"

    let q: AssessmentQuestion | null = null
    if (ismc) {
      const options = Array.isArray(item.options) ? item.options.filter(isNonEmptyString) : []
      const correctIndex = Number(item.correctIndex)
      if (
        options.length >= 2 &&
        options.length <= 6 &&
        Number.isInteger(correctIndex) &&
        correctIndex >= 0 &&
        correctIndex < options.length
      ) {
        q = { id: "", code, type: "multiple-choice", prompt: item.prompt, options, correctIndex, explanation }
      }
    } else if (istf) {
      // Accept boolean, string "true"/"false", or 1/0.
      const c = item.correct
      const correct = typeof c === "boolean" ? c : c === "true" || c === 1 ? true : c === "false" || c === 0 ? false : null
      if (correct !== null) {
        q = { id: "", code, type: "true-false", prompt: item.prompt, correct, explanation }
      }
    }
    if (!q) return

    let id = isNonEmptyString(item.id) ? item.id : `${code ?? "q"}-${q.type}-${i}`
    while (usedIds.has(id)) id = `${id}-${i}`
    usedIds.add(id)
    q.id = id
    out.push(q)
  })

  return out
}

// ---- Proficiency levels (Growing Success, Ontario Ministry of Education) ----
// Level 4: surpassing the standard
// Level 3: meeting the provincial standard
// Level 2: approaching the standard
// Level 1: needs critical attention
export type ProficiencyLevel = "level1" | "level2" | "level3" | "level4"

export const LEVEL_ORDER: ProficiencyLevel[] = ["level1", "level2", "level3", "level4"]

export const LEVEL_META: Record<ProficiencyLevel, { label: string; phrase: string; barClass: string; textClass: string }> = {
  level1: {
    label: "Needs critical attention",
    phrase: "demonstrate limited understanding and need critical support",
    barClass: "bg-signal-1",
    textClass: "text-signal-1-foreground",
  },
  level2: {
    label: "Approaching the standard",
    phrase: "show some understanding but are still approaching the standard",
    barClass: "bg-signal-2",
    textClass: "text-signal-2-foreground",
  },
  level3: {
    label: "Meeting the provincial standard",
    phrase: "demonstrate understanding that meets the provincial standard",
    barClass: "bg-signal-3",
    textClass: "text-signal-3-foreground",
  },
  level4: {
    label: "Surpassing the standard",
    phrase: "demonstrate understanding that surpasses the provincial standard",
    barClass: "bg-signal-4",
    textClass: "text-signal-4-foreground",
  },
}

// With 2 questions per expectation: 2/2 → level4, 1/2 → level2, 0/2 → level1.
// Individual 2-question checks are too noisy to claim a genuine 4-level result —
// level3 is reached via self-rating and dev-seed data instead.
export function levelFor(correct: number, total: number): ProficiencyLevel {
  if (total <= 0 || correct <= 0) return "level1"
  if (correct === total) return "level4"
  return "level2"
}
