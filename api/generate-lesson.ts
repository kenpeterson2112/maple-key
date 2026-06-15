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

interface LevelCounts {
  level1: number
  level2: number
  level3: number
  level4: number
}

interface GenerateRequest {
  resources: ResourceInput[]
  lessonLength: string
  lessonTemplate: string
  teacherNotes: string
  includeAssessmentData: boolean
  classroomResources?: string[]
  planningAnswers?: PlanningAnswer[]
  classProgress?: Record<string, LevelCounts>
  reproducibleLanguage?: "English" | "French"
}

function formatClassProgress(progress: Record<string, LevelCounts>): string {
  const lines = Object.entries(progress)
    .filter(([, c]) => c.level1 + c.level2 + c.level3 + c.level4 > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, c]) => `  ${code}: ${c.level4} surpassing, ${c.level3} meeting, ${c.level2} approaching, ${c.level1} needs critical attention`)
  if (lines.length === 0) return ""
  return `Recent class assessment data (use to target differentiation, do not restate verbatim):
${lines.join("\n")}
Calibrate Minds On activation, Action scaffolding, and Consolidation depth accordingly. Where the class is mostly "needs critical attention" on a code, build in extra modelling and concrete examples. Where they are mostly "surpassing", offer extension prompts.`
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

interface LessonArtifact {
  name: string
  purpose: string
  section: "mindsOn" | "action" | "consolidation" | "materials"
}

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
    classroomMaterials: string[]
    preparation: string[]
  }
  artifacts?: LessonArtifact[]
  excludedResources?: { title: string; reason: string }[]
  assessmentQuestions?: AssessmentQuestion[]
  sections?: Array<{ id: string; label: string; subtitle: string; content: string; callout?: string }>
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

const TEMPLATE_SECTIONS: Record<string, Array<{ id: string; label: string; subtitle: string; calloutLabel: string }>> = {
  "5E Model": [
    { id: "engage", label: "Engage", subtitle: "Spark curiosity", calloutLabel: "Differentiation" },
    { id: "explore", label: "Explore", subtitle: "Investigate & discover", calloutLabel: "Differentiation" },
    { id: "explain", label: "Explain", subtitle: "Connect to concepts", calloutLabel: "Differentiation" },
    { id: "elaborate", label: "Elaborate", subtitle: "Deepen & extend", calloutLabel: "Differentiation" },
    { id: "evaluate", label: "Evaluate", subtitle: "Reflect & assess", calloutLabel: "Assessment Note" },
  ],
  "Madeline Hunter": [
    { id: "anticipatorySet", label: "Anticipatory Set", subtitle: "Hook & motivation", calloutLabel: "Differentiation" },
    { id: "directInstruction", label: "Direct Instruction", subtitle: "Input & modeling", calloutLabel: "Differentiation" },
    { id: "checkForUnderstanding", label: "Check for Understanding", subtitle: "Gauge & adjust", calloutLabel: "Differentiation" },
    { id: "guidedPractice", label: "Guided Practice", subtitle: "We do together", calloutLabel: "Differentiation" },
    { id: "independentPractice", label: "Independent Practice", subtitle: "You do", calloutLabel: "Differentiation" },
    { id: "closure", label: "Closure", subtitle: "Wrap up & reflect", calloutLabel: "Assessment Note" },
  ],
  "CLAASS": [
    { id: "connect", label: "Connect", subtitle: "Activate prior knowledge", calloutLabel: "Differentiation" },
    { id: "launch", label: "Launch", subtitle: "Introduce the concept", calloutLabel: "Differentiation" },
    { id: "activate", label: "Activate", subtitle: "Engage with content", calloutLabel: "Differentiation" },
    { id: "apply", label: "Apply", subtitle: "Practice & deepen", calloutLabel: "Differentiation" },
    { id: "share", label: "Share", subtitle: "Collaborate & discuss", calloutLabel: "Differentiation" },
    { id: "synthesize", label: "Synthesize", subtitle: "Reflect & consolidate", calloutLabel: "Assessment Note" },
  ],
}

const TEMPLATE_GUIDANCE: Record<string, string> = {
  "5E Model": `5E Model phase guidance: Engage — hook question, surprising demo, or short video to spark curiosity and surface prior knowledge; Explore — student-led hands-on investigation with minimal teacher input, students discover patterns; Explain — teacher formalizes concepts after exploration using direct instruction, connects student findings to vocabulary/theory; Elaborate — students apply concepts to a new context or problem, extending understanding; Evaluate — formative check, exit ticket, or self-reflection anchored in lesson objectives.`,
  "Madeline Hunter": `Madeline Hunter phase guidance: Anticipatory Set — brief hook that activates prior knowledge and motivates, states the objective; Direct Instruction — explicit teacher input with think-alouds and modeling (I Do); Check for Understanding — brief formative pause after modeling to gauge comprehension before releasing students (e.g., thumbs up/down, mini whiteboard, cold-call check), teacher adjusts pacing based on results; Guided Practice — whole-class or small-group practice with teacher support, immediate corrective feedback (We Do); Independent Practice — individual student work to consolidate and automate the skill (You Do); Closure — summarize key learning, preview next steps, exit ticket or reflection.`,
  "CLAASS": `CLAASS phase guidance: Connect — link to student lived experience and prior knowledge with a relevant real-world hook; Launch — teacher introduces the core concept, question, or challenge; Activate — students engage actively with content through a structured collaborative activity; Apply — students practice in authentic contexts, applying concepts to real problems; Share — structured peer sharing, discussion, or gallery walk to consolidate through social learning; Synthesize — individual reflection, writing, or exit task that connects today's learning to broader understanding.`,
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
    classProgress,
    reproducibleLanguage,
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

  const classroomMaterialsBlock =
    classroomResources && classroomResources.length > 0
      ? `Classroom materials the teacher has on hand — these are the ONLY pieces of equipment, technology, manipulatives, and digital tools you may build the lesson around:
${classroomResources.map((m) => `  - ${m}`).join("\n")}
Make deliberate, pedagogically sound use of the items that genuinely fit this content — decide HOW each is best deployed (concrete modelling, hands-on stations, guided exploration, partner work), do not merely name them. STRICT RULE: do NOT design any activity that depends on devices, software, manipulatives, or specialized equipment that is NOT in this list. If something not listed would help, adapt the activity to what IS available instead. Basic consumables (paper, pencils, markers, scissors, glue) and items the teacher produces themselves (handouts, capture sheets, exit tickets — list those under "artifacts") are always allowed.`
      : `The teacher has not listed any classroom equipment, technology, manipulatives, or digital tools. STRICT RULE: do NOT assume access to devices, software, manipulatives, or specialized equipment. Build the lesson around basic consumables (paper, pencils, markers) and teacher-produced handouts only (list those under "artifacts").`

  const classProgressBlock =
    includeAssessmentData && classProgress ? formatClassProgress(classProgress) : ""

  const planningAnswersBlock =
    planningAnswers && planningAnswers.length > 0
      ? `The teacher has made these planning decisions — honour them in the lesson:\n${planningAnswers
          .map((a) => `  [${a.questionId}] ${a.questionPrompt}\n  → ${a.answer}`)
          .join("\n")}\nTreat each of the above as a binding choice, not a suggestion.`
      : ""

  const reproducibleLanguageBlock =
    reproducibleLanguage === "French"
      ? `LANGUAGE OVERRIDE FOR STUDENT HANDOUTS: Every entry in the "artifacts" array must have BOTH its "name" AND its "purpose" written ENTIRELY in Canadian French (français canadien), at an elementary reading level appropriate to Grade ${grade}. This is for a French Immersion classroom — these two fields become a printed student handout.
Both fields are full French sentences/phrases — even when the artifact itself is ABOUT French vocabulary or lists French words as content, the "purpose" field describing it must ALSO be written in French, not just the "name". For example:
  WRONG (only "name" translated): { "name": "Feuille de vocabulaire — Les directions", "purpose": "Students color-code and label direction words (gauche, droite, nord, sud, est, ouest) with arrows and symbols to reinforce recognition.", "section": "action" }
  CORRECT (both translated, "section" untouched): { "name": "Feuille de vocabulaire — Les directions", "purpose": "Les élèves colorient et étiquettent les mots de direction (gauche, droite, nord, sud, est, ouest) à l'aide de flèches et de symboles pour renforcer leur reconnaissance.", "section": "action" }
Do NOT translate anything else: every artifact's "section" value MUST remain exactly one of "mindsOn", "action", "consolidation", or "materials" (these are code keys, not display text), and the lesson title, learning goal, success criteria, lesson body content, differentiation, materials, and assessment questions MUST stay in English.
Before finalizing your response, re-check every single artifact entry: if "name" is in French, "purpose" must also be in French. Fix any entry where only one of the two was translated.`
      : ""

  const templateSections = TEMPLATE_SECTIONS[lessonTemplate]
  const isThreePart = !templateSections

  const templateGuidance = TEMPLATE_GUIDANCE[lessonTemplate] ?? ""

  const sectionsSchema = templateSections
    ? templateSections
        .map(
          (s) =>
            `  { "id": "${s.id}", "label": "${s.label}", "subtitle": "${s.subtitle}", "content": "...", "callout": "${s.calloutLabel} strategies or notes for this phase" }`,
        )
        .join(",\n")
    : ""

  const userPrompt = `Create a ${lessonLength} lesson plan for Grade ${grade} ${subject} using the following bookmarked resources.

Template: ${lessonTemplate}
${templateGuidance}
${teacherNotes ? `Teacher notes: ${teacherNotes}` : ""}
${classroomMaterialsBlock}
${classProgressBlock}
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

${isThreePart ? `Return a JSON object with exactly these fields (string values are plain text, no markdown):
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
    "classroomMaterials": ["Exact label copied from the classroom materials list above"],
    "preparation": ["What to print or photocopy", "What to pre-load or test on devices", "How to set up the room"]
  },
  "artifacts": [
    { "name": "Guided capture sheet", "purpose": "Students record observations during the museum exploration", "section": "action" }
  ],
  "excludedResources": [
    { "title": "Resource title", "reason": "One-line reason it was not used" }
  ],
  "assessmentQuestions": [
    { "code": "D1.1", "type": "multiple-choice", "prompt": "...", "options": ["a", "b", "c", "d"], "correctIndex": 0, "explanation": "..." },
    { "code": "D1.1", "type": "true-false", "prompt": "...", "correct": true, "explanation": "..." }
  ]
}` : `Return a JSON object with exactly these fields (string values are plain text, no markdown):
{
  "title": "Creative lesson title",
  "learningGoal": "One student-facing sentence describing what students will learn today",
  "successCriteria": ["I can ...", "I can ...", "I can ..."],
  "curriculumCodesCovered": ["code1", "code2"],
  "sections": [
${sectionsSchema}
  ],
  "materials": {
    "resources": ["Resource title 1", "Resource title 2"],
    "classroomMaterials": ["Exact label copied from the classroom materials list above"],
    "preparation": ["What to print or photocopy", "What to pre-load or test on devices", "How to set up the room"]
  },
  "excludedResources": [
    { "title": "Resource title", "reason": "One-line reason it was not used" }
  ],
  "assessmentQuestions": [
    { "code": "D1.1", "type": "multiple-choice", "prompt": "...", "options": ["a", "b", "c", "d"], "correctIndex": 0, "explanation": "..." },
    { "code": "D1.1", "type": "true-false", "prompt": "...", "correct": true, "explanation": "..." }
  ]
}`}

"successCriteria" must have 2-3 items written as student-facing "I can..." statements. "materials.preparation" must never be empty — always include at least one concrete step (e.g. what to print, pre-load, set up, or test before class). "materials.classroomMaterials" must list ONLY items from the classroom materials list above that this lesson actually uses, copied verbatim with the exact labels given — never invent or rename one, and never list anything that was not in that list; return an empty array if the lesson uses none (or none were provided). "excludedResources" may be an empty array if all provided resources fit the lesson.

"artifacts" must list every concrete classroom artifact the teacher will need to produce or bring — examples: guided capture sheet, exit ticket, sticky-note reflection template, T-chart, observation sheet, workbook activity, reflection prompt handout. One entry per artifact. Use the artifact's most natural short name in "name". In "purpose", write one short phrase describing what students do with it. In "section", indicate which lesson section ("mindsOn", "action", "consolidation", "materials") it's used in. Do NOT list pre-existing bookmarked resources (those go in "materials.resources"); only list artifacts the teacher must produce or supply themselves. If the lesson genuinely needs no artifacts, return an empty array.

${reproducibleLanguageBlock}`

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

    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? "unknown"
    const userEmail = (req.headers["x-user-email"] as string | undefined) ?? ""
    console.log(JSON.stringify({
      event: "lesson_generated",
      ts: new Date().toISOString(),
      user: userEmail || null,
      ip,
      ua: req.headers["user-agent"] ?? "",
      grade,
      subject,
      province: null,
      lessonTemplate,
      lessonLength,
      codesCount: lesson.curriculumCodesCovered?.length ?? 0,
      codes: lesson.curriculumCodesCovered ?? [],
      resourcesCount: resources.length,
      classroomMaterialsCount: lesson.materials?.classroomMaterials?.length ?? 0,
      planningAnswersCount: planningAnswers?.length ?? 0,
      excludedCount: lesson.excludedResources?.length ?? 0,
      assessmentQuestionsCount: lesson.assessmentQuestions?.length ?? 0,
      stop: message.stop_reason,
      tokensIn: message.usage?.input_tokens ?? 0,
      tokensOut: message.usage?.output_tokens ?? 0,
    }))

    return res.status(200).json(lesson)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    if (message.toLowerCase().includes("credit balance") || message.toLowerCase().includes("billing")) {
      return res.status(402).json({ error: "API_BALANCE_LOW", message })
    }
    return res.status(500).json({ error: message })
  }
}
