# Handoff prompt — assessment/progress dashboard brainstorm (for Gemini)

Paste everything below the line into Gemini. It is self-contained: it carries the
product intent, the exact data shapes available, the constraints that make most
generic "student analytics dashboard" ideas inapplicable, and the decisions the
dashboard has to support.

---

You are helping me brainstorm the design of an **assessment / progress dashboard**
for a teacher-facing lesson-planning tool. I want divergent, concrete ideas —
not a generic analytics dashboard. Read the constraints carefully, because they
rule out most of what a standard "student analytics" product would do.

## The product

**Maple Key** is an AI lesson-planning tool for **Ontario K–12 teachers**. Three
pillars: resource discovery (curated Ontario-aligned resources), AI lesson
planning, and assessment bundled into each generated lesson. There is a
mobile companion surface — "Acorn Lesson Remote Control" — that a teacher holds
while teaching, which is where the assessment ("Quick Check") is actually run
during class.

The teacher is a busy classroom generalist, not a data analyst. They typically
look at this on a phone between periods, or on a laptop on a Sunday while
planning the week.

## What the tool measures, and how

Every AI-generated lesson declares the **Ontario curriculum expectation codes**
it covers. At the end of a lesson, the teacher runs a **Quick Check**: a short
set of AI-generated multiple-choice / true-false questions, each tagged with the
expectation code it assesses. Roughly **one question per expectation**.

Responses are recorded on the teacher's device in one of two ways:
- **Individual** — teacher (or a student) answers on the device, one record at a time.
- **Group** — teacher taps "Group", picks a count N ("12 students got this"), and
  one set of answers is recorded N times.

If no AI questions were generated, there's a **self-rating fallback**: students
rate their own understanding per expectation ("got it" / "not yet").

Each response is scored into an Ontario **Growing Success proficiency level**:

| Level | Meaning |
|---|---|
| `level1` | Needs critical attention (limited understanding) |
| `level2` | Approaching the provincial standard |
| `level3` | Meeting the provincial standard |
| `level4` | Surpassing the provincial standard |

**Important scoring quirk to design around:** because a quick check usually asks
only one question per expectation, the graded result per expectation is
effectively binary — correct → `level4`, incorrect → `level1`. A partial score
(only possible when a code carries multiple questions) maps to `level2`.
Self-ratings map to `level4` / `level2`. So `level3` is rarely populated in real
data, and the distributions are spikier and coarser than a real gradebook. A
design that leans hard on a smooth four-band distribution will look wrong on
real data. Sample/demo data, by contrast, is generated with realistic
four-band spreads — so don't calibrate purely on screenshots of sample data.

## The exact data available

Everything is stored client-side (localStorage). **There is no database and no
student roster.**

### 1. Assessment tallies — one record per lesson

```ts
LessonTally {
  lessonId: string
  title: string          // lesson title
  grade: string          // e.g. "7"
  subject: string        // e.g. "science", "social_studies", "history", "geography"
  codes: string[]        // expectation codes the lesson TAUGHT (may exceed what was assessed)
  updatedAt: number      // epoch ms of the most recent recorded response
  attempts: number       // total responses recorded for this lesson
  byExpectation: Record<string, LevelCounts>   // per expectation code
}

LevelCounts { level1: number; level2: number; level3: number; level4: number }
```

That is the whole assessment dataset. Note what is **absent**:
- no student identities, no per-student rows, no way to follow an individual over time
- no per-response timestamps — only `updatedAt` per lesson
- no item-level response data retained (which distractor was chosen is not stored)
- no time-on-task, no attendance, no demographics, no IEP/accommodation flags

### 2. Curriculum code structure (subject- and grade-aware labels)

Codes are `<strand letter><overall number>[.<specific number>]`:
- `D` = **strand** (e.g. "Data Literacy") — grouping level
- `D1` = **overall expectation** — the level the dashboard mainly reports on
- `D1.1` = **specific expectation** — the drill-down level, and what questions are tagged with

Human-readable labels exist per subject (and per grade for History/Geography,
whose strands are renamed each grade). A code with no label degrades to the bare
code string. So any design must survive "we only have `B2.3`, no title" for some rows.

### 3. Derived measures already computed in code

- **Roll-up**: specific → overall → strand, by summing `LevelCounts`.
- **Readiness level** per code, count-weighted: `great` (≥80% level4) / `good`
  (≥50% level3+level4) / `okay` / `poor` (≥50% level1). Rendered today as
  Excelling / Strong / Developing / Needs attention.
- **Coverage fraction** per overall/strand: `assessed specifics / taught specifics` —
  i.e. how much of what was taught has actually been checked. This distinguishes
  "we're doing badly at B2" from "we've barely checked B2."
- **Urgency score**: `%level1 − %level4`, used to sort what needs attention first;
  codes with no data sort last.
- **Frontier index**: walking curriculum-ordered codes, the first one with no
  data or still `poor`/`okay` — i.e. where the class actually is in the sequence.

### 4. Lesson log (last 20 lessons)

```ts
LessonMetadata {
  id, timestamp, title, grade, subject
  curriculumCodesCovered: string[]
  resourceIds: string[]
  lessonLength?: string
  lessonTemplate?: string
  fullContent?: {                 // the generated lesson itself
    learningGoal?, successCriteria?: string[]
    mindsOnContent, mindsOnDifferentiation
    actionContent, actionDifferentiation
    consolidationContent, consolidationAssessment
    materials?: { resources, classroomMaterials, preparation }
    artifacts?: { name, purpose, section, status }[]   // handouts/organizers
  }
}
```

Tallies are snapshots, so assessment history outlives the 20-lesson log cap.

### 5. Resource library (~2.5 MB static JSON, read-only at runtime)

Each resource carries: `topic_title`, `description`, `url`, `publisher_creator`,
`grade_level[]`, `subject`, `strand[]`, `curriculum_expectations[]`, alignments
with `alignment_strength` (primary/secondary), `resource_type`, `modality[]`,
`accessibility[]`, `access_type`, plus pedagogical metadata:
`pedagogical_function` (one of: hook, core_teaching, guided_practice,
independent_practice, assessment, extension), `instructional_modes`
(whole-class / small-group / individual / station-rotation),
`estimated_minutes`, and `usage_notes`.

**This is the bridge from insight to action:** an expectation code that reads
"needs attention" can be matched directly to resources aligned to that same code,
filtered by pedagogical function (e.g. re-teach with `core_teaching`, or extend
with `extension`). Class progress can also be fed into the lesson generator so
the next lesson is targeted and differentiated.

## What the dashboard is for

The dashboard must let a teacher, **in under a minute**, answer three questions
at three different time horizons:

1. **Right after a lesson (today):** Did that land? Who needs what tomorrow?
   Which expectation from today's lesson is weak enough that I should not move on?
2. **Next-lesson decision (this week):** What should I teach next — re-teach,
   consolidate, or advance? Which specific expectations should the next lesson
   target, and with which resources/grouping?
3. **Long-range planning (term/year):** Where is the class in the curriculum
   sequence? What have I taught but never assessed? What have I not touched at
   all? Am I on pace across strands, and what's my evidence when writing report
   cards or talking to a parent, principal, or a special-ed teacher?

The core tension to design for: **coverage vs. proficiency.** A strand can be
green because students did well on the one thing that was checked, while 80% of
its expectations were never assessed. Teachers need to feel that difference
instantly, without reading a legend.

A second tension: **evidence strength.** 4 responses and 96 responses look
identical in a percentage bar. The design has to convey confidence/sample size
without turning into a statistics lecture.

## Constraints — please respect these

- **Anonymous aggregates only.** No named students, no per-student trend lines,
  no "students at risk" lists. Everything is class-level counts. (This is a
  deliberate privacy stance, not a gap to fill.) Ideas that require per-student
  data must be flagged as such.
- **No database.** Client-side storage, single teacher, single device.
- Data is **sparse and lumpy**: a teacher may have 3 lessons in one strand and
  nothing anywhere else. Empty and near-empty states are the *normal* state,
  not an edge case — design for them first, not last.
- **Mobile-first.** The primary read may happen on a phone, standing up, between
  classes. Assume interruption.
- Ontario **Growing Success** language matters to these teachers — level 1–4 and
  "meeting the provincial standard" are the vocabulary they already use, and
  report-card-adjacent framing is a feature.
- Existing visual language (which you may keep, extend, or argue against): a
  warm cream/maple-orange palette, and "proficiency orbs" — circular glyphs whose
  fill encodes coverage and whose color encodes the proficiency mix — arranged in
  expandable strand → overall → specific rows.

## What I want from you

Brainstorm broadly, then converge. Specifically:

1. **Five to eight distinct dashboard concepts**, each with a one-line thesis
   ("this dashboard is organized around ___"). Make them genuinely different in
   organizing principle — e.g. curriculum-sequence-oriented, decision-oriented,
   time-oriented, gap-oriented, question-oriented — not five skins of the same
   bar chart.
2. For the strongest two or three, sketch the **actual layout** in words: what
   is above the fold on a phone, what the first glance communicates in ~3
   seconds, what expands on tap, and what the teacher taps to *act* (generate a
   re-teach lesson, pick a resource, run another quick check).
3. **Encoding proposals**: how to simultaneously show proficiency mix, coverage
   fraction, and sample size in one compact glyph or row. Critique the orb idea
   above — is it doing too much? Offer at least two alternatives.
4. **The "what next" surface**: given only the data listed, what is the most
   defensible way to recommend a next lesson? Propose the ranking logic in plain
   language (inputs → ordering → what's shown), and say where it would mislead a
   teacher and how the UI should hedge.
5. **Long-range view**: propose how to render a term/year picture — curriculum
   coverage, pacing, and evidence for reporting — when there is no per-student
   data and no reliable time series beyond per-lesson `updatedAt`.
6. **Sparse/empty-data strategy**: what the dashboard shows after one lesson,
   after five, and what earns its place onscreen at each stage.
7. **A short list of the highest-value data we do NOT currently capture** —
   ranked by (insight unlocked ÷ added teacher effort during class). For each,
   say what one extra tap or field during the Quick Check would buy. Be honest
   when an idea you like requires data we don't have; call it out explicitly
   rather than assuming it.

For each concept, name the **teacher decision** it improves and the **failure
mode** it invites (e.g. false confidence from thin data, over-indexing on a
single quick check, gaming coverage). I'd rather have five sharp, opinionated
concepts with stated tradeoffs than fifteen bland ones. Push back on anything in
my framing that you think is wrong.
