import Anthropic from "@anthropic-ai/sdk"
import type { VercelRequest, VercelResponse } from "@vercel/node"

const LESSON_MODEL = "claude-haiku-4-5-20251001"

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

interface PlanningAnswer {
  questionId: string
  questionPrompt: string
  answer: string
}

interface GenerateRequest {
  resources: ResourceInput[]
  lessonLength: string
  lessonTemplate: string
  teacherNotes: string
  includeAssessmentData: boolean
  classroomResources?: string[]
  planningAnswers?: PlanningAnswer[]
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
  learningGoal: string
  successCriteria: string[]
  curriculumCodesCovered: string[]
  mindsOnContent: string
  mindsOnDifferentiation: string
  actionContent: string
  actionDifferentiation: string
  consolidationContent: string
  consolidationAssessment: string
  materials: {
    resources: string[]
    preparation: string[]
  }
  excludedResources?: { title: string; reason: string }[]
  assessmentQuestions?: AssessmentQuestion[]
}

function extractJson(text: string): string {
  const trimmed = text.trim()
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed
}

function collectText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = new Anthropic()
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const {
    resources,
    lessonLength,
    lessonTemplate,
    teacherNotes,
    includeAssessmentData,
    classroomResources,
    planningAnswers,
  } = req.body as GenerateRequest

  if (!resources || resources.length === 0) {
    return res.status(400).json({ error: "At least one resource is required" })
  }

  const allCodes = [...new Set(resources.flatMap((r) => r.curriculum_expectations ?? []))]
  const grade = resources[0].grade ?? "unknown"
  const subject = resources[0].subject ?? "unknown"

  const resourceList = resources
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

  const systemPrompt = `You are an experienced Ontario elementary school teacher and curriculum expert. You create clear, practical, standards-aligned lesson plans for Canadian classrooms. You always respond with valid JSON only — no markdown fences, no extra text.

Instructional structure guidance: Each resource may include a "Best used as" field and a "Deployment note" — use these to inform how you structure the lesson. Station rotation and centre-based learning are excellent, well-established strategies; choose them when resources list "station-rotation" in "Best used as", when the teacher's notes or template suggest it, or when multiple hands-on materials are naturally suited to it. For flexible resources (interactive tools, digital content, video), match the approach to the context — whole-class discussion, individual exploration, or partner work may serve the lesson better than stations. Let the resources and teacher intent guide the structure, not a default habit.`

  const classroomResourcesLine =
    classroomResources && classroomResources.length > 0
      ? `Classroom resources available: ${classroomResources.join(", ")}`
      : ""

  const planningAnswersBlock =
    planningAnswers && planningAnswers.length > 0
      ? `The teacher has made these planning decisions — honour them in the lesson:\n${planningAnswers
          .map((a) => `  [${a.questionId}] ${a.questionPrompt}\n  → ${a.answer}`)
          .join("\n")}\nTreat each of the above as a binding choice, not a suggestion.`
      : ""

  const userPrompt = `Create a ${lessonLength} lesson plan for Grade ${grade} ${subject} using the following bookmarked resources.

Template: ${lessonTemplate}
${teacherNotes ? `Teacher notes: ${teacherNotes}` : ""}
${classroomResourcesLine}
${includeAssessmentData ? "Include targeted differentiation strategies based on recent assessment data." : ""}
${planningAnswersBlock}

Resources to incorporate:
${resourceList}

Ontario curriculum codes available: ${allCodes.join(", ")}

Resource-mismatch rule: If any provided resource does not fit the topic or curriculum codes of this lesson, do NOT use it. List it in "excludedResources" with a one-line reason. "materials.resources" must only contain titles of resources you actually use.

You will also write "assessmentQuestions": a short auto-graded formative quick check anchored in the SPECIFIC content of the lesson you are writing (not generic).
- If "curriculumCodesCovered" is non-empty: for EACH code in it, write exactly 2 questions — one "multiple-choice" and one "true-false" — and set each question's "code" to that curriculum code.
- If "curriculumCodesCovered" is empty: identify 3 to 5 key concepts you actually taught and write 1-2 questions per concept (mix of types), setting each "code" to a short 2-4 word concept label (e.g., "Circumference and pi").
- Multiple-choice: exactly 4 options with exactly one correct answer; "correctIndex" is the 0-based index of the correct option; distractors must be plausible.
- Every question needs a one-sentence "explanation" of the correct answer. Do NOT write open-ended or free-text questions.

Return a JSON object with exactly these fields (string values are plain text, no markdown):
{
  "title": "Creative lesson title",
  "learningGoal": "One student-facing sentence describing what students will learn today",
  "successCriteria": ["I can ...", "I can ...", "I can ..."],
  "curriculumCodesCovered": ["code1", "code2"],
  "mindsOnContent": "Hook/activation activity description (2-4 sentences)",
  "mindsOnDifferentiation": "Differentiation strategies for Minds On phase",
  "actionContent": "Main learning activity description with any stations or tasks",
  "actionDifferentiation": "Differentiation strategies for Action phase",
  "consolidationContent": "Closing/consolidation activity description",
  "consolidationAssessment": "Assessment notes — which codes may need follow-up and plan for next steps",
  "materials": {
    "resources": ["Resource title 1", "Resource title 2"],
    "preparation": ["What to print or photocopy", "What to pre-load or test on devices", "How to set up the room"]
  },
  "excludedResources": [
    { "title": "Resource title", "reason": "One-line reason it was not used" }
  ],
  "assessmentQuestions": [
    { "code": "D1.1", "type": "multiple-choice", "prompt": "...", "options": ["a", "b", "c", "d"], "correctIndex": 0, "explanation": "..." },
    { "code": "D1.1", "type": "true-false", "prompt": "...", "correct": true, "explanation": "..." }
  ]
}

"successCriteria" must have 2-3 items written as student-facing "I can..." statements. "materials.preparation" must never be empty — always include at least one concrete step (e.g. what to print, pre-load, set up, or test before class). "excludedResources" may be an empty array if all provided resources fit the lesson.`

  try {
    const message = await client.messages.create({
      model: LESSON_MODEL,
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

    const rawText = collectText(message.content)

    let lesson: LessonPlanResponse
    try {
      lesson = JSON.parse(extractJson(rawText))
    } catch {
      return res.status(500).json({ error: "Claude returned malformed JSON. Please try again." })
    }

    console.log(
      `[generate-lesson] stop=${message.stop_reason} questions=${lesson.assessmentQuestions?.length ?? 0} codes=${lesson.curriculumCodesCovered?.length ?? 0} planningAnswers=${planningAnswers?.length ?? 0} excluded=${lesson.excludedResources?.length ?? 0}`,
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
