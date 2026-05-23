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

  const userPrompt = `Create a ${lessonLength} lesson plan for Grade ${grade} ${subject} using the following bookmarked resources.

Template: ${lessonTemplate}
${teacherNotes ? `Teacher notes: ${teacherNotes}` : ""}
${classroomResourcesLine}
${includeAssessmentData ? "Include targeted differentiation strategies based on recent assessment data." : ""}

Resources to incorporate:
${resourceList}

Ontario curriculum codes available: ${allCodes.join(", ")}

Return a JSON object with exactly these fields (all values are plain text strings, no markdown):
{
  "title": "Creative lesson title",
  "curriculumCodesCovered": ["code1", "code2"],
  "mindsOnContent": "Hook/activation activity description (2-4 sentences)",
  "mindsOnDifferentiation": "Differentiation strategies for Minds On phase",
  "actionContent": "Main learning activity description with any stations or tasks",
  "actionDifferentiation": "Differentiation strategies for Action phase",
  "consolidationContent": "Closing/consolidation activity description",
  "consolidationAssessment": "Assessment notes — which codes may need follow-up and plan for next steps",
  "materialsContent": "Materials list and preparation steps"
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

    const rawText = message.content[0].type === "text" ? message.content[0].text : ""

    let lesson: LessonPlanResponse
    try {
      lesson = JSON.parse(rawText)
    } catch {
      return res.status(500).json({ error: "Claude returned malformed JSON. Please try again." })
    }

    return res.status(200).json(lesson)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    if (message.toLowerCase().includes("credit balance") || message.toLowerCase().includes("billing")) {
      return res.status(402).json({ error: "API_BALANCE_LOW", message })
    }
    return res.status(500).json({ error: message })
  }
}
