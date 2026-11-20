# PROGRESS_SPEC.md — the Progress page (was "Track")

**Status:** agreed design, **not built yet** (2026-11-19; revised 2026-11-20: no prescriptive moves, open questions settled). Build it in the PRs
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
8. **Describe gaps, don't prescribe moves** (2026-11-20). No "re-teach",
   "small group" or "move on" anywhere: teachers won't welcome being told to
   re-teach. The app still makes the gaps and the next steps obvious, by saying
   what the data shows ("6 of 10 responses at Level 1–2 on B2.3") and offering
   options. The teacher decides what to do about it.

## Principles

- **One class context:** `src/lib/global-filters.ts`, shown in the top nav.
  No space keeps its own subject or grade, or falls back to one.
- **One model of progress:** `buildClassProgress` (`src/lib/class-progress.ts`)
  and its three states per expectation: **checked** (readiness colour),
  **taught, not checked** (grey), **not yet taught**. The bar, Progress, the
  phone row, Needs attention and What's next all read it, so their numbers
  always agree.
- **One definition of a gap:** one module describes every expectation (see
  [Rules](#3-one-set-of-rules)). Today there are three definitions of
  "struggling", and three of them prescribe a move.
- **Every space has an address**, so the browser's Back button works between
  Progress and Plan.

## What exists today (and what's wrong with it)

| Piece | File | Problem |
|---|---|---|
| Track page | `src/components/class-insights-space.tsx` (heading "Class Insights", nav label "Track") | Falls back to `allSubjects[0]` and the first grade with data when the nav's choice has no tallies, which breaks decision 1. Reads tallies only, so "taught, not checked" (lessons without a Quick Check) is invisible and its numbers disagree with the bar. A narrow `max-w-3xl` column. |
| Orb breakdown | `curriculum-orb-dashboard.tsx` + `curriculum-orb-detail-modal.tsx` + `ui/proficiency-orb.tsx` | Coverage built from tallies only (`buildOverallCoverage`). Detail lives in a modal (decision 5). |
| Triage card | `assessment-triage.tsx` + `src/lib/triage.ts` | A second "what to do" engine with its own thresholds, and it prescribes moves (re-teach / small group / move on), which decision 8 rules out. Worth keeping: **evidence strength** hedging ("rests on 2 answer sets"). |
| Lesson History | bottom of `class-insights-space.tsx` | Moves to Lessons (decision 3). |
| Header drop-down | `Details`, `OverallRow` in `subject-data-bar.tsx` | Goes (decisions 5, 6). |
| Phone class sheet | `top-nav.tsx` (`BottomSheet` with `StrandRows`, "Analyze in Track") | Duplicates Progress. It slims to the pickers plus one link. |
| Space switching | `App.tsx` (`useState<Space>`) | Spaces are in-memory state with no URL, so Back doesn't move between spaces. |
| What's next | `whats-next-widget.tsx`, `src/lib/next-step.ts` | Keeps its job, gap first. Its gap rule must come from the shared module, and its "review lesson" wording goes (decision 8). |
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
describes any specific or overall. It reports what the data shows; it never
picks a move (decision 8):

```ts
interface ExpectationStatus {
  state: "not-taught" | "taught" | "checked"
  level: ReadinessLevel | null  // colour only (signal-*); keep computeReadinessLevel
  gap: boolean                  // checked, and more than half the responses at Level 1–2
  lowShare: number | null       // share at Level 1–2
  evidence: EvidenceStrength
  hedge?: string                // "Based on 2 answer sets: check again before relying on it."
}
```

- **A gap is more than half the responses at Level 1–2.** That's exactly where
  `computeReadinessLevel` stops reading "good", so a gap is never drawn in an
  on-track colour. (What's next used ≥ 50%; exactly half is no longer a gap.)
  One rule, no bands: no "small group" middle tier, no "move on" verdict.
- Progress rows, Needs attention, the bar's "needs work" and What's next's gap
  check all call it.
- What's next keeps its own *window*: only checks since the last lesson count
  for its gap.
- `triage.ts` and `assessment-triage.tsx` are deleted once nothing uses them.
  `classifyMove` goes with them; move the evidence weighting and the hedging in.
- **What's next's copy changes in this PR.** "Plan a B1.1 review lesson" becomes
  "Plan a B1.1 lesson", with the gap carried by the rationale ("6 of 10
  responses at Level 1–2 on B1.1 in Tuesday's Quick Check"). No "re-teach" or
  "review" verdict in any label. Update CLAUDE.md's What's next paragraph to
  match.

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
  with a gap. An "Expand all / Collapse all" control
  per page. A deep link expands its target.
- **Specific row:** code, full wording, state, a four-band level bar
  (`signal-1..4`) with counts, evidence with hedge, last checked, covering
  lessons, actions.
- **The header bar on Progress:** stays visible and works as the page's table
  of contents. The strand in view gets `aria-current="location"` and a visible
  highlight (IntersectionObserver scrollspy). Clicking a strand scrolls
  smoothly (`motion-safe`) and replaces the hash.

**Actions** (overall and specific rows alike; the labels name the code, as What's
next does). Rows are arranged by state, never by a verdict:

| State | What the row says | Actions |
|---|---|---|
| Not yet taught | "Not yet taught" | "Plan the B2.3 lesson", "Browse N B2.3 resources" / "Search for B2.3 resources" |
| Taught, not checked | "Taught, not checked" and the covering lessons | "Run a Quick Check on ‹lesson›" when a covering lesson is in the log (otherwise omit it), "Plan a B2.3 lesson" |
| Checked, with a gap | The gap first, in words: "6 of 10 responses at Level 1–2 · last checked Nov 14", plus the hedge if evidence is thin | "Plan a B2.3 lesson", "Find B2.3 resources", "Run a Quick Check on ‹lesson›" |
| Checked, no gap | The readiness label, quietly | "Browse B2.3 resources" |

- A gap row is visibly flagged (the readiness colour and the words), so the
  gaps are easy to find by scanning. The words describe; they never say
  "re-teach", "small group" or "move on".

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

1. ✅ **Space addresses.** `space-route.ts` plus tests, `App.tsx` on it, Back and
   Forward between spaces, no collision with the standalone hashes. No visible
   UI change.
2. ✅ **Data and rules.** Specifics, evidence and covering lessons in
   `buildClassProgress`. `expectation-status.ts` plus tests. Needs attention,
   `needsWork` and What's next's gap check moved onto it, and What's next's
   "review lesson" wording replaced (decision 8).
3. ✅ **The Progress page and the rename.** `progress-space.tsx`, every state in
   the table above, rows, actions, deep links, scrollspy, phone layout, the
   `"insights"` → `"progress"` rename, copy changes, old files deleted.
4. **The header bar and phone shell.** Strand links, the drop-down removed,
   the phone row and slim sheet. The bar's scrollspy highlight
   (`aria-current="location"` on the strand in view) lands here too, since it
   needs the strand links; Progress already tracks the strand in view.
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
- No copy anywhere says "re-teach", "reteach", "small group" or "move on"
  (`grep -rniE "re-?teach|small.group|move on" src` finds only identifiers
  being deleted).
- Long content holds: Language Grade 8 with every overall expanded, no
  truncation or overflow.
- Keyboard: every strand link, expand toggle and action is reachable and shows
  the focus ring. Screen reader: rows announce code, title, state and evidence.
- 375×667: no sideways scroll, the strand select is reachable, actions are full
  width.

## Open questions

All settled with the product owner on 2026-11-20:

1. **What counts as "re-teach"?** Nothing: the app doesn't prescribe moves
   (decision 8). A *gap* is more than half at Level 1–2, and it's described, not acted on.
2. **Default expansion:** frontier plus every overall with a gap; the rest
   collapsed.
3. **"Run a Quick Check" with no covering lesson in the log:** omit the action.
