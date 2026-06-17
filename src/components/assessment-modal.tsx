"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X, CheckCircle, XCircle, HelpCircle, ClipboardCheck, Loader2, Info, BarChart3 } from "lucide-react"
import { describeCode } from "@/lib/curriculum-codes"
import type { LessonMetadata } from "@/lib/lesson-metadata"
import {
  sanitizeQuestions,
  levelFor,
  type AssessmentQuestion,
  type MultipleChoiceQuestion,
  type TrueFalseQuestion,
  type ProficiencyLevel,
} from "@/lib/assessment-types"
import { getCachedQuestions } from "@/lib/assessment-questions-cache"
import {
  recordAttempt,
  getLessonTally,
  getAllTallies,
  aggregateLesson,
  aggregateAll,
} from "@/lib/assessment-results"
import ClassDashboard from "@/components/class-dashboard"
import DevSeedControl from "@/components/dev/dev-seed-control"

interface AssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  lesson: LessonMetadata
  asSpace?: boolean
}

// Static fallback bank — used only when lesson-specific questions can't be generated.
const SAMPLE_QUESTIONS: Record<string, string[]> = {
  "D1.1": ["Give an example of discrete data and continuous data from real life. How are they different?"],
  "D1.2": ["You want to find out the favourite sports of students in your school. Would you use a sample or a full census? Why?"],
  "D1.3": ["When would a broken-line graph be a better choice than a bar graph? Give an example."],
  "D1.4": ["What makes an infographic different from a simple table of data?"],
  "D1.5": ["The range of a data set is 15. What does that tell you? What doesn't it tell you?"],
  "D1.6": ["How can the scale on a graph be changed to make data look misleading?"],
  "D2.1": ["Express the probability of flipping heads as a fraction, decimal, and percent."],
  "D2.2": ["If you flip a coin and roll a die, are those two independent events? How do you know?"],
  "F1.1": ["What is one advantage and one disadvantage of paying with a debit card instead of cash?"],
  "F1.2": ["What is the difference between an earning goal and a saving goal? Give an example of each."],
  "F1.3": ["Name two things that could make it harder to reach a financial goal. How might you plan around them?"],
  "F1.4": ["If you borrow $100 at 5% interest per year, how much do you owe after one year?"],
  "F1.5": ["What is the difference between lending and donating? When might each make sense?"],
}

const FALLBACK_QUESTIONS = [
  "Describe one key thing you learned in today's lesson in your own words.",
  "What is one question you still have after today's lesson?",
]

type ResponseState = "unanswered" | "understood" | "working-on-it"
type Phase = "loading" | "administer" | "dashboard"
type Answer = { selectedIndex?: number; selectedBool?: boolean }
type FallbackItem = { key: string; code: string | null; prompt: string }

function buildFallback(codes: string[]): FallbackItem[] {
  if (codes.length === 0) {
    return FALLBACK_QUESTIONS.map((q, i) => ({ key: `fallback_${i}`, code: null, prompt: q }))
  }
  return codes.map((code) => ({ key: code, code, prompt: (SAMPLE_QUESTIONS[code] ?? FALLBACK_QUESTIONS)[0] }))
}

export default function AssessmentModal({ isOpen, onClose, lesson, asSpace = false }: AssessmentModalProps) {
  const [phase, setPhase] = useState<Phase>("loading")
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [fallback, setFallback] = useState<FallbackItem[]>([])
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [selfRatings, setSelfRatings] = useState<Record<string, ResponseState>>({})
  const [recordedCount, setRecordedCount] = useState(0)
  const [dashView, setDashView] = useState<"lesson" | "all">("lesson")
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [groupSelection, setGroupSelection] = useState<number | null>(null)
  const [groupOther, setGroupOther] = useState("")
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollBodyRef = useRef<HTMLDivElement>(null)

  const MAX_GROUP_SIZE = 500
  const getGroupCount = (): number => {
    if (groupSelection !== null) return groupSelection
    const n = parseInt(groupOther, 10)
    return !isNaN(n) && n > 0 ? n : 0
  }
  const isGroupCountValid = () => { const n = getGroupCount(); return n >= 1 && n <= MAX_GROUP_SIZE }
  const resetGroupPicker = () => { setGroupSelection(null); setGroupOther("") }

  useEffect(() => {
    if (!isOpen) return
    const codes = (lesson.curriculumCodesCovered ?? []).filter(Boolean)

    // Reset per-open state.
    setAnswers({})
    setSelfRatings({})
    setRecordedCount(0)
    setDashView("lesson")
    setShowGroupPicker(false)
    setGroupSelection(null)
    setGroupOther("")
    setCurrentQuestionIndex(0)
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)

    // Dev seam: inject mock questions via localStorage to exercise the graded flow without the API.
    if (import.meta.env.DEV) {
      try {
        const mock = localStorage.getItem("maplekey_assessment_mock")
        if (mock) {
          const qs = sanitizeQuestions(JSON.parse(mock))
          if (qs.length) {
            setQuestions(qs)
            setFallback([])
            setPhase("administer")
            return
          }
        }
      } catch {
        // ignore bad mock
      }
    }

    // Questions are generated together with the lesson and cached at creation time.
    const cached = getCachedQuestions(lesson.id)
    if (cached && cached.length) {
      setQuestions(cached)
      setFallback([])
      setPhase("administer")
      return
    }

    // No generated questions for this lesson — fall back to reflection prompts.
    setQuestions([])
    setFallback(buildFallback(codes))
    setPhase("administer")
  }, [isOpen, lesson.id])

  const dashboardData = useMemo(() => {
    if (phase !== "dashboard") return null
    if (dashView === "lesson") return aggregateLesson(getLessonTally(lesson.id))
    const scoped = getAllTallies().filter((t) => t.grade === lesson.grade && t.subject === lesson.subject)
    return aggregateAll(scoped)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, dashView, recordedCount, lesson.id, lesson.grade, lesson.subject])

  const dashboardCaption = useMemo(() => {
    if (!dashboardData) return undefined
    const responses = `${dashboardData.attempts} ${dashboardData.attempts === 1 ? "response" : "responses"}`
    if (dashView === "lesson") return `This lesson · ${responses}`
    return `Grade ${lesson.grade} ${lesson.subject} · ${responses}`
  }, [dashView, dashboardData, lesson.grade, lesson.subject])

  useEffect(() => {
    scrollBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentQuestionIndex])

  if (!isOpen) return null

  const isGraded = questions.length > 0
  const totalCount = isGraded ? questions.length : fallback.length
  const answeredCount = isGraded
    ? questions.filter((q) => answers[q.id] !== undefined).length
    : fallback.filter((f) => (selfRatings[f.key] ?? "unanswered") !== "unanswered").length
  const canRecord = totalCount > 0 && answeredCount === totalCount

  const advanceQuestion = () => {
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current)
    setCurrentQuestionIndex((i) => i + 1)
  }

  const handleBack = () => {
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current)
      advanceTimeoutRef.current = null
    }
    setCurrentQuestionIndex((i) => Math.max(0, i - 1))
  }

  const answerMC = (id: string, index: number) => {
    setAnswers((p) => (p[id] ? p : { ...p, [id]: { selectedIndex: index } }))
    advanceTimeoutRef.current = setTimeout(() => setCurrentQuestionIndex((i) => i + 1), 1400)
  }
  const answerTF = (id: string, value: boolean) => {
    setAnswers((p) => (p[id] ? p : { ...p, [id]: { selectedBool: value } }))
    advanceTimeoutRef.current = setTimeout(() => setCurrentQuestionIndex((i) => i + 1), 1400)
  }
  const setSelfRating = (key: string, state: ResponseState) => setSelfRatings((p) => ({ ...p, [key]: state }))

  const computePerCodeLevel = (): Record<string, ProficiencyLevel> => {
    const result: Record<string, ProficiencyLevel> = {}
    if (isGraded) {
      const byCode: Record<string, { correct: number; total: number }> = {}
      for (const q of questions) {
        if (!q.code) continue
        const a = answers[q.id]
        const correct = q.type === "multiple-choice" ? a?.selectedIndex === q.correctIndex : a?.selectedBool === q.correct
        const agg = (byCode[q.code] ??= { correct: 0, total: 0 })
        agg.total += 1
        if (correct) agg.correct += 1
      }
      for (const [code, { correct, total }] of Object.entries(byCode)) result[code] = levelFor(correct, total)
    } else {
      for (const f of fallback) {
        if (!f.code) continue
        const r = selfRatings[f.key]
        if (!r || r === "unanswered") continue
        result[f.code] = r === "understood" ? "level4" : "level2"
      }
    }
    return result
  }

  const handleRecord = (count = 1) => {
    recordAttempt(lesson, computePerCodeLevel(), count)
    setRecordedCount((n) => n + count)
    setAnswers({})
    setSelfRatings({})
    setCurrentQuestionIndex(0)
    setShowGroupPicker(false)
    resetGroupPicker()
    setPhase("dashboard")
  }

  const goAdminister = () => {
    setAnswers({})
    setSelfRatings({})
    setCurrentQuestionIndex(0)
    setShowGroupPicker(false)
    resetGroupPicker()
    setPhase("administer")
  }

  return (
    <div
      className={
        asSpace
          ? "fixed inset-0 z-[60] bg-white flex flex-col overflow-hidden"
          : "fixed inset-0 z-[60] flex items-center justify-center p-4"
      }
    >
      {!asSpace && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />}
      <div
        className={
          asSpace
            ? "w-full h-full flex flex-col overflow-hidden"
            : "relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8D5C4] bg-[#FAF3E0]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
              <ClipboardCheck size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-[#2C2C2C] text-base">Quick Check</h2>
              <p className="text-xs text-[#888] leading-tight">{lesson.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#E8D5C4] rounded-lg transition-colors text-[#666]">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar (administer only) */}
        <div className="h-1 bg-stone-100">
          {phase === "administer" && (
            <div
              className="h-full bg-amber-400 transition-all duration-500"
              style={{ width: totalCount > 0 ? `${(answeredCount / totalCount) * 100}%` : "0%" }}
            />
          )}
        </div>

        {/* Body */}
        <div ref={scrollBodyRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Loader2 size={28} className="animate-spin text-amber-500" />
              <p className="text-sm font-medium text-[#2C2C2C]">Building your quick check…</p>
              <p className="text-xs text-[#888]">Tailoring questions to this lesson.</p>
            </div>
          )}

          {phase === "administer" && (
            <>
              {currentQuestionIndex >= totalCount ? (
                /* All questions answered — prompt to record */
                <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle size={24} className="text-emerald-600" />
                  </div>
                  <p className="font-semibold text-[#2C2C2C]">All done!</p>
                  <p className="text-sm text-[#888]">Use the button below to record this student's results.</p>
                  <button
                    onClick={handleBack}
                    className="text-xs text-amber-600 hover:text-amber-800 font-medium transition-colors"
                  >
                    ← Review answers
                  </button>
                </div>
              ) : (
                <>
                  {/* Info banner — only on first question */}
                  {currentQuestionIndex === 0 && !isGraded && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      Showing reflection prompts — tailored quiz questions weren't generated for this lesson. Re-generate the lesson with AI to get auto-graded questions.
                    </p>
                  )}

                  {/* Progress indicator */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {currentQuestionIndex > 0 && (
                        <button
                          onClick={handleBack}
                          className="text-xs text-[#888] hover:text-amber-700 font-medium transition-colors"
                        >
                          ← Back
                        </button>
                      )}
                      <span className="text-xs text-[#888]">
                        Question {currentQuestionIndex + 1} of {totalCount}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {Array.from({ length: totalCount }).map((_, i) => {
                        const isAnswered = isGraded
                          ? answers[questions[i]?.id] !== undefined
                          : (selfRatings[fallback[i]?.key] ?? "unanswered") !== "unanswered"
                        return (
                          <div
                            key={i}
                            className={`h-1.5 w-4 rounded-full transition-colors ${
                              i === currentQuestionIndex
                                ? "bg-amber-600"
                                : isAnswered
                                ? "bg-amber-400"
                                : "bg-stone-200"
                            }`}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Current question */}
                  {isGraded ? (
                    (() => {
                      const q = questions[currentQuestionIndex]
                      return q.type === "multiple-choice" ? (
                        <MultipleChoiceCard
                          key={q.id}
                          q={q}
                          answer={answers[q.id]}
                          onAnswer={(i) => answerMC(q.id, i)}
                          subject={lesson.subject}
                        />
                      ) : (
                        <TrueFalseCard
                          key={q.id}
                          q={q}
                          answer={answers[q.id]}
                          onAnswer={(v) => answerTF(q.id, v)}
                          subject={lesson.subject}
                        />
                      )
                    })()
                  ) : (
                    <SelfRatingCard
                      key={fallback[currentQuestionIndex].key}
                      code={fallback[currentQuestionIndex].code}
                      question={fallback[currentQuestionIndex].prompt}
                      state={selfRatings[fallback[currentQuestionIndex].key] ?? "unanswered"}
                      onRespond={(s) => setSelfRating(fallback[currentQuestionIndex].key, s)}
                      onAdvance={advanceQuestion}
                      subject={lesson.subject}
                    />
                  )}
                </>
              )}
            </>
          )}

          {phase === "dashboard" && dashboardData && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-amber-600" />
                  <span className="text-sm font-semibold text-[#2C2C2C]">Class results</span>
                </div>
                <DevSeedControl scope={{ kind: "lesson", lesson }} onChanged={() => setRecordedCount((n) => n + 1)} />
              </div>
              <div className="inline-flex rounded-lg border border-[#E8D5C4] bg-white p-0.5 text-xs font-medium">
                <button
                  onClick={() => setDashView("lesson")}
                  className={`px-3 py-1.5 rounded-md transition-colors ${dashView === "lesson" ? "bg-[#FF6B35] text-white" : "text-[#666] hover:bg-[#FAF3E0]"}`}
                >
                  This lesson
                </button>
                <button
                  onClick={() => setDashView("all")}
                  className={`px-3 py-1.5 rounded-md transition-colors ${dashView === "all" ? "bg-[#FF6B35] text-white" : "text-[#666] hover:bg-[#FAF3E0]"}`}
                >
                  Grade {lesson.grade} {lesson.subject}
                </button>
              </div>
              <ClassDashboard data={dashboardData} subject={lesson.subject} caption={dashboardCaption} />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#E8D5C4] bg-[#FAF3E0]">
          {/* Group response picker — expands when "Group" is active */}
          {phase === "administer" && showGroupPicker && (
            <div className="px-6 pt-4 pb-2">
              <div className="rounded-xl border border-[#E8D5C4] bg-white p-3">
                <p className="mb-2 text-xs font-semibold text-[#2C2C2C]">
                  How many students gave these same answers?
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {[2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => { setGroupSelection(n); setGroupOther("") }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                        groupSelection === n && !groupOther
                          ? "border-[#2C2C2C] bg-[#2C2C2C] text-white"
                          : "border-[#E8D5C4] text-[#666] hover:bg-[#FAF3E0]"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={MAX_GROUP_SIZE}
                    placeholder={`Other (max ${MAX_GROUP_SIZE})`}
                    value={groupOther}
                    onChange={(e) => { setGroupOther(e.target.value); setGroupSelection(null) }}
                    className="w-36 rounded-lg border border-[#E8D5C4] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleRecord(getGroupCount())}
                    disabled={!isGroupCountValid()}
                    className="rounded-lg bg-[#FF6B35] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#e55a2a] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Record {isGroupCountValid() ? getGroupCount() : ""} students
                  </button>
                  <button
                    onClick={() => { setShowGroupPicker(false); resetGroupPicker() }}
                    className="px-3 py-1.5 text-xs text-[#888] hover:text-[#666]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main footer row */}
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            {phase === "dashboard" ? (
              <>
                <span className="text-sm text-[#888]">
                  {dashboardData ? `${dashboardData.attempts} ${dashboardData.attempts === 1 ? "response" : "responses"} recorded` : ""}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="rounded-xl border border-[#E8D5C4] px-4 py-2 text-sm font-semibold text-[#666] transition-colors hover:bg-white"
                  >
                    Done
                  </button>
                  <button
                    onClick={goAdminister}
                    className="rounded-xl bg-[#FF6B35] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e55a2a]"
                  >
                    Record another student
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm text-[#888]">
                  {answeredCount} of {totalCount} answered
                  {recordedCount > 0 && ` · ${recordedCount} ${recordedCount === 1 ? "response" : "responses"} recorded`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPhase("dashboard")}
                    disabled={phase === "loading"}
                    className="rounded-xl border border-[#E8D5C4] px-4 py-2 text-sm font-semibold text-[#666] transition-colors hover:bg-white disabled:opacity-50"
                  >
                    View results
                  </button>
                  <button
                    onClick={() => { setShowGroupPicker((v) => !v); resetGroupPicker() }}
                    disabled={!canRecord}
                    className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      showGroupPicker
                        ? "border-[#2C2C2C] bg-[#2C2C2C] text-white"
                        : "border-[#E8D5C4] text-[#666] hover:bg-white"
                    }`}
                  >
                    Group
                  </button>
                  <button
                    onClick={() => handleRecord(1)}
                    disabled={!canRecord}
                    className="rounded-xl bg-[#FF6B35] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#e55a2a] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Record &amp; next
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CodeHeader({ code, subject }: { code: string | null; subject: string }) {
  if (!code) return null
  const description = describeCode(subject, code)
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">{code}</span>
      {description && <span className="text-xs text-[#888] line-clamp-1">{description}</span>}
    </div>
  )
}

function Prompt({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <HelpCircle size={16} className="text-[#A8998E] flex-shrink-0 mt-0.5" />
      <p className="text-sm text-[#2C2C2C]">{text}</p>
    </div>
  )
}

function Explanation({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 border border-stone-200 px-3 py-2">
      <Info size={14} className="text-stone-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-[#666]">{text}</p>
    </div>
  )
}

function MultipleChoiceCard({
  q,
  answer,
  onAnswer,
  subject,
}: {
  q: MultipleChoiceQuestion
  answer?: Answer
  onAnswer: (i: number) => void
  subject: string
}) {
  const answered = answer?.selectedIndex !== undefined
  return (
    <div className="rounded-xl border-2 border-[#E8D5C4] bg-white p-4">
      <CodeHeader code={q.code} subject={subject} />
      <Prompt text={q.prompt} />
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isSelected = answer?.selectedIndex === i
          const isCorrect = i === q.correctIndex
          let cls = "border-[#E8D5C4] bg-white hover:bg-[#FAF3E0] text-[#2C2C2C]"
          if (answered) {
            if (isCorrect) cls = "border-emerald-400 bg-emerald-50 text-emerald-800"
            else if (isSelected) cls = "border-red-300 bg-red-50 text-red-700"
            else cls = "border-[#E8D5C4] bg-white text-[#999]"
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${cls} ${answered ? "cursor-default" : ""}`}
            >
              <span className="flex-1">{opt}</span>
              {answered && isCorrect && <CheckCircle size={15} className="text-emerald-500 flex-shrink-0" />}
              {answered && isSelected && !isCorrect && <XCircle size={15} className="text-red-400 flex-shrink-0" />}
            </button>
          )
        })}
      </div>
      {answered && q.explanation && <Explanation text={q.explanation} />}
    </div>
  )
}

function TrueFalseCard({
  q,
  answer,
  onAnswer,
  subject,
}: {
  q: TrueFalseQuestion
  answer?: Answer
  onAnswer: (v: boolean) => void
  subject: string
}) {
  const answered = answer?.selectedBool !== undefined
  return (
    <div className="rounded-xl border-2 border-[#E8D5C4] bg-white p-4">
      <CodeHeader code={q.code} subject={subject} />
      <Prompt text={q.prompt} />
      <div className="flex gap-2">
        {[true, false].map((val) => {
          const isSelected = answer?.selectedBool === val
          const isCorrect = val === q.correct
          let cls = "border-[#E8D5C4] bg-white hover:bg-[#FAF3E0] text-[#2C2C2C]"
          if (answered) {
            if (isCorrect) cls = "border-emerald-400 bg-emerald-50 text-emerald-800"
            else if (isSelected) cls = "border-red-300 bg-red-50 text-red-700"
            else cls = "border-[#E8D5C4] bg-white text-[#999]"
          }
          return (
            <button
              key={String(val)}
              disabled={answered}
              onClick={() => onAnswer(val)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${cls} ${answered ? "cursor-default" : ""}`}
            >
              {val ? "True" : "False"}
            </button>
          )
        })}
      </div>
      {answered && q.explanation && <Explanation text={q.explanation} />}
    </div>
  )
}

function SelfRatingCard({
  code,
  question,
  state,
  onRespond,
  onAdvance,
  subject,
}: {
  code: string | null
  question: string
  state: ResponseState
  onRespond: (s: ResponseState) => void
  onAdvance: () => void
  subject: string
}) {
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
      <CodeHeader code={code} subject={subject} />
      <Prompt text={question} />
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
      {state !== "unanswered" && (
        <button
          onClick={onAdvance}
          className="mt-3 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Next →
        </button>
      )}
    </div>
  )
}
