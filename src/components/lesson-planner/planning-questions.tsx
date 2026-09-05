"use client"

import { useEffect, useRef, useState } from "react"

/**
 * The planning-questions step of the lesson planner: the closed answer-format
 * enum, the state backing the one-question-at-a-time flow, and the view.
 *
 * This is the first call of the two-call generation flow — questions are asked
 * and answered here, then the answers are handed to the lesson-generation call.
 * The two calls stay separate; nothing in this module talks to the API.
 *
 * The card is deliberately teacher-first: reasoning bullets, then an open text
 * box, and only then — behind an explicit "Show suggestions" — the model's
 * options, revealed one at a time on a timer. The delay is the point. A teacher
 * who sees three plausible answers before they have formed their own tends to
 * pick one; the wait buys them the few seconds it takes to commit to their own
 * thinking first.
 */

/** Closed enum — extend it here rather than introducing free-form formats. */
export type PlanningAnswerFormat = "single-select" | "this-that-both" | "multi-select"

/** Closed enum, mirrored in api/generate-questions.ts. */
export type ReasoningBulletType = "pedagogical" | "assessment"

export interface ReasoningBullet {
  type: ReasoningBulletType
  text: string
}

export interface PlanningOption {
  label: string
  /** One sentence on how picking this changes the lesson. May be empty. */
  reasoning: string
}

export interface PlanningQuestion {
  id: string
  prompt: string
  rationale: string
  answerFormat: PlanningAnswerFormat
  reasoning_bullets: ReasoningBullet[]
  options: PlanningOption[]
}

export interface PlanningAnswer {
  questionId: string
  questionPrompt: string
  answer: string
}

/**
 * Resolve one question's answer. The typed text wins over a selected
 * suggestion: the teacher's own words are the whole point of the step, and a
 * suggestion they clicked while drafting is a reference, not a retraction.
 */
export function resolveAnswer(
  questionId: string,
  selections: Record<string, string[]>,
  openText: Record<string, string>,
): string[] {
  const typed = openText[questionId]?.trim()
  if (typed) return [typed]
  return selections[questionId] ?? []
}

/**
 * Reveal delays, in seconds, before jitter: ~3.5s for the first suggestion,
 * ~2.5s for the second, then 1s apiece. Every delay gets ±0.5s of jitter so
 * the sequence reads as thinking rather than as a progress bar.
 */
const REVEAL_DELAYS_SEC = [3.5, 2.5]
const REVEAL_TAIL_DELAY_SEC = 1
const REVEAL_JITTER_SEC = 0.5

function revealDelayMs(alreadyVisible: number): number {
  const base = REVEAL_DELAYS_SEC[alreadyVisible] ?? REVEAL_TAIL_DELAY_SEC
  const jittered = base + (Math.random() * 2 - 1) * REVEAL_JITTER_SEC
  return Math.max(0.25, jittered) * 1000
}

/**
 * State for the questions step. Entering the step resets position, any open
 * response text, and the suggestion reveal — so a re-ask never inherits the
 * previous run's answers or its already-spent thinking time.
 */
export function usePlanningQuestions() {
  const [showQuestionsStep, setShowQuestionsStep] = useState(false)
  const [planningQuestions, setPlanningQuestions] = useState<PlanningQuestion[]>([])
  const [questionSelections, setQuestionSelections] = useState<Record<string, string[]>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [openResponseValues, setOpenResponseValues] = useState<Record<string, string>>({})
  /** Per question: has the teacher asked to see the suggestions? Persists across navigation. */
  const [showingSuggestions, setShowingSuggestions] = useState<Record<string, boolean>>({})
  /** Per question: how many suggestions have finished revealing. Also persists. */
  const [suggestionVisibility, setSuggestionVisibility] = useState<Record<string, number>>({})

  useEffect(() => {
    if (showQuestionsStep) {
      setCurrentQuestionIndex(0)
      setOpenResponseValues({})
      setShowingSuggestions({})
      setSuggestionVisibility({})
    }
  }, [showQuestionsStep])

  return {
    showQuestionsStep,
    setShowQuestionsStep,
    planningQuestions,
    setPlanningQuestions,
    questionSelections,
    setQuestionSelections,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    openResponseValues,
    setOpenResponseValues,
    showingSuggestions,
    setShowingSuggestions,
    suggestionVisibility,
    setSuggestionVisibility,
  }
}

export type PlanningQuestionsState = ReturnType<typeof usePlanningQuestions>

interface PlanningQuestionsStepProps {
  state: PlanningQuestionsState
  /**
   * Commit the current question and move on — to the next question, or to
   * lesson generation when this was the last one. Owned by the planner because
   * finishing the step kicks off the second API call.
   */
  onAdvance: (questionId: string) => void
}

export function PlanningQuestionsStep({ state, onAdvance }: PlanningQuestionsStepProps) {
  const {
    planningQuestions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    questionSelections,
    setQuestionSelections,
    openResponseValues,
    setOpenResponseValues,
    showingSuggestions,
    setShowingSuggestions,
    suggestionVisibility,
    setSuggestionVisibility,
  } = state

  const q = planningQuestions[currentQuestionIndex]

  // The "Both" choice is implicit in this-that-both: the model gives two real
  // options and the UI adds the third itself.
  const opts: PlanningOption[] =
    q?.answerFormat === "this-that-both"
      ? [
          ...q.options,
          { label: "Both", reasoning: "Sequence the two so the first sets up the second." },
        ]
      : q?.options ?? []

  const qId = q?.id ?? ""
  const isExpanded = showingSuggestions[qId] ?? false
  const visibleCount = suggestionVisibility[qId] ?? 0
  const isRevealing = isExpanded && visibleCount < opts.length

  // One timer per reveal, chained through visibleCount. Because the count lives
  // in step state rather than here, suggestions the teacher already waited for
  // stay revealed when they navigate back to this question.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isRevealing) return
    timerRef.current = setTimeout(() => {
      setSuggestionVisibility((prev) => ({ ...prev, [qId]: (prev[qId] ?? 0) + 1 }))
    }, revealDelayMs(visibleCount))
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isRevealing, qId, visibleCount, setSuggestionVisibility])

  if (!q) return null

  const isLastQuestion = currentQuestionIndex === planningQuestions.length - 1
  const selections = questionSelections[q.id] ?? []
  const openText = openResponseValues[q.id] ?? ""
  const hasAnswer = openText.trim().length > 0 || selections.length > 0

  const handleSelect = (label: string) => {
    if (q.answerFormat === "multi-select") {
      setQuestionSelections((prev) => {
        const cur = prev[q.id] ?? []
        return {
          ...prev,
          [q.id]: cur.includes(label) ? cur.filter((o) => o !== label) : [...cur, label],
        }
      })
      return
    }
    // Single-answer formats toggle off, so a mis-click is undoable without
    // having to advance and come back.
    setQuestionSelections((prev) => ({
      ...prev,
      [q.id]: prev[q.id]?.[0] === label ? [] : [label],
    }))
  }

  return (
    <>
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentQuestionIndex > 0 && (
            <button
              onClick={() => setCurrentQuestionIndex((i) => i - 1)}
              className="text-sm text-violet-600 hover:text-violet-800 font-medium transition-colors"
            >
              ← Back
            </button>
          )}
          <p className="text-sm font-medium text-violet-700">
            Question {currentQuestionIndex + 1} of {planningQuestions.length}
          </p>
        </div>
        <div className="flex gap-1.5">
          {planningQuestions.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i < currentQuestionIndex
                  ? "bg-violet-400"
                  : i === currentQuestionIndex
                  ? "bg-violet-600"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-xl border-2 border-[#E8D5C4] p-5">
        <p className="font-medium text-[#2C2C2C] mb-1">{q.prompt}</p>
        <p className="text-xs text-[#888] mb-4">{q.rationale}</p>

        {/* Reasoning bullets — what to weigh before answering. Assessment
            bullets are about THIS class, so they get their own tint. */}
        {q.reasoning_bullets.length > 0 && (
          <ul className="flex flex-col gap-2 mb-4">
            {q.reasoning_bullets.map((bullet, i) => (
              <li
                key={i}
                className={`text-sm rounded-lg px-3 py-2 border ${
                  bullet.type === "assessment"
                    ? "bg-sky-50 border-sky-200 text-sky-900"
                    : "bg-muted/30 border-border text-[#2C2C2C]"
                }`}
              >
                {bullet.type === "assessment" && (
                  <span className="block text-xs font-semibold text-sky-700 mb-0.5">
                    Your class
                  </span>
                )}
                {bullet.text}
              </li>
            ))}
          </ul>
        )}

        {/* Open text — the primary interaction. No auto-submit. */}
        <label htmlFor={`planning-answer-${q.id}`} className="block text-xs font-medium text-violet-700 mb-2">
          Your answer
        </label>
        <textarea
          id={`planning-answer-${q.id}`}
          value={openText}
          onChange={(e) => setOpenResponseValues((prev) => ({ ...prev, [q.id]: e.target.value }))}
          placeholder="Type your answer or approach here…"
          rows={3}
          className="w-full px-3 py-2 border-2 border-[#E8D5C4] rounded-lg bg-white text-sm text-[#2C2C2C] resize-y focus:outline-none focus:border-violet-500"
        />

        {/* Suggestions — collapsed by default, revealed on a timer. */}
        <div className="mt-4">
          {!isExpanded ? (
            <button
              onClick={() => setShowingSuggestions((prev) => ({ ...prev, [q.id]: true }))}
              className="text-sm font-medium text-violet-600 hover:text-violet-800 transition-colors"
            >
              Show suggestions
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-[#888]">
                {isRevealing ? "Thinking through the options…" : "What others tried"}
              </p>

              {opts.slice(0, visibleCount).map((opt) => {
                const isSelected =
                  q.answerFormat === "multi-select"
                    ? selections.includes(opt.label)
                    : selections[0] === opt.label

                return (
                  <button
                    key={opt.label}
                    onClick={() => handleSelect(opt.label)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm border-2 transition-colors motion-safe:animate-fade-in ${
                      isSelected
                        ? "bg-violet-600 border-violet-600 text-white"
                        : "bg-white border-[#E8D5C4] text-[#2C2C2C] hover:border-violet-400"
                    }`}
                  >
                    <span className="block font-medium">{opt.label}</span>
                    {opt.reasoning && (
                      <span
                        className={`block text-xs mt-1 ${isSelected ? "text-white/80" : "text-[#888]"}`}
                      >
                        {opt.reasoning}
                      </span>
                    )}
                  </button>
                )
              })}

              {/* Skeleton stands in for the suggestion still being "thought
                  about", so the container does not jump as each one lands. */}
              {isRevealing && (
                <div
                  aria-hidden="true"
                  className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-[#E8D5C4] motion-safe:animate-pulse"
                >
                  <div className="h-3 w-1/3 rounded bg-muted" />
                  <div className="h-2.5 w-2/3 rounded bg-muted mt-2" />
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onAdvance(q.id)}
          disabled={!hasAnswer}
          className="mt-4 w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-[#888] disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isLastQuestion ? "Generate Lesson Plan" : "Continue →"}
        </button>
      </div>
    </>
  )
}
