import Anthropic from "@anthropic-ai/sdk"
import type { VercelRequest, VercelResponse } from "@vercel/node"

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

/** A quick check is a fast readiness signal, not a diagnostic — keep it short. */
const MAX_ASSESSMENT_QUESTIONS = 5

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
These are the curriculum expectations the lesson covered:
${expLines}

This quick check is a fast, actionable read on class readiness — NOT a thorough diagnostic.

Rules:
- Write 3 to 5 questions TOTAL. Aim for 3; use 4 only if needed and 5 only when the lesson spans many distinct expectations. Never exceed 5.
- Write ONE well-designed question per expectation. When several closely-related expectations were taught, CLUSTER them into a single question rather than adding more. Do NOT write more than one question for the same expectation.
- Set each question's "code" to the single expectation it targets (for a clustered question, use the most representative code).
- Tie questions to what was taught; keep prompts to 1-2 sentences at a Grade ${grade} reading level.
- Prefer "multiple-choice"; use "true-false" only when it tests the idea better. Multiple-choice: exactly 4 options, exactly one correct, with plausible distractors.
- Include a one-sentence "explanation" of the correct answer for every question.
- Do NOT write open-ended or free-text questions.

Return ONLY a JSON object with this exact shape:
{
  "questions": [
    { "code": "${expList[0].code}", "type": "multiple-choice", "prompt": "...", "options": ["a","b","c","d"], "correctIndex": 0, "explanation": "..." },
    { "code": "${expList[1]?.code ?? expList[0].code}", "type": "true-false", "prompt": "...", "correct": true, "explanation": "..." }
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

    const questions = (
      Array.isArray((parsed as { questions?: unknown })?.questions)
        ? (parsed as { questions: unknown[] }).questions
        : []
    ).slice(0, MAX_ASSESSMENT_QUESTIONS)
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? "unknown"
    const userEmail = (req.headers["x-user-email"] as string | undefined) ?? ""
    console.log(JSON.stringify({
      event: "assessment_generated",
      ts: new Date().toISOString(),
      user: userEmail || null,
      ip,
      ua: req.headers["user-agent"] ?? "",
      grade,
      subject,
      title,
      expectationsCount: expList.length,
      questionsCount: questions.length,
      stop: message.stop_reason,
      tokensIn: message.usage?.input_tokens ?? 0,
      tokensOut: message.usage?.output_tokens ?? 0,
    }))
    return res.status(200).json({ questions })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    if (message.toLowerCase().includes("credit balance") || message.toLowerCase().includes("billing")) {
      return res.status(402).json({ error: "API_BALANCE_LOW", message })
    }
    return res.status(500).json({ error: message })
  }
}
