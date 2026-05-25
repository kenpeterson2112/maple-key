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

// ---- Proficiency bands (Growing Success, Ontario Ministry of Education) ----
// Level 3-4: considerable to thorough understanding → "strong"
// Level 2:   some understanding                     → "developing"
// Level 1:   limited understanding                  → "needsSupport"
export type Band = "strong" | "developing" | "needsSupport"

export const BAND_ORDER: Band[] = ["strong", "developing", "needsSupport"]

export const BAND_META: Record<Band, { label: string; phrase: string; barClass: string; textClass: string }> = {
  strong: {
    label: "Considerable to thorough understanding",
    phrase: "demonstrate a considerable or thorough understanding",
    barClass: "bg-emerald-400",
    textClass: "text-emerald-700",
  },
  developing: {
    label: "Some understanding",
    phrase: "show some understanding",
    barClass: "bg-amber-400",
    textClass: "text-amber-700",
  },
  needsSupport: {
    label: "Limited understanding",
    phrase: "demonstrate limited understanding and may need more support",
    barClass: "bg-red-400",
    textClass: "text-red-600",
  },
}

// With 2 questions per expectation: 2/2 → strong, 1/2 → developing, 0/2 → needsSupport.
export function bandFor(correct: number, total: number): Band {
  if (total <= 0 || correct <= 0) return "needsSupport"
  if (correct === total) return "strong"
  return "developing"
}
