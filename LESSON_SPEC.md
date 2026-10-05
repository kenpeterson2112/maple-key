# Lesson spec

The reference for what a generated Maple Key lesson must contain. It replaces
the lesson plan "skill" referred to in planning: that structure only ever
existed as the prompt inside `api/generate-lesson.ts`, which had not been
revisited since it was first built. This file pulls it out so it can be read,
reviewed, and later validated against.

**Where it lives in code:** the prompt in `api/generate-lesson.ts` (the
`userPrompt` JSON shape and the rules under it). A second copy, used when a
teacher pastes the prompt into another AI, is `buildManualPrompt` in
`src/components/lesson-planner/lesson-export.ts`. Change this file and both
copies together.

## Shape

The default and prototype shape is the Ontario three-part lesson. Every field
below is required unless marked optional.

| Field | What it holds |
|---|---|
| `title` | Lesson title |
| `learningGoal` | One student-facing sentence: what students learn today |
| `successCriteria` | 2 to 3 student-facing "I can..." statements |
| `curriculumCodesCovered` | Expectation codes the lesson teaches. Only codes that were provided in the prompt |
| `mindsOnContent` / `mindsOnDifferentiation` | Minds On (activating prior knowledge), about 17% of the time |
| `actionContent` / `actionDifferentiation` | Action (exploring and applying), about 58% of the time |
| `consolidationContent` / `consolidationAssessment` | Consolidation (reflecting and connecting), about 25%, plus an assessment note on which codes may need follow-up |
| `equityFraming` | **New.** CRRP and equity framing for this lesson (see below) |
| `reflectionCheckpoint` | **New.** One moment where students check their learning against the success criteria (see below) |
| `materials` | `resources` (titles actually used), `classroomMaterials` (only items the teacher listed, verbatim), `preparation` (never empty) |
| `artifacts` | Handouts and sheets the teacher must produce, each tagged with the section it is used in |
| `excludedResources` | Provided resources that did not fit, each with a one-line reason |
| `assessmentQuestions` | 3 to 5 auto-graded quick-check questions, one per taught expectation |

The 5E, Madeline Hunter, and CLAASS templates replace the three phase fields
with a `sections` array. Everything else, including the two new fields, is
shared across templates.

### `equityFraming` (CRRP and equity)

Two to four sentences specific to this lesson's content, drawing on
Culturally Responsive and Relevant Pedagogy (CRRP). It should say:

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
3. The new fields show on screen and in the PDF, but are not yet editable.
