import Anthropic from "@anthropic-ai/sdk"
import type { VercelRequest, VercelResponse } from "@vercel/node"

/**
 * CALL 1 of the two-call lesson flow.
 *
 *   generate-questions.ts  -->  [teacher answers in UI]  -->  generate-lesson.ts
 *
 * This endpoint reads the teacher's bookmarked resources + context and returns
 * 3-4 short planning questions. The teacher's answers are then passed into
 * generate-lesson.ts so the lesson is co-created, not just vended.
 *
 * Design notes:
 *  - Mirrors generate-lesson.ts: same Anthropic() client, same cache_control,
 *    same 402 (API_BALANCE_LOW) branch, same extractJson brace-slice.
 *  - Output is STRICTLY VALIDATED. The model can be creative about question
 *    content, but malformed questions are dropped before they reach the client
 *    rather than trusted blindly.
 *  - answerFormat is a CLOSED enum. The model picks per question, but only from
 *    a set the renderer is guaranteed to support.
 */

interface ResourceInput {
  title: string
  description: string
  curriculum_expectations: string[]
  grade: string
  subject: string
  publisher?: string
  instructional_modes?: string[]
  usage_notes?: string
}

interface GenerateQuestionsRequest {
  resources: ResourceInput[]
  lessonLength: string
  lessonTemplate: string
  teacherNotes: string
  classroomResources?: string[]
}

/** The three answer formats the renderer is built to handle. */
const ANSWER_FORMATS = ["single-select", "this-that-both", "multi-select"] as const
type AnswerFormat = (typeof ANSWER_FORMATS)[number]

interface PlanningQuestion {
  /** Stable id (q1..qN) so the lesson call can map answers back to questions. */
  id: string
  /** The question shown to the teacher. */
  prompt: string
  /** Why this choice matters — one short line, helps the teacher decide. */
  rationale: string
  answerFormat: AnswerFormat
  /** Option labels. 2 for this-that-both; 2-5 otherwise. */
  options: string[]
}

/** Bounds — keep the call cheap and the UI fast. */
const MIN_QUESTIONS = 3
const MAX_QUESTIONS = 4
const MAX_RESOURCES = 12

/** Reused verbatim from generate-assessment.ts — model-agnostic JSON rescue. */
function extractJson(text: string): string {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed
}

/**
 * Collect text from ALL text blocks, not just content[0].
 * generate-lesson.ts indexes content[0] directly — that breaks silently the
 * day a tool-use block lands first. This version is future-proof.
 */
function collectText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
}

/**
 * Validate one question from the model. Returns a clean PlanningQuestion or
 * null if it's malformed. We drop bad questions rather than trust the array.
 */
function validateQuestion(raw: unknown, index: number): PlanningQuestion | null {
  if (typeof raw !== "object" || raw === null) return null
  const q = raw as Record<string, unknown>

  if (typeof q.prompt !== "string" || q.prompt.trim() === "") return null
  if (typeof q.rationale !== "string") return null

  if (typeof q.answerFormat !== "string") return null
  if (!ANSWER_FORMATS.includes(q.answerFormat as AnswerFormat)) return null
  const answerFormat = q.answerFormat as AnswerFormat

  if (!Array.isArray(q.options)) return null
  const options = q.options.filter((o): o is string => typeof o === "string" && o.trim() !== "")

  // this-that-both must offer exactly two real choices ("both" is implicit in
  // the format and added by the UI, not by the model).
  if (answerFormat === "this-that-both" && options.length !== 2) return null
  // single-select / multi-select need at least 2 and we cap at 5 for the UI.
  if (answerFormat !== "this-that-both" && (options.length < 2 || options.length > 5)) return null

  return {
    id: `q${index + 1}`,
    prompt: q.prompt.trim(),
    rationale: q.rationale.trim(),
    answerFormat,
    options,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = new Anthropic()
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { resources, lessonLength, lessonTemplate, teacherNotes, classroomResources } =
    req.body as GenerateQuestionsRequest

  if (!resources || resources.length === 0) {
    return res.status(400).json({ error: "At least one resource is required" })
  }

  const resourceList = resources
    .slice(0, MAX_RESOURCES)
    .map((r, i) => {
      const lines = [
        `Resource ${i + 1}: "${r.title}"`,
        `  Description: ${r.description}`,
        `  Publisher: ${r.publisher ?? "unknown"}`,
        `  Curriculum codes: ${r.curriculum_expectations?.join(", ") || "not specified"}`,
      ]
      if (r.instructional_modes?.length) {
        lines.push(`  Best used as: ${r.instructional_modes.join(", ")}`)
      }
      if (r.usage_notes) {
        lines.push(`  Deployment note: ${r.usage_notes}`)
      }
      return lines.join("\n")
    })
    .join("\n\n")

  const grade = resources[0].grade ?? "unknown"
  const subject = resources[0].subject ?? "unknown"

  const allCodes = [...new Set(resources.flatMap((r) => r.curriculum_expectations ?? []))]

  const systemPrompt = `You are an experienced Ontario elementary school teacher and instructional coach. Before a colleague generates a lesson plan, you ask them a few sharp planning questions so the lesson reflects THEIR professional judgment about THEIR classroom — not a generic template. You always respond with valid JSON only — no markdown fences, no extra text.`

  const classroomResourcesLine =
    classroomResources && classroomResources.length > 0
      ? `Classroom resources the teacher has available: ${classroomResources.join(", ")}`
      : ""

  const userPrompt = `A Grade ${grade} ${subject} teacher is about to generate a ${lessonLength} lesson plan (template: ${lessonTemplate}) from the resources below. Before the lesson is written, ask them ${MIN_QUESTIONS}-${MAX_QUESTIONS} planning questions.

${teacherNotes ? `Teacher notes: ${teacherNotes}` : ""}
${classroomResourcesLine}

Resources to be used:
${resourceList}

Ontario curriculum codes in play: ${allCodes.join(", ") || "not specified"}

Write ${MIN_QUESTIONS} to ${MAX_QUESTIONS} questions. Requirements:
- Each question MUST be answerable specifically because of THESE resources or THIS topic. Do not ask generic questions that would apply to any lesson (avoid "what pacing do you want?"). A good question references a specific resource, its type, or a real pedagogical fork the topic creates.
- Example of a good question: if a resource is an open-ended interactive, ask whether students should free-explore it or work through a guided capture sheet.
- Cover genuinely different decisions — do not ask three versions of the same thing.
- For each question, choose the answer format that fits it best:
    "single-select"  — teacher picks ONE option (give 2-5 options)
    "this-that-both" — a two-way fork where doing BOTH is sensible (give EXACTLY 2 options; the UI adds a "Both" choice itself)
    "multi-select"   — teacher picks ANY NUMBER of options (give 2-5 options)
- "rationale" is one short sentence telling the teacher why this choice changes the lesson.
- Keep prompts to one or two sentences, plain language.

Return ONLY a JSON object with this exact shape:
{
  "questions": [
    {
      "prompt": "...",
      "rationale": "...",
      "answerFormat": "single-select",
      "options": ["...", "..."]
    }
  ]
}`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      messages: [{ role: "user", content: userPrompt }],
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
    })

    const rawText = collectText(message.content)

    let parsed: unknown
    try {
      parsed = JSON.parse(extractJson(rawText))
    } catch {
      // Honest signal — see note below. The client should NOT silently show
      // an empty question set as if it were a real (short) result.
      return res.status(200).json({ status: "degraded", questions: [] })
    }

    const rawQuestions = Array.isArray((parsed as { questions?: unknown })?.questions)
      ? (parsed as { questions: unknown[] }).questions
      : []

    const questions = rawQuestions
      .map((q, i) => validateQuestion(q, i))
      .filter((q): q is PlanningQuestion => q !== null)
      .slice(0, MAX_QUESTIONS)

    // If the model produced something but it all failed validation, that is a
    // degraded result, not a real empty one.
    const status = questions.length === 0 ? "degraded" : "ok"

    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? "unknown"
    const userEmail = (req.headers["x-user-email"] as string | undefined) ?? ""
    console.log(JSON.stringify({
      event: "questions_generated",
      ts: new Date().toISOString(),
      user: userEmail || null,
      ip,
      ua: req.headers["user-agent"] ?? "",
      grade,
      subject,
      lessonTemplate,
      lessonLength,
      codesCount: allCodes.length,
      resourcesCount: resources.length,
      rawQuestions: rawQuestions.length,
      validQuestions: questions.length,
      status,
      stop: message.stop_reason,
      tokensIn: message.usage?.input_tokens ?? 0,
      tokensOut: message.usage?.output_tokens ?? 0,
    }))

    return res.status(200).json({ status, questions })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    if (message.toLowerCase().includes("credit balance") || message.toLowerCase().includes("billing")) {
      return res.status(402).json({ error: "API_BALANCE_LOW", message })
    }
    return res.status(500).json({ error: message })
  }
}
