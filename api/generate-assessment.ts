import Anthropic from "@anthropic-ai/sdk"
import type { VercelRequest, VercelResponse } from "@vercel/node"

/**
 * DEPRECATED ON PRIMARY PATH: Assessment questions are now generated inline
 * within /api/generate-lesson.ts and cached at lesson creation time. This
 * endpoint is retained as a fallback for manual question generation in
 * other contexts but is no longer called by the frontend lesson flow.
 */

interface ExpectationInput {
  code: string
  description: string
}

interface GenerateAssessmentRequest {
  title: string
  grade: string
  subject: string
  expectations: ExpectationInput[]
  lessonContent?: { mindsOn: string; action: string; consolidation: string }
}

const MAX_EXPECTATIONS = 8

function extractJson(text: string): string {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = new Anthropic()
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { title, grade, subject, expectations, lessonContent } = req.body as GenerateAssessmentRequest

  if (!expectations || expectations.length === 0) {
    return res.status(400).json({ error: "At least one expectation is required" })
  }

  const expList = expectations.slice(0, MAX_EXPECTATIONS)

  const systemPrompt = `You are an experienced Ontario elementary school teacher writing a short formative "quick check" for students at the end of a lesson. You write clear, grade-appropriate questions that check understanding of specific curriculum expectations. You always respond with valid JSON only — no markdown fences, no extra text.`

  const taughtBlock = lessonContent
    ? `\nWhat was taught in this lesson:\n  Minds On: ${lessonContent.mindsOn}\n  Action: ${lessonContent.action}\n  Consolidation: ${lessonContent.consolidation}\n`
    : ""

  const expLines = expList.map((e) => `${e.code}: ${e.description}`).join("\n")

  const userPrompt = `Create a short formative quick check for Grade ${grade} ${subject}.
Lesson title: "${title}"
${taughtBlock}
Write questions for EACH of these curriculum expectations:
${expLines}

Rules:
- For each expectation, write exactly 2 questions: one "multiple-choice" and one "true-false".
- Tie questions to what was taught; keep prompts to 1-2 sentences at a Grade ${grade} reading level.
- Multiple-choice: exactly 4 options, exactly one correct, with plausible distractors.
- Include a one-sentence "explanation" of the correct answer for every question.
- Do NOT write open-ended or free-text questions.

Return ONLY a JSON object with this exact shape:
{
  "questions": [
    { "code": "${expList[0].code}", "type": "multiple-choice", "prompt": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "..." },
    { "code": "${expList[0].code}", "type": "true-false", "prompt": "...", "correct": true, "explanation": "..." }
  ]
}`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: userPrompt }],
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
    })

    const rawText = message.content[0].type === "text" ? message.content[0].text : ""

    let parsed: unknown
    try {
      parsed = JSON.parse(extractJson(rawText))
    } catch {
      // Degrade gracefully — the client falls back to its static question bank.
      return res.status(200).json({ questions: [] })
    }

    const questions = Array.isArray((parsed as { questions?: unknown })?.questions)
      ? (parsed as { questions: unknown[] }).questions
      : []
    return res.status(200).json({ questions })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    if (message.toLowerCase().includes("credit balance") || message.toLowerCase().includes("billing")) {
      return res.status(402).json({ error: "API_BALANCE_LOW", message })
    }
    return res.status(500).json({ error: message })
  }
}
