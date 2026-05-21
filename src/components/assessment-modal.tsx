"use client"

import { useState } from "react"
import { X, CheckCircle, HelpCircle, ChevronRight, Sparkles } from "lucide-react"
import { CURRICULUM_DESCRIPTIONS } from "@/lib/curriculum-codes"
import type { LessonMetadata } from "@/lib/lesson-metadata"

interface AssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  lesson: LessonMetadata
  asSpace?: boolean
}

// Sample formative questions keyed by curriculum code
const SAMPLE_QUESTIONS: Record<string, string[]> = {
  "D1.1": [
    "Give an example of discrete data and continuous data from real life. How are they different?",
    "Could the number of cars in a parking lot be continuous data? Explain your thinking.",
  ],
  "D1.2": [
    "You want to find out the favourite sports of students in your school. Would you use a sample or a full census? Why?",
    "Why might organizing data into intervals be helpful when collecting information from a large group?",
  ],
  "D1.3": [
    "When would a broken-line graph be a better choice than a bar graph? Give an example.",
    "What information must every graph include to be considered complete and accurate?",
  ],
  "D1.4": [
    "What makes an infographic different from a simple table of data?",
    "How would you decide which type of graph to include in an infographic about school lunch preferences?",
  ],
  "D1.5": [
    "The range of a data set is 15. What does that tell you? What doesn't it tell you?",
    "Two classes both have a mean score of 72. Does that mean the classes performed the same? Explain.",
  ],
  "D1.6": [
    "How can the scale on a graph be changed to make data look misleading?",
    "A graph shows sales went up 300%. What questions should you ask before trusting that claim?",
  ],
  "D2.1": [
    "Express the probability of flipping heads as a fraction, decimal, and percent.",
    "If the probability of rain tomorrow is 0.7, what is the probability it will NOT rain?",
  ],
  "D2.2": [
    "If you flip a coin and roll a die, are those two independent events? How do you know?",
    "The theoretical probability of rolling a 3 is 1/6. If you rolled the die 30 times and got a 3 only 2 times, does that mean something is wrong? Explain.",
  ],
  "F1.1": [
    "What is one advantage and one disadvantage of paying with a debit card instead of cash?",
    "In what situation might someone choose to use a cheque instead of e-transfer?",
  ],
  "F1.2": [
    "What is the difference between an earning goal and a saving goal? Give an example of each.",
    "What are two concrete steps someone could take to reach a savings goal of $500?",
  ],
  "F1.3": [
    "Name two things that could make it harder to reach a financial goal. How might you plan around them?",
    "How could peer pressure affect someone's ability to save money?",
  ],
  "F1.4": [
    "If you borrow $100 at 5% interest per year, how much do you owe after one year?",
    "Why might a bank charge a higher interest rate for a loan than for a savings account?",
  ],
  "F1.5": [
    "What is the difference between lending and donating? When might each make sense?",
    "Give an example of a barter trade. What are the challenges of bartering compared to using money?",
  ],
}

const FALLBACK_QUESTIONS = [
  "Describe one key thing you learned in today's lesson in your own words.",
  "What is one question you still have after today's lesson?",
]

type ResponseState = "unanswered" | "understood" | "working-on-it"

export default function AssessmentModal({ isOpen, onClose, lesson, asSpace = false }: AssessmentModalProps) {
  const [responses, setResponses] = useState<Record<string, ResponseState>>({})

  if (!isOpen) return null

  const codes = lesson.curriculumCodesCovered.filter((c) => CURRICULUM_DESCRIPTIONS[c])
  const responded = Object.values(responses).filter((v) => v !== "unanswered").length
  const total = codes.length

  const setResponse = (key: string, state: ResponseState) => {
    setResponses((prev) => ({ ...prev, [key]: state }))
  }

  return (
    <div className={asSpace ? "fixed inset-0 z-[60] bg-white flex flex-col overflow-hidden" : "fixed inset-0 z-[60] flex items-center justify-center p-4"}>
      {!asSpace && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />}
      <div className={asSpace ? "w-full h-full flex flex-col overflow-hidden" : "relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D5C4] bg-[#FAF3E0]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
              <Sparkles size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#2C2C2C] text-base">Quick Check</h2>
              <p className="text-xs text-[#888] leading-tight">{lesson.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#E8D5C4] rounded-lg transition-colors text-[#666]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-stone-100">
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: total > 0 ? `${(responded / total) * 100}%` : "0%" }}
          />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <p className="text-sm text-[#666]">
            Based on today's lesson, check your understanding of each expectation below.
          </p>

          {codes.length === 0 ? (
            <div className="space-y-4">
              {FALLBACK_QUESTIONS.map((q, i) => (
                <QuestionCard
                  key={i}
                  code={null}
                  description={null}
                  question={q}
                  state={responses[`fallback_${i}`] ?? "unanswered"}
                  onRespond={(s) => setResponse(`fallback_${i}`, s)}
                />
              ))}
            </div>
          ) : (
            codes.map((code) => {
              const questions = SAMPLE_QUESTIONS[code] ?? FALLBACK_QUESTIONS
              const question = questions[0]
              return (
                <QuestionCard
                  key={code}
                  code={code}
                  description={CURRICULUM_DESCRIPTIONS[code]}
                  question={question}
                  state={responses[code] ?? "unanswered"}
                  onRespond={(s) => setResponse(code, s)}
                />
              )
            })
          )}

          {/* Coming soon notice */}
          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-center">
            <ChevronRight size={16} className="inline text-amber-500 mr-1" />
            <span className="text-xs text-amber-700 font-medium">
              Adaptive follow-up questions based on your responses are coming soon.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#E8D5C4] bg-[#FAF3E0] flex items-center justify-between">
          <span className="text-sm text-[#888]">
            {responded} of {total} expectations checked
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#FF6B35] hover:bg-[#e55a2a] text-white font-semibold text-sm rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

interface QuestionCardProps {
  code: string | null
  description: string | null
  question: string
  state: ResponseState
  onRespond: (s: ResponseState) => void
}

function QuestionCard({ code, description, question, state, onRespond }: QuestionCardProps) {
  return (
    <div
      className={`rounded-xl border-2 p-4 transition-colors ${
        state === "understood"
          ? "border-emerald-300 bg-emerald-50"
          : state === "working-on-it"
            ? "border-amber-300 bg-amber-50"
            : "border-[#E8D5C4] bg-white"
      }`}
    >
      {code && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">{code}</span>
          <span className="text-xs text-[#888] line-clamp-1">{description}</span>
        </div>
      )}
      <div className="flex items-start gap-2 mb-3">
        <HelpCircle size={16} className="text-[#A8998E] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#2C2C2C]">{question}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onRespond(state === "understood" ? "unanswered" : "understood")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            state === "understood"
              ? "bg-emerald-500 text-white border-emerald-500"
              : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          <CheckCircle size={13} />
          I understand
        </button>
        <button
          onClick={() => onRespond(state === "working-on-it" ? "unanswered" : "working-on-it")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            state === "working-on-it"
              ? "bg-amber-500 text-white border-amber-500"
              : "border-amber-300 text-amber-700 hover:bg-amber-50"
          }`}
        >
          Still working on it
        </button>
      </div>
    </div>
  )
}
