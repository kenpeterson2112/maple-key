"use client"

import { useEffect, useState } from "react"

/**
 * The planning-questions step of the lesson planner: the closed answer-format
 * enum, the state backing the one-question-at-a-time flow, and the view.
 *
 * This is the first call of the two-call generation flow — questions are asked
 * and answered here, then the answers are handed to the lesson-generation call.
 * The two calls stay separate; nothing in this module talks to the API.
 */

/** Closed enum — extend it here rather than introducing free-form formats. */
export type PlanningAnswerFormat = "single-select" | "this-that-both" | "multi-select"

export interface PlanningQuestion {
  id: string
  prompt: string
  rationale: string
  answerFormat: PlanningAnswerFormat
  options: string[]
}

export interface PlanningAnswer {
  questionId: string
  questionPrompt: string
  answer: string
}

/**
 * State for the questions step. Entering the step resets position and any
 * open-response text so a re-ask never inherits the previous run's answers.
 */
export function usePlanningQuestions() {
  const [showQuestionsStep, setShowQuestionsStep] = useState(false)
  const [planningQuestions, setPlanningQuestions] = useState<PlanningQuestion[]>([])
  const [questionSelections, setQuestionSelections] = useState<Record<string, string[]>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [openResponseValues, setOpenResponseValues] = useState<Record<string, string>>({})
  const [showingOpenResponse, setShowingOpenResponse] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (showQuestionsStep) {
      setCurrentQuestionIndex(0)
      setOpenResponseValues({})
      setShowingOpenResponse({})
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
    showingOpenResponse,
    setShowingOpenResponse,
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
  onAdvance: (questionId: string, selectedOpts?: string[]) => void
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
    showingOpenResponse,
    setShowingOpenResponse,
  } = state

  const q = planningQuestions[currentQuestionIndex]
  if (!q) return null

  const isLastQuestion = currentQuestionIndex === planningQuestions.length - 1
  const selections = questionSelections[q.id] ?? []
  const openText = openResponseValues[q.id] ?? ""
  const isOpenActive = showingOpenResponse[q.id] ?? false
  const hasAnswer = selections.length > 0 || (isOpenActive && openText.trim().length > 0)
  const opts = q.answerFormat === "this-that-both" ? [...q.options, "Both"] : q.options

  const handleSelect = (opt: string) => {
    setQuestionSelections((prev) => ({ ...prev, [q.id]: [opt] }))
    setShowingOpenResponse((prev) => ({ ...prev, [q.id]: false }))
    setTimeout(() => onAdvance(q.id, [opt]), 250)
  }

  const handleMultiToggle = (opt: string) => {
    const cur = questionSelections[q.id] ?? []
    setShowingOpenResponse((prev) => ({ ...prev, [q.id]: false }))
    setQuestionSelections((prev) => ({
      ...prev,
      [q.id]: cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt],
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

        <div className="flex flex-col gap-2">
          {opts.map((opt, i) => {
            const isSelected =
              q.answerFormat === "multi-select" ? selections.includes(opt) : selections[0] === opt
            const isRecommended = i === 0

            return (
              <button
                key={opt}
                onClick={() =>
                  q.answerFormat === "multi-select" ? handleMultiToggle(opt) : handleSelect(opt)
                }
                className={`w-full text-left px-4 py-3 rounded-lg text-sm border-2 transition-colors flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-violet-600 border-violet-600 text-white"
                    : "bg-white border-[#E8D5C4] text-[#2C2C2C] hover:border-violet-400"
                }`}
              >
                <span>{opt}</span>
                {isRecommended && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      isSelected ? "bg-white/20 text-white" : "bg-violet-100 text-violet-700"
                    }`}
                  >
                    Recommended
                  </span>
                )}
              </button>
            )
          })}

          {/* Open response option */}
          {isOpenActive ? (
            <div className="border-2 border-violet-400 rounded-lg p-3 bg-violet-50">
              <p className="text-xs font-medium text-violet-700 mb-2">Your answer:</p>
              <input
                autoFocus
                type="text"
                value={openText}
                onChange={(e) =>
                  setOpenResponseValues((prev) => ({ ...prev, [q.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && openText.trim()) onAdvance(q.id)
                }}
                placeholder="Type your own answer..."
                className="w-full px-3 py-2 border border-violet-300 rounded-lg bg-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          ) : (
            <button
              onClick={() => {
                setQuestionSelections((prev) => ({ ...prev, [q.id]: [] }))
                setShowingOpenResponse((prev) => ({ ...prev, [q.id]: true }))
              }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm border-2 border-dashed border-[#E8D5C4] text-[#888] hover:border-violet-400 hover:text-violet-600 transition-colors"
            >
              Other (write your own)…
            </button>
          )}

          {/* Continue / Generate button for multi-select and open response */}
          {(q.answerFormat === "multi-select" || isOpenActive) && hasAnswer && (
            <button
              onClick={() => onAdvance(q.id)}
              className="mt-2 w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isLastQuestion ? "Generate Lesson Plan" : "Continue →"}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
