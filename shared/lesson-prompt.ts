// The writing-style half of the lesson prompt, written once for both copies:
// api/generate-lesson.ts and the manual-fallback prompt in
// src/components/lesson-planner/lesson-export.ts. Spec: LESSON_SPEC.md →
// "Scannable by default". Change the spec and this text together.

/** Example values for the step-list fields, as they appear in the JSON shape shown to the model. */
export const STEPS_EXAMPLE = `["First thing the teacher does (3 min)", "Next step", "Next step"]`
export const SUMMARY_EXAMPLE = `"One plain sentence saying what happens in this stage"`
export const DIFFERENTIATION_EXAMPLE = `["Support: ...", "Extend: ..."]`
export const ASSESSMENT_NOTE_EXAMPLE = `["Look for: ...", "Next step: ..."]`

/**
 * @param summaryFields the one-line stage summaries, e.g. `"mindsOnSummary", "actionSummary" and "consolidationSummary"`
 * @param stepFields how the prompt names the stage fields, e.g. `"mindsOnContent", "actionContent" and "consolidationContent"`
 * @param supportFields the differentiation fields, e.g. `"mindsOnDifferentiation" and "actionDifferentiation"`
 * @param assessmentField the closing assessment note, e.g. `"consolidationAssessment"`
 */
export function lessonStyleRules(summaryFields: string, stepFields: string, supportFields: string, assessmentField: string): string {
  return `WRITING STYLE. A teacher reads this plan at a glance, standing up, minutes before class. Write for scanning, not for reading. Cut anything they would skip.

${summaryFields} are each ONE plain sentence, 18 words or fewer, saying what the class actually does in that stage, naming the concrete activity or material ("Students debate which of two cut bannock rounds gives the bigger share."). Write them last, as a set: read top to bottom with nothing else, they must work as a short paragraph that tells a teacher the whole lesson. So each one follows on from the one before, none repeats the stage's name or its purpose ("activates prior knowledge"), and none is a list of steps.

${stepFields} are each an array of 3 to 6 steps, in the order they happen. One step is one thing the teacher or the students do, in 20 words or fewer, starting with a verb ("Show the photo and ask...", "Pairs sort the cards..."). Put a time in brackets where it helps pacing. Give the exact question or prompt to use where one matters. No paragraphs, no rationale, no restating the learning goal.

${supportFields} are each an array of 2 or 3 items, each one concrete move starting with "Support:" or "Extend:", in 20 words or fewer. Name the move itself (a sentence starter, a smaller number set, a partner role), never a general strategy like "provide scaffolding".

${assessmentField} is an array of exactly 2 items: "Look for: ..." (what shows a student has it, naming the expectation code) and "Next step: ..." (what to do for students who are not there yet). 25 words or fewer each.

"equityFraming" is 1 or 2 sentences, 45 words at most, specific to THIS lesson's content: the one or two most useful ways it connects to students' identities, cultures, languages or lived experiences, brings in other perspectives (First Nations, Métis and Inuit perspectives where they genuinely fit the content, never as a token add-on), or removes a barrier to the success criteria. A statement that would fit any lesson is not acceptable.

"reflectionCheckpoint" is one line: when it happens, then the exact student-facing prompt. It is a self-assessment against the success criteria, not another quiz question.

Each "materials.preparation" item is one action in 15 words or fewer.`
}
