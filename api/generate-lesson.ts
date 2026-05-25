import Anthropic from "@anthropic-ai/sdk"
import type { VercelRequest, VercelResponse } from "@vercel/node"

interface ResourceInput {
  title: string
  description: string
  curriculum_expectations: string[]
  grade: string
  subject: string
  publisher?: string
}

interface GenerateRequest {
  resources: ResourceInput[]
  lessonLength: string
  lessonTemplate: string
  teacherNotes: string
  includeAssessmentData: boolean
  classroomResources?: string[]
}

interface MultipleChoiceQuestion {
  code: string
  type: "multiple-choice"
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
}

interface TrueFalseQuestion {
  code: string
  type: "true-false"
  prompt: string
  correct: boolean
  explanation: string
}

type AssessmentQuestion = MultipleChoiceQuestion | TrueFalseQuestion

interface LessonPlanResponse {
  title: string
  curriculumCodesCovered: string[]
  mindsOnContent: string
  mindsOnDifferentiation: string
  actionContent: string
  actionDifferentiation: string
  consolidationContent: string
  consolidationAssessment: string
  materialsContent: string
  assessmentQuestions?: AssessmentQuestion[]
}

// Loose contextual guidance — the kinds of ideas worth probing per expectation.
// Used only to steer question generation; questions must still be anchored in the
// actual lesson content the model writes.
const QUESTION_GUIDANCE: Record<string, string> = {
  "D1.1": "telling discrete from continuous data using real-life examples",
  "D1.2": "choosing a sample vs a census; organizing data into intervals",
  "D1.3": "picking the right graph (histogram vs broken-line) and what a complete graph needs",
  "D1.4": "what an infographic adds beyond a plain table",
  "D1.5": "what range and the measures of central tendency do and don't tell you",
  "D1.6": "how scale or presentation can make a graph misleading",
  "D2.1": "expressing probability as a fraction, decimal, and percent; complementary events",
  "D2.2": "independent events; theoretical vs experimental probability",
  "F1.1": "advantages/disadvantages of payment methods (cash, debit, cheque, e-transfer)",
  "F1.2": "earning vs saving goals and steps to reach them",
  "F1.3": "factors that help or interfere with reaching financial goals",
  "F1.4": "how interest rates work on loans vs savings",
  "F1.5": "trading, lending, borrowing, and donating as ways to share resources",
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = new Anthropic()
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { resources, lessonLength, lessonTemplate, teacherNotes, includeAssessmentData, classroomResources } =
    req.body as GenerateRequest

  if (!resources || resources.length === 0) {
    return res.status(400).json({ error: "At least one resource is required" })
  }

  const allCodes = [...new Set(resources.flatMap((r) => r.curriculum_expectations ?? []))]
  const grade = resources[0].grade ?? "unknown"
  const subject = resources[0].subject ?? "unknown"

  const resourceList = resources
    .map(
      (r, i) =>
        `Resource ${i + 1}: "${r.title}"
  Description: ${r.description}
  Publisher: ${r.publisher ?? "unknown"}
  Curriculum codes: ${r.curriculum_expectations?.join(", ") || "not specified"}`,
    )
    .join("\n\n")

  const systemPrompt = `You are an experienced Ontario elementary school teacher and curriculum expert. You create clear, practical, standards-aligned lesson plans for Canadian classrooms. You always respond with valid JSON only — no markdown fences, no extra text.`

  const classroomResourcesLine =
    classroomResources && classroomResources.length > 0
      ? `Classroom resources available: ${classroomResources.join(", ")}`
      : ""

  const guidanceLines = allCodes
    .filter((c) => QUESTION_GUIDANCE[c])
    .map((c) => `  ${c}: ${QUESTION_GUIDANCE[c]}`)
    .join("\n")

  const userPrompt = `Create a ${lessonLength} lesson plan for Grade ${grade} ${subject} using the following bookmarked resources.

Template: ${lessonTemplate}
${teacherNotes ? `Teacher notes: ${teacherNotes}` : ""}
${classroomResourcesLine}
${includeAssessmentData ? "Include targeted differentiation strategies based on recent assessment data." : ""}

Resources to incorporate:
${resourceList}

Ontario curriculum codes available: ${allCodes.join(", ")}

You will also write "assessmentQuestions": a short auto-graded formative quick check, anchored in the SPECIFIC content of the lesson you are writing (not generic).
- If "curriculumCodesCovered" is non-empty: for EACH code in it, write exactly 2 questions — one "multiple-choice" and one "true-false" — and set each question's "code" to that curriculum code.
- If "curriculumCodesCovered" is empty: identify 3 to 5 key concepts you actually taught and write 1-2 questions per concept (mix of types), setting each "code" to a short 2-4 word concept label (e.g., "Circumference and pi").
- Multiple-choice: exactly 4 options with exactly one correct answer; "correctIndex" is the 0-based index of the correct option; distractors must be plausible.
- Every question needs a one-sentence "explanation" of the correct answer. Do NOT write open-ended or free-text questions.
${guidanceLines ? `Contextual guidance for the relevant expectations (angles worth probing — still anchor in this lesson):\n${guidanceLines}` : ""}

Return a JSON object with exactly these fields (string values are plain text, no markdown):
{
  "title": "Creative lesson title",
  "curriculumCodesCovered": ["code1", "code2"],
  "mindsOnContent": "Hook/activation activity description (2-4 sentences)",
  "mindsOnDifferentiation": "Differentiation strategies for Minds On phase",
  "actionContent": "Main learning activity description with any stations or tasks",
  "actionDifferentiation": "Differentiation strategies for Action phase",
  "consolidationContent": "Closing/consolidation activity description",
  "consolidationAssessment": "Assessment notes — which codes may need follow-up and plan for next steps",
  "materialsContent": "Materials list and preparation steps",
  "assessmentQuestions": [
    { "code": "D1.1", "type": "multiple-choice", "prompt": "...", "options": ["a", "b", "c", "d"], "correctIndex": 0, "explanation": "..." },
    { "code": "D1.1", "type": "true-false", "prompt": "...", "correct": true, "explanation": "..." }
  ]
}`

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 5000,
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
    const start = rawText.indexOf("{")
    const end = rawText.lastIndexOf("}")
    const jsonText = start >= 0 && end > start ? rawText.slice(start, end + 1) : rawText

    let lesson: LessonPlanResponse
    try {
      lesson = JSON.parse(jsonText)
    } catch {
      return res.status(500).json({ error: "Claude returned malformed JSON. Please try again." })
    }

    console.log(
      `[generate-lesson] stop=${message.stop_reason} questions=${lesson.assessmentQuestions?.length ?? 0} codes=${lesson.curriculumCodesCovered?.length ?? 0}`,
    )

    return res.status(200).json(lesson)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    if (message.toLowerCase().includes("credit balance") || message.toLowerCase().includes("billing")) {
      return res.status(402).json({ error: "API_BALANCE_LOW", message })
    }
    return res.status(500).json({ error: message })
  }
}
