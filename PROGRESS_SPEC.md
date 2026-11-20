# PROGRESS_SPEC.md — the Progress page (was "Track")

**Status:** agreed design, **not built yet** (2026-11-19). Build it in the PRs
listed under [Delivery plan](#delivery-plan), one at a time. When a part ships,
move its rules into CLAUDE.md and mark it done here.

## Why

The header's second bar (`subject-data-bar.tsx`) opens a drop-down with every
overall expectation by strand. It works for three or four overalls and is
cramped past that, and it is a second, smaller copy of what the Track page
should be. So the drop-down goes. The bar becomes a map you navigate with, and
**Progress** (the renamed Track) becomes the roomy view of the same data, where
teachers also decide what to plan next.

## Decisions already made

These came from the product owner. Don't reopen them.

1. **Every space follows the top nav, always.** Progress shows exactly the
   subject and grade picked in the nav. It never falls back to "the first
   subject with data". This is an app-wide rule (it is in CLAUDE.md).
2. **Progress goes all the way down to the specific expectations** (B2.3), not
   just the overalls (B2).
3. **The per-lesson Quick Check list ("Lesson History") moves to Lessons.**
   Progress is purely the curriculum map.
4. **The name is "Progress".**
5. **No popups for curriculum detail.** The header drop-down and the orb detail
   modal both go. Detail expands in place on the Progress page.
6. **The bar links in at strand level.** Each overall is a sliver about 20×12px
   in the bar, too small to click or tap (WCAG 2.5.8 wants 24px). Overalls and
   specifics are clickable on Progress itself.
7. **Progress is a launchpad into planning**, not a report you read and leave.
   Every expectation row carries actions in What's next's wording.

## Principles

- **One class context:** `src/lib/global-filters.ts`, shown in the top nav.
  No space keeps its own subject or grade, or falls back to one.
- **One model of progress:** `buildClassProgress` (`src/lib/class-progress.ts`)
  and its three states per expectation: **checked** (readiness colour),
  **taught, not checked** (grey), **not yet taught**. The bar, Progress, the
  phone row, Needs attention and What's next all read it, so their numbers
  always agree.
- **One set of rules for "what to do here":** one module classifies every
  expectation (see [Rules](#one-set-of-rules)). Today there are three
  definitions of "struggling".
- **Every space has an address**, so the browser's Back button works between
  Progress and Plan.

## What exists today (and what's wrong with it)

| Piece | File | Problem |
|---|---|---|
| Track page | `src/components/class-insights-space.tsx` (heading "Class Insights", nav label "Track") | Falls back to `allSubjects[0]` and the first grade with data when the nav's choice has no tallies, which breaks decision 1. Reads tallies only, so "taught, not checked" (lessons without a Quick Check) is invisible and its numbers disagree with the bar. A narrow `max-w-3xl` column. |
| Orb breakdown | `curriculum-orb-dashboard.tsx` + `curriculum-orb-detail-modal.tsx` + `ui/proficiency-orb.tsx` | Coverage built from tallies only (`buildOverallCoverage`). Detail lives in a modal (decision 5). |
| Triage card | `assessment-triage.tsx` + `src/lib/triage.ts` | A second "what to do" engine with its own thresholds. Its ideas are worth keeping: moves (re-teach / small group / move on / check it) and **evidence strength** hedging ("rests on 2 answer sets"). |
| Lesson History | bottom of `class-insights-space.tsx` | Moves to Lessons (decision 3). |
| Header drop-down | `Details`, `OverallRow` in `subject-data-bar.tsx` | Goes (decisions 5, 6). |
| Phone class sheet | `top-nav.tsx` (`BottomSheet` with `StrandRows`, "Analyze in Track") | Duplicates Progress. It slims to the pickers plus one link. |
| Space switching | `App.tsx` (`useState<Space>`) | Spaces are in-memory state with no URL, so Back doesn't move between spaces. |
| What's next | `whats-next-widget.tsx`, `src/lib/next-step.ts` | Keeps its job. Its reteach rule must come from the shared classifier. |
| Needs attention | `home-space.tsx`, `buildNeedsAttention` in `class-progress.ts` | Uses readiness level (`poor`/`okay`), a third definition of "struggling". |

## Target design

### 1. Addresses for every space (hash routes)

`main.tsx` already routes on the hash for standalone screens (`#account`,
`#district`, `#admin`, the student activity prefix) and **reloads the page** when
the hash moves into or out of one of those. New hashes must not start with any
of those prefixes.

| Space | Hash |
|---|---|
| Home (landing) | `#` / empty |
| Plan | `#plan` |
| Search | `#search` |
| Progress | `#progress` |
| Progress, at a strand | `#progress/B` |
| Progress, at an overall | `#progress/B2` (expanded, scrolled to) |
| Progress, at a specific | `#progress/B2.3` (its overall expanded, row highlighted) |
| Lessons | `#lessons` |
| Settings / Classroom profile | `#settings` / `#classroom` |
| Quick Check | no hash of its own: it's a full-screen flow over the current entry |

- Changing space **pushes** a history entry. Scrolling Progress past strands
  **replaces** the entry (`#progress/C`), so Back doesn't step through strands.
- `popstate` restores the space and the Progress anchor. Restore the scroll
  position too.
- **Plan reached through Back or Forward opens a fresh planner.** Planner state
  isn't serialised. Note this in the PR; it's acceptable.
- **Subject and grade stay out of the hash.** They live in the nav's store. A
  code that doesn't exist in the current class (after a class switch) lands at
  the top of Progress with no highlight.
- Parse and serialise in one small pure module (`src/lib/space-route.ts`) with
  unit tests. `App.tsx` uses it in place of bare `setActiveSpace`.
- The GitHub Pages mirror serves under a base path. Hash routes are unaffected,
  but check it.

### 2. Data: progress down to the specifics

Extend `buildClassProgress` (keep it pure) so each `OverallProgress` carries
its specifics:

```ts
interface SpecificProgress {
  code: string            // "B2.3"
  state: "not-taught" | "taught" | "checked"
  counts: LevelCounts     // summed across tallies; zeros when unchecked
  level: ReadinessLevel | null
  lowShare: number | null // share at Level 1–2
  evidence: Evidence      // from assessment-results.ts (responses, events, known)
  lastCheckedAt: number | null
  lessons: CoveringLesson[] // newest first
}
interface CoveringLesson {
  id: string; title: string; timestamp: number
  inLog: boolean // false when only a tally remembers it (the lesson log keeps 20)
}
// OverallProgress gains: specifics: SpecificProgress[]; evidence; lastCheckedAt; lessons
```

- Wording comes from `describeCode` after `useCurriculumText(subject, grade)`
  loads, never typed in. Reserve the line's space while it loads.
- Evidence uses the same folding as `addEvidenceFrom` in
  `assessment-results.ts`. Export a helper rather than copying it.
- **Covering lessons:** lessons in the log whose `curriculumCodesCovered`
  include the code (or its overall), plus tallies whose `codes` or
  `byExpectation` include it. Tallies carry a title snapshot, so a lesson that
  dropped out of the 20-entry log still shows (`inLog: false`, not clickable).
- Keep the existing fields and numbers exactly as they are. The bar and its
  tests must not change.

### 3. One set of rules

Today "struggling" means three different things:

| Where | Rule |
|---|---|
| `next-step.ts` (What's next) | Re-teach when ≥50% of responses **since the last lesson** sit at Level 1–2 |
| `triage.ts` (Track's triage card) | Re-teach when ≥50% at **Level 1**; small group when ≥20% at Level 1; move on when ≥75% at Level 3–4; "check it" when taught, never checked |
| `buildNeedsAttention` / `needsWork` | Readiness level `poor` or `okay` (`computeReadinessLevel`) |

Build one module, `src/lib/expectation-status.ts` (pure, unit-tested), that
classifies any specific or overall:

```ts
type Move = "teach" | "check" | "reteach" | "small-group" | "advance"
interface ExpectationStatus {
  state: "not-taught" | "taught" | "checked"
  level: ReadinessLevel | null  // colour only (signal-*); keep computeReadinessLevel
  move: Move
  evidence: EvidenceStrength
  hedge?: string                // "Based on 2 answer sets: check again before acting."
}
```

- Progress rows, Needs attention, the bar's "needs work" and What's next's
  re-teach decision all call it.
- What's next keeps its own *window*: only checks since the last lesson count
  for its re-teach.
- `triage.ts` and `assessment-triage.tsx` are deleted once nothing uses them.
  Move `classifyMove`'s logic and the evidence weighting in; don't lose the
  hedging.
- **Needs a decision before this PR** ([Open questions](#open-questions) #1):
  which threshold means "re-teach". CLAUDE.md currently documents What's next's
  rule (Level 1–2 ≥ 50%); if it changes, update CLAUDE.md.

### 4. The Progress page

**File:** a new `src/components/progress-space.tsx` replaces
`class-insights-space.tsx`. Internal id: `"progress"` everywhere (the `Space`
type in `App.tsx`, `HomeDestination`, `nav-items.ts`, `top-nav.tsx`,
`bottom-tab-bar.tsx`). No `"insights"` left.

**States** (all follow the nav):

| Nav selection | Progress shows |
|---|---|
| Subject and grade, curriculum data exists | The map (below). With nothing taught yet, the full map, every row "Not yet taught", and "Plan the first lesson" on the first expectation in the scope and sequence. |
| Subject and grade, no curriculum data | `noProgressReason(subject, grade)`, nothing else |
| Nothing picked, or only one of the two | The same subject chips as the header bar (`recentClasses`, filtered by whichever picker is set), as larger cards with taught meters, under "Pick a subject and grade". Picking one sets the nav. No guessing. |

**Page header (`PageHeader`):** title "Progress", the class ("Math · Grade 6"),
the Sandbox badge and the global sample-data control (`DevSeedControl`, scope
global) as today.

**Summary line** (what the drop-down's top row has now): gauge (`Gauge`), "16 of
51 expectations taught", checked count, lessons count, last Quick Check, ongoing
strands (Math's A), and the legend (`Legend`).

**Body:** strand sections stacked top to bottom in curriculum order, each with
`id` = strand code, so `#progress/B` scrolls to it. Width up to about
`max-w-6xl`, not the old `max-w-3xl`.

- **Strand heading:** "B Number", taught `16/18`, checked count, and the
  strand's three-state bar.
- **Overall row** (one per overall, `id` = code):
  - code and title, a "now" marker on the frontier, and the three-state bar
    (`OverallFill`)
  - status in words: the readiness label (`READINESS_TOKENS`), "Taught, not
    checked", or "Not yet taught"
  - evidence (`EvidenceCapsule`) and last checked date
  - covering lessons as links (open the lesson in the planner)
  - actions (below)
  - expand/collapse for its specifics: a button with `aria-expanded` and
    `aria-controls`, motion-safe
- **Default expansion:** collapsed, except the frontier overall and any overall
  whose move is re-teach or small group. An "Expand all / Collapse all" control
  per page. A deep link expands its target.
- **Specific row:** code, full wording, state, a four-band level bar
  (`signal-1..4`) with counts, evidence with hedge, last checked, covering
  lessons, actions.
- **The header bar on Progress:** stays visible and works as the page's table
  of contents. The strand in view gets `aria-current="location"` and a visible
  highlight (IntersectionObserver scrollspy). Clicking a strand scrolls
  smoothly (`motion-safe`) and replaces the hash.

**Actions** (overall and specific rows alike; the labels name the code, as What's
next does):

| Move | Primary | Secondary |
|---|---|---|
| teach (not taught) | "Plan the B2.3 lesson" | "Browse N B2.3 resources" / "Search for B2.3 resources" |
| check (taught, not checked) | "Run a Quick Check on ‹lesson›" when a covering lesson is in the log; otherwise omit it | "Plan the B2.3 lesson" (another pass) |
| reteach | "Plan a B2.3 review lesson" | "Find resources" |
| small-group | "Plan a small-group lesson for B2.3" (seeds the planner's topic the same way) | "Find resources" |
| advance | none (quiet) | "Browse resources" |

- Wire them exactly as the landing page does: `onPlanExpectation(code, label)`
  sets the global planner topic to `"<code> <label>"` and opens a fresh planner.
  `onFindResources(code)` seeds Search. `onQuickCheck(lesson)` opens the
  assessment flow.
- Resource counts reuse What's next's counter. Lift `useResourceCounter` out of
  `whats-next-widget.tsx` into a shared hook rather than copying it.
- After the planner saves a lesson or a Quick Check records, Progress updates
  live: `useClassData` already subscribes to both stores.

**Phones (below `md`):** the same page, single column. A sticky "Strand: B Number"
select at the top jumps between strands. No sideways-scrolling chip rows. Rows
stack: status and evidence under the title, actions full width. Check at
375×667, and in dark mode.

### 5. The header bar and the phone shell

In `subject-data-bar.tsx`:

- Each strand section becomes its own link (a button that navigates to
  `#progress/<strand>`), a separate tab stop, labelled for screen readers:
  "B Number: 16 of 18 taught. Open in Progress". The overall slivers stay
  visual, with a `title` tooltip.
- The end cell reads "16/51 taught" and **"Open Progress ›"** (to
  `#progress`). The Details toggle, the drop-down, its open state, the Escape
  and outside-click handlers, `Details` and `OverallRow` are all removed.
- Keep `strandGrid` for the bar's own layout.
- With no class picked, the subject chips stay as they are.

In `top-nav.tsx` (phones):

- The one-line progress row goes straight to `#progress`.
- The class chip's bottom sheet keeps the Subject and Grade selects and the
  province note, and replaces `StrandRows`, the gauge and "Analyze in Track"
  with one "Open Progress" button. Remove `StrandRows` from `context-strip.tsx`
  if nothing else uses it.

Copy that says "Track" changes:

- `nav-items.ts`: label "Progress"
- `whats-next-widget.tsx`: "See where the class is in Track" becomes "See the
  class's progress"; its body "Track shows…" becomes "Progress shows…";
  `onOpenTrack` becomes `onOpenProgress`
- `top-nav.tsx`: "Analyze in Track" becomes "Open Progress", plus the comments
- `subject-data-bar.tsx`: comments and props
- CLAUDE.md: every "Track"

### 6. Lesson History moves to Lessons

In `lessons-library.tsx`:

- Each lesson card's Quick Check line shows the last checked date, responses and
  answer sets, a four-band level bar, and the readiness label. **Fix while
  there:** it currently reads `{tally.attempts} checks`, but `attempts` counts
  *responses*. Use `events` for answer sets and say "responses" for `attempts`.
- Below the list, an **"Earlier Quick Checks"** section lists tallies whose
  lesson is no longer in the 20-entry log (snapshot title, date, responses).
  This is the history Track used to show. It follows the nav like the rest of
  the page.
- The page keeps its lesson-scoped sample-data control.

### 7. Removals (when nothing references them)

`class-insights-space.tsx`, `curriculum-orb-dashboard.tsx`,
`curriculum-orb-detail-modal.tsx`, `ui/proficiency-orb.tsx` (only the orb files
use it today), `assessment-triage.tsx`, `src/lib/triage.ts`, `src/lib/orb-math.ts`
if unused, and `buildOverallCoverage` / `buildStrandCoverage` if unused (grep
first). **Keep** `class-dashboard.tsx`: the in-lesson Quick Check results in
`assessment-modal.tsx` use it.

## Delivery plan

One PR each, in order. Each must pass `pnpm typecheck`, `pnpm test`,
`pnpm check:contrast`, `pnpm build` and the hex grep, and be checked in a
browser at desktop and 375×667, light and dark.

1. **Space addresses.** `space-route.ts` plus tests, `App.tsx` on it, Back and
   Forward between spaces, no collision with the standalone hashes. No visible
   UI change.
2. **Data and rules.** Specifics, evidence and covering lessons in
   `buildClassProgress`. `expectation-status.ts` plus tests. Needs attention,
   `needsWork` and What's next's re-teach moved onto it. Settle open question
   #1 first.
3. **The Progress page and the rename.** `progress-space.tsx`, every state in
   the table above, rows, actions, deep links, scrollspy, phone layout, the
   `"insights"` → `"progress"` rename, copy changes, old files deleted.
4. **The header bar and phone shell.** Strand links, the drop-down removed,
   the phone row and slim sheet.
5. **Lessons.** Quick Check summary per lesson, "Earlier Quick Checks", the
   responses-vs-checks label fix.
6. **CLAUDE.md.** Fold the shipped rules in (the nav's second bar, phone shell,
   the Progress page, the rules module) and retire this file's finished parts.
   Do this in each PR as it lands if that's easier.

## Acceptance checks

- With Math · Grade 6 in the nav, Progress shows Math · Grade 6 and nothing
  else. Changing the nav changes the page at once. Nothing picked means chips,
  never a guess.
- Every strand's taught/total on Progress equals the bar's, and the totals equal
  the bar's "N/M taught".
- Clicking "B Number" in the bar on any page opens Progress at B, with
  `#progress/B` in the address.
- From an overall or specific row, "Plan the B2.3 lesson" opens the planner
  seeded with B2.3. Back returns to Progress at that row.
- Saving a lesson that covers B2.3 turns it from "Not yet taught" to "Taught,
  not checked" without a reload. Recording a Quick Check turns it to its level
  colour, and the "now" marker moves.
- A thin-evidence result shows its hedge, and doesn't rank above a
  well-evidenced one.
- Long content holds: Language Grade 8 with every overall expanded, no
  truncation or overflow.
- Keyboard: every strand link, expand toggle and action is reachable and shows
  the focus ring. Screen reader: rows announce code, title, state and evidence.
- 375×667: no sideways scroll, the strand select is reachable, actions are full
  width.

## Open questions

Settle these before the PR that needs them.

1. **What counts as "re-teach"?** (Before PR 2.) Options: Level 1–2 ≥ 50%
   (What's next today) or Level 1 ≥ 50% with a separate "small group" band
   (triage today). Recommendation: re-teach at Level 1–2 ≥ 50%; small group
   when Level 1–2 is 20–50%; move on when Level 3–4 ≥ 75%. Readiness colours
   stay as they are.
2. **Default expansion** on Progress: is "frontier plus anything needing
   re-teach or small group" right, or should every overall start open?
3. **"Run a Quick Check" with no covering lesson in the log:** omit the action
   (this spec), or offer "Plan a lesson with a Quick Check"?
