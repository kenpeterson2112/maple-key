// Runs one fixed lesson request through api/generate-lesson.ts on several
// models, so their plans can be read side by side. It calls the real handler,
// so what you compare is exactly what a teacher would get.
//
//   ANTHROPIC_API_KEY=... node --experimental-strip-types --no-warnings \
//     --import ./scripts/ts-resolve.mjs scripts/compare-lesson-models.mjs [model ...]
//
// With no arguments it runs every model in the endpoint's allowlist. Each run is
// one billed API call. Output: lesson-compare/<model>.json plus a summary table
// (seconds, tokens, words per stage step). The directory is gitignored.
//
// LESSON_EFFORT applies as in production. Edit SAMPLE_REQUEST to try another lesson.

import { mkdirSync, writeFileSync } from "node:fs"
import { splitLessonLines } from "../shared/lesson-lines.ts"

const DEFAULT_MODELS = ["claude-haiku-4-5-20251001", "claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]

const SAMPLE_REQUEST = {
  resources: [
    {
      title: "Fraction Strips: Comparing and Ordering",
      description: "Interactive fraction strips for building, comparing and ordering fractions with like and unlike denominators.",
      curriculum_expectations: ["B1.3", "B1.4"],
      grade: "4",
      subject: "math",
      publisher: "Mathies",
      instructional_modes: ["whole-class", "partner-work"],
      usage_notes: "Model one comparison on the projector, then have pairs build their own. Works without student devices if paper strips are printed.",
    },
    {
      title: "Decimal Place Value Video",
      description: "A short video introducing tenths and hundredths on a place value chart.",
      curriculum_expectations: ["B1.5"],
      grade: "4",
      subject: "math",
      publisher: "TVO Learn",
    },
  ],
  lessonLength: "60 minutes",
  lessonTemplate: "3-Part Lesson (Minds On, Action, Consolidation)",
  teacherNotes: "Several multilingual learners. The class found unit fractions easy last week.",
  includeAssessmentData: false,
  classroomResources: ["Projector", "Fraction strips", "Chart paper"],
  planningAnswers: [],
  reproducibleLanguage: "English",
  noTechMode: false,
  province: "ON",
  grade: "4",
  subject: "math",
  topic: "Comparing fractions and equivalent fractions",
}

process.env.MK_API_SECRET ||= "compare"
const { default: handler } = await import("../api/generate-lesson.ts")

function call(body) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200,
      setHeader() { return res },
      status(code) { res.statusCode = code; return res },
      json(data) { resolve({ status: res.statusCode, data }); return res },
      end() { resolve({ status: res.statusCode, data: null }); return res },
    }
    const req = {
      method: "POST",
      headers: { "x-mk-api-key": process.env.MK_API_SECRET, "x-forwarded-for": "127.0.0.1" },
      socket: {},
      body,
    }
    Promise.resolve(handler(req, res)).catch((err) => resolve({ status: 500, data: { error: String(err) } }))
  })
}

const words = (s) => String(s ?? "").split(/\s+/).filter(Boolean).length
const models = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_MODELS
mkdirSync("lesson-compare", { recursive: true })

// The handler logs one JSON line per call; pick the token counts out of it.
const realLog = console.log
const rows = []
for (const model of models) {
  process.env.LESSON_MODEL = model
  let usage = {}
  console.log = (line) => {
    try {
      const e = JSON.parse(line)
      if (e.event?.startsWith("lesson_")) usage = e
    } catch { /* not ours */ }
  }
  const started = Date.now()
  const { status, data } = await call(SAMPLE_REQUEST)
  console.log = realLog
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  writeFileSync(`lesson-compare/${model}.json`, JSON.stringify(data, null, 2))
  if (status !== 200) {
    rows.push({ model, status, seconds, error: String(data?.error ?? "").slice(0, 80) })
    continue
  }
  const steps = ["mindsOnContent", "actionContent", "consolidationContent"].flatMap((f) => splitLessonLines(data[f]))
  const stepWords = steps.map(words)
  rows.push({
    model,
    servedBy: usage.model,
    seconds,
    tokensIn: usage.tokensIn,
    tokensOut: usage.tokensOut,
    steps: steps.length,
    "words/step (avg)": (stepWords.reduce((a, b) => a + b, 0) / (steps.length || 1)).toFixed(1),
    "words/step (max)": Math.max(0, ...stepWords),
    equityWords: words(data.equityFraming),
    codes: (data.curriculumCodesCovered ?? []).join(" "),
    excluded: data.excludedResources?.length ?? 0,
    questions: data.assessmentQuestions?.length ?? 0,
  })
}
console.table(rows)
console.log("Full plans: lesson-compare/<model>.json")
