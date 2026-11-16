# Lesson spec

The reference for what a generated Maple Key lesson must contain. It replaces
the lesson plan "skill" referred to in planning: that structure only ever
existed as the prompt inside `api/generate-lesson.ts`, which had not been
revisited since it was first built. This file pulls it out so it can be read,
reviewed, and later validated against.

**Where it lives in code:** the prompt in `api/generate-lesson.ts` (the
`userPrompt` JSON shape and the rules under it). A second copy, used when a
teacher pastes the prompt into another AI, is `buildFullPrompt` in
`src/components/lesson-planner/lesson-export.ts`. The writing-style rules are
written once, in `shared/lesson-prompt.ts`, and both copies import them. Change
this file and the prompts together.

## Shape

The default and prototype shape is the Ontario three-part lesson. Every field
below is required unless marked optional.

| Field | What it holds |
|---|---|
| `title` | Lesson title |
| `learningGoal` | One student-facing sentence: what students learn today |
| `successCriteria` | 2 to 3 student-facing "I can..." statements |
| `curriculumCodesCovered` | Expectation codes the lesson teaches. Only codes that were provided in the prompt |
| `mindsOnSummary` / `actionSummary` / `consolidationSummary` | One sentence per stage saying what the class does. Read in order they summarize the lesson (see "Scannable by default") |
| `mindsOnContent` / `mindsOnDifferentiation` | Minds On (activating prior knowledge), about 17% of the time. Steps, and "Support:" / "Extend:" moves |
| `actionContent` / `actionDifferentiation` | Action (exploring and applying), about 58% of the time. Steps, and "Support:" / "Extend:" moves |
| `consolidationContent` / `consolidationAssessment` | Consolidation (reflecting and connecting), about 25%. Steps, plus a two-line assessment note: "Look for:" and "Next step:" |
| `equityFraming` | CRRP and equity framing for this lesson, one or two sentences (see below) |
| `reflectionCheckpoint` | One moment where students check their learning against the success criteria (see below) |
| `materials` | `resources` (titles actually used), `classroomMaterials` (only items the teacher listed, verbatim), `preparation` (never empty) |
| `artifacts` | Handouts and sheets the teacher must produce, each tagged with the section it is used in |
| `excludedResources` | Provided resources that did not fit, each with a one-line reason |
| `assessmentQuestions` | 3 to 5 auto-graded quick-check questions, one per taught expectation |

The 5E, Madeline Hunter, and CLAASS templates replace the three phase fields
with a `sections` array. Each section has its own `summary`, its `content` is a step list and its `callout`
is the differentiation moves (the last section's is the assessment note).
Everything else is shared across templates.

## Scannable by default

Teacher feedback (November 2026): the plan was too text-heavy to use. A teacher
reads it at a glance, minutes before class, so every stage is a list of short
steps, never a paragraph.

- **Each stage opens with a one-sentence summary** (18 words or fewer) naming
  the concrete activity. It is the most prominent line in the stage. The
  summaries are written as a set: read top to bottom with nothing else, they
  are a short paragraph that explains the whole lesson. So none restates the
  stage's name or purpose, and none is a list of steps.
- **Stage content** is 3 to 6 steps in order, each one thing the teacher or
  students do, 20 words or fewer, starting with a verb. Times in brackets where
  they help pacing. The exact question or prompt where one matters. No
  rationale.
- **Differentiation** is 2 or 3 concrete moves, each starting "Support:" or
  "Extend:". A named move, never a general strategy.
- **The assessment note** is exactly two lines: "Look for:" (naming the
  expectation code) and "Next step:".

**On the wire** the model returns these as JSON arrays of strings (an array
cannot break on a raw newline the way a long string can). `normalizeLessonLines`
in `shared/lesson-lines.ts` joins each into one newline-separated string, which
is what the app stores, edits and exports. A lesson saved before this change
holds a paragraph and still displays as one.

**On screen** (`generated-lesson.tsx`) the expectations covered sit in the
header as chips, each stage leads with its summary in the heading face, the
steps show as bullet lists, and the secondary material is
collapsed until asked for: differentiation inside each stage, the equity note
and unused resources at the foot. The reflection checkpoint shows in the last
stage as "Student self-check". The PDF prints everything expanded, with the
equity note last.

### `equityFraming` (CRRP and equity)

One or two sentences (45 words at most) specific to this lesson's content,
drawing on Culturally Responsive and Relevant Pedagogy (CRRP). It is a note to
the teacher, shown collapsed, so it names only the one or two most useful of:

- how the lesson connects to students' identities, cultures, languages, and
  lived experiences;
- whose perspectives or knowledge the lesson brings in, including First
  Nations, Métis, and Inuit perspectives where they genuinely fit the content,
  never as a token add-on;
- how the lesson removes barriers so every student can reach the success
  criteria.

A statement that would fit any lesson does not meet the spec.

### `reflectionCheckpoint`

One point in the lesson, usually during Consolidation, where students judge
their own progress against the success criteria. It states when it happens and
gives the exact student-facing prompt. It is a self-assessment, not another
quiz question.

## Model

`api/generate-lesson.ts` reads the model from the `LESSON_MODEL` environment
variable, limited to the list in `LESSON_MODELS` (default: Claude Haiku 4.5).
`LESSON_EFFORT` (low, medium, high) tunes the 5.5 models. To compare models on
the same request, run `node scripts/compare-lesson-models.mjs` (see its header).

## Continuation lessons

A teacher can start a lesson that continues an earlier one. They pick it in the
planner ("Build on a previous lesson?"), or start from "Plan next lesson" on a
library card or after generating. The request then carries a
`continuation` summary of that lesson. It is built in `src/lib/lesson-sequence.ts`,
capped field by field and formatted once in `shared/lesson-continuation.ts`.
It holds the earlier lesson's title, learning goal, success criteria,
expectations, short activity excerpts, planned consolidation, reflection
checkpoint, resources used, and any quick-check results.

The prompt presents this as **context, not rules**. The model builds naturally
from what the class just did. Nothing forces how the lesson opens, which codes it
targets, or which activities it avoids. **The teacher's notes win.** If they say
the class got somewhere other than the planned consolidation, the lesson follows
the notes. The planning questions don't change for a continuation. The saved
lesson keeps a `continuesFrom` link, which the library uses to nest lessons into
sequences.

## Rules the output must follow

- **Cite only provided expectations.** `curriculumCodesCovered` and every
  `assessmentQuestions[].code` must come from the codes given in the prompt.
- **Classroom materials are a closed list.** Never design around equipment the
  teacher did not list. No-Tech Mode further bars student-facing devices.
- **Resources that do not fit are excluded, not forced in.**
- **Teacher planning answers are binding**, not suggestions.
- **Language:** "not yet taught", never "gap".

## Not yet enforced

These are planned (see the October 2026 prototype brief) and are not built yet:

1. Expectations come from structured curriculum data (grade and subject,
   always with the paired Strand A expectations), not from resource tags.
2. A validator checks every response against this spec before a teacher sees
   it, and rejects any cited code that was not provided. Today the prompt
   still lets quick-check questions fall back to a short concept label when no
   code was covered; that fallback goes away when the validator lands.
3. `equityFraming` and `reflectionCheckpoint` show on screen and in the PDF,
   but are not yet editable.
4. The header lists the expectation codes covered. Showing each expectation's
   text, and which ones the assessment and next steps address, needs the
   structured curriculum data in item 1.
