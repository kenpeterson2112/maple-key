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

    let q: AssessmentQuestion | null = null
    if (item.type === "multiple-choice") {
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
    } else if (item.type === "true-false") {
      if (typeof item.correct === "boolean") {
        q = { id: "", code, type: "true-false", prompt: item.prompt, correct: item.correct, explanation }
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

// ---- Proficiency bands ----
// Two bands today; adding "developing" is a one-line change here + in bandFor.
export type Band = "strong" | "needsSupport"

export const BAND_ORDER: Band[] = ["strong", "needsSupport"]

export const BAND_META: Record<Band, { label: string; phrase: string; barClass: string; textClass: string }> = {
  strong: { label: "Strong grasp", phrase: "show a strong grasp", barClass: "bg-emerald-400", textClass: "text-emerald-700" },
  needsSupport: { label: "Needs support", phrase: "need more support", barClass: "bg-amber-400", textClass: "text-amber-700" },
}

// A student "shows a strong grasp" of an expectation only when they got all of its
// questions correct; otherwise they need more support.
export function bandFor(correct: number, total: number): Band {
  if (total <= 0) return "needsSupport"
  return correct === total ? "strong" : "needsSupport"
}
