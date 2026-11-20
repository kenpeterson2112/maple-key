# CLAUDE.md — Maple Key

> Single source of truth for both **Claude Code** and **Claude Design**.
> When the design system below changes, both tools must read from here. Do not
> hardcode colors, spacing, or type anywhere else — reference these tokens.

## What this is

Maple Key is an AI-powered lesson-planning tool for teachers (Arboretum Labs).
Three product pillars plus a contextual intelligence layer:

- **Resource Discovery** — three-agent curation waterfall (Researcher → review → Assessor)
- **Lesson Planning** — two-call API flow with planning questions
- **Assessment** — bundled with lesson generation

Mobile classroom surface: **Acorn Lesson Remote Control** (mobile-first, sticky
footer driven by IntersectionObserver, assessment modal).

## Tech stack

- Framework: **React 19** + **Vite 6** + **TypeScript 5.6**
- Styling: **Tailwind CSS v4** (via `@tailwindcss/vite`), tokens declared inline in `src/index.css` (`:root` + `@theme inline`)
- UI primitives: **Radix UI** (`@radix-ui/react-dialog`, `@radix-ui/react-popover`), **Framer Motion** for overlays, **Lucide React** for icons
- Class utils: `clsx` + `tailwind-merge`
- Data: **SWR** for static `resources.json`; **Anthropic SDK** (`@anthropic-ai/sdk`) for AI calls
- Deploy: **Vercel** is the canonical production deployment (`vercel.json`, build `pnpm build` → `dist/`), auto-deployed on push to `main`. It's also the only place the AI features work, since only Vercel runs the serverless functions in `api/*.ts`. GitHub Pages (`.github/workflows/deploy.yml` → `docs/`) is a secondary **discovery-only static mirror** with no serverless runtime — `fetch("/api/...")` 404s silently there. See `README.md` for the full split.
- CI: GitHub Actions (`.github/workflows/deploy.yml`); nightly resource refresh, link-health checks, and resource enrichment run as **Claude Code routines** on the Claude subscription (see `ROUTINES.md`), with the `nightly-*.yml` workflows retained as a manual, API-billed fallback. New automation belongs on the subscription (a skill + routine), not the Anthropic API — that migration was deliberate.

## Design system — THE shared contract

Both Claude Design and Claude Code read this section. Treat it as canonical.
Tokens live in `src/index.css` today; as we extract `src/design-system/`, the
file moves but the names stay the same.

### Color tokens: "Crisp orchard"

Bright autumn: **rust** primary, **teal** secondary, **goldenrod** pop, on a
warm near-white. Dark mode is **warm cocoa**, not greyscale. The values live in
`src/index.css` as OKLCH; the hex below is what each one renders as (the CSS
comments carry the same hex, and `pnpm check:contrast` fails if they drift).

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FFFDF8` | `#1C1714` | page |
| `foreground` | `#2A1E1A` | `#F5EDE6` | body text and headings |
| `card` / `card-foreground` | `#FFFFFF` / `#2A1E1A` | `#262019` / `#F5EDE6` | cards, panels |
| `popover` / `popover-foreground` | `#FFFFFF` / `#2A1E1A` | `#2D2620` / `#F5EDE6` | popovers, menus |
| `primary` | `#B45A3A` | `#E68360` | main actions, brand fills; text on background/card only |
| `primary-hover` | `#A55031` | `#EE9373` | hover/pressed state of a `primary` fill |
| `primary-strong` | `#A14D2F` | `#EE9373` | rust text/icons on muted or any tint |
| `primary-foreground` | `#FFFFFF` | `#1C1714` | text on a `primary` fill |
| `primary-tint` | `#FFEBE4` | `#3C241C` | selected chips and rows |
| `secondary` | `#109A7E` | `#2DD4AE` | teal fills, outline borders, active-tab indicator |
| `secondary-strong` | `#0D6E5A` | `#5FE3C3` | teal text and links |
| `secondary-foreground` | `#06231C` | `#0B2A23` | text on a `secondary` fill |
| `secondary-tint` | `#DDF5EE` | `#15332C` | soft teal background |
| `pop` | `#FFC53D` | `#FFC53D` | goldenrod badges, "new"/bookmarked dots, small highlights |
| `pop-strong` | `#7A5500` | `#FFC53D` | goldenrod-family text on a tint |
| `pop-foreground` | `#5A3E00` | `#3A2800` | text on a `pop` fill |
| `pop-tint` | `#FFF3D1` | `#3A2F14` | highlight background |
| `muted` / `muted-foreground` | `#F7EFE8` / `#75655C` | `#2D2620` / `#B3A498` | quiet surfaces / secondary text |
| `accent` / `accent-foreground` | = `secondary-tint` / `secondary-strong` | same | hover and active surfaces |
| `destructive` / `destructive-foreground` | `#C62828` / `#FFFFFF` | `#F46A65` / `#1C1714` | errors, delete, a wrong answer. Text on `destructive/10` uses `destructive` |
| `border` / `border-strong` | `#F1E2D6` / `#E3CDBC` | `#3A3029` / `#4A3E35` | dividers / stronger dividers |
| `input` | `#FFFFFF` | `#2D2620` | input fill |
| `ring` | `#0F8A70` | `#2DD4AE` | teal focus ring |
| `success` / `success-tint` / `success-foreground` | `#166534` / `#DCFCE7` / `#FFFFFF` | `#4ADE80` / `#14301F` / `#1C1714` | status: "added", "approved", a correct answer. Text on `success-tint` uses `success` |
| `signal-1..4` | unchanged | unchanged | assessment levels (orange, yellow, light green, dark green). Carries meaning: never retune for the palette. Student-readiness levels use these too (`READINESS_TOKENS` in `ui/readiness-pill.tsx`) |

**Subject colours.** `--subject-math`, `-science`, `-fsl`, `-language`, `-social`,
`-health`, `-arts`, `-history`, `-geography`, plus `--subject-foreground` for text
on a subject fill (white in light mode, dark in dark mode). One value per subject
does every job: fill (`bg-subject-math text-subject-foreground`), label text
(`text-subject-math`), and tint at low opacity (`bg-subject-math/10`,
`border-subject-math/40`). Cards get their subject classes from
`getSubjectTheme()` in `src/lib/subject-theme.ts`; don't build a second map.

**Categorical hues.** `--hue-blue`, `-green`, `-violet`, `-amber`, `-teal`, `-cyan`,
`-orange`, `-rose`, `-indigo`, `-slate`, plus `--hue-foreground`. Same contract as
the subject colours (fill + `hue-foreground`, label text, `/10` tint, `/40`
border). They are for colour-coding that carries no meaning: lesson sections
(`SECTION_HUES` in `src/lib/lesson-templates.ts`), classroom-resource categories,
the materials dots. Never use a hue for state or emphasis.

**Which colour, by job.**

- **Main action:** `primary`.
- **Secondary action, link, selected option, info panel:** the teal `secondary` family.
- **Success, added, approved, correct:** `success`.
- **Error, delete, incorrect:** `destructive`.
- **Assessment accent, differentiation callouts, warnings, star ratings, gaps:** goldenrod `pop` (`pop-tint` panel, `pop-strong` text, `pop` fill with `pop-foreground`).
- **Proficiency and readiness levels:** `signal-*`.
- **Subjects:** `subject-*`.
- **Categories with no meaning:** `hue-*`.
- **Everything else:** neutrals: `muted`, `border`, `muted-foreground`, `foreground`.

`--radius: 0.875rem`.

**How the families pair.** Each colour family has a fill (`primary`), the text
that sits on that fill (`primary-foreground`), a soft background (`primary-tint`)
and, for text in that hue on a light surface, a `-strong` variant. So:

- Text on a `*-tint` or on `muted` uses the family's `-strong` (`bg-primary-tint text-primary-strong`), or `text-foreground`. Never `text-primary`, `text-secondary` or `text-pop` there: they fail AA.
- `text-secondary` and `text-pop` are never colours for text; use `text-secondary-strong` / `text-pop-strong`. They are fine on a decorative icon that sits beside its own label (the modality icons do this).
- Goldenrod is **pop only**. Never use it for body text, and never let a goldenrod dot be the only thing that carries meaning (it is 1.6:1 on the light background).
- Borders are decorative (about 1.3:1). An input or control that needs a visible boundary must get it from something else (`border-strong` plus a fill, or the focus ring).

**Contrast is enforced.** `pnpm check:contrast` (`scripts/check-contrast.mjs`,
run in CI) checks WCAG AA for every pairing above in both modes: 4.5:1 for text,
3:1 for focus rings and indicators. Add a row to its `PAIRS` list when you
introduce a new pairing, and rerun it after changing any value.

**Dark mode is live.** Settings → Appearance offers System / Light / Dark. The
choice is saved per browser under localStorage `mk-theme` (`src/lib/theme.ts`);
"System" follows `prefers-color-scheme` live, and a change in one tab reaches the
others.

- **No flash on load:** an inline script in `index.html` applies the saved theme before first paint, so it works before any app JavaScript loads. It mirrors `applyTheme()` in `theme.ts`; change them together.
- **Browser chrome:** the `theme-color` meta tag carries both values (`data-light` / `data-dark`, matching `--background`).
- **Native controls:** `color-scheme` follows the theme, so checkboxes, selects and scrollbars match.

Because every colour is a token, a new component is dark-mode ready by default.
Reach for a `dark:` variant only when a token genuinely can't express the
difference, and check new UI in both modes.

**Rule:** never hardcode hex values in components. Always reference via Tailwind
utilities backed by `@theme inline` (e.g. `bg-primary`, `text-muted-foreground`,
`border-border`). `bg-white` and `text-black` count as hardcoded: they break dark
mode, so use `bg-card` and `text-foreground`. Inline styles follow the same rule:
`style={{ color: "var(--subject-math)" }}`, never a hex string. `grep -rnE
"\[#[0-9A-Fa-f]{3,8}\]" src` must stay empty. The only hex left in `src/` is in
export code that renders outside the app's CSS (`lesson-planner/lesson-export.ts`,
the print `<style>` in `artifact-organizer-modal.tsx`, the jsPDF constants in
`lib/student-activity-pdf.ts`). Google's "G" mark keeps its brand colours in
`public/google-g.svg`, an asset, not a component.

Tailwind's built-in palette (`text-emerald-700`, `bg-amber-500`, `stone-*` and so
on) counts as hardcoded too: it doesn't follow dark mode. None is left in `src/`;
keep it that way. Reach for the token that names the job (list above).

### Type stack

```
--font-sans:    "Geist", system-ui, -apple-system, sans-serif
--font-display: "Bricolage Grotesque", "Geist", system-ui, sans-serif
```

Both load from Google Fonts in one request in `index.html` with `display=swap`
(Geist `100..900`; Bricolage Grotesque `500..700` plus its optical-size axis).
**Every heading and title is Bricolage.** A base rule in `src/index.css` puts
`h1`–`h6` on `--font-display`, which covers Radix dialog and sheet titles (they
render `h2`). A title built from another element (a card title in a `<span>`, an
empty-state headline in a `<p>`, the "I teach …" sentence) adds `font-display`.
Don't put `font-sans` on a heading. Body copy, labels, metadata and numbers
(KPIs, counts) stay in Geist.

Bricolage has no weight below 500 here, so every heading and `font-display`
element needs a weight: `font-semibold` or `font-bold`.

On phones, form fields render at 16px whatever `text-*` class they carry (an
unlayered rule in `src/index.css`), because iOS Safari zooms into any focused
field set smaller.

**Known gotcha:** PDF rendering does not honor the same font fallback chain as
the browser. Any font change must be verified in the exported PDF, not just on
screen. Today neither export uses these fonts: the print HTML
(`lesson-export.ts`, the organizer's print window) sets its own Helvetica stack,
and `student-activity-pdf.ts` draws with jsPDF's built-in Helvetica.

### Radii

Driven from `--radius: 0.875rem`:
```
--radius-sm: calc(var(--radius) - 4px)   /* ~10px */
--radius-md: calc(var(--radius) - 2px)   /* ~12px */
--radius-lg: var(--radius)               /*  14px */
--radius-xl: calc(var(--radius) + 4px)   /* ~18px */
```

### Motion

```
--animate-fade-in: fade-in 0.35s ease-out   /* utility: animate-fade-in */
```

The `fade-in` keyframes live in `src/index.css` alongside the tokens. Tailwind
v4 here ships **no** animate plugin, so `animate-in` / `fade-in-0` and friends
resolve to nothing — only core Tailwind animations (`animate-pulse`,
`animate-spin`) and the named keyframes above actually render. Wrap entrance
animation in `motion-safe:`.

### Spacing scale

Tailwind v4 default 4px scale. Common steps used in this app:
```
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
```
(Tailwind utilities: `p-1` … `p-16`.) Avoid arbitrary values like `p-[13px]`.

### Component patterns

- Primitives live (and will grow) in **`src/components/ui/`** (seed: `sheet.tsx`).
  Phase B migrates this to **`src/design-system/`** as the canonical location.
- Feature components live in `src/components/` (e.g. `assessment-modal.tsx`,
  `class-dashboard.tsx`, `lessons-library.tsx`).
- **The assessment modal and sticky footer are the highest-risk reusable pieces** —
  changes here ripple through the Acorn remote.
- **Quick Check** (`assessment-modal.tsx`, results in `class-dashboard.tsx`)
  follows the same rules as Progress: results keep the curriculum's own order
  (never sorted by how badly a class did), flag a gap with the shared rule in
  the same words ("7 of 10 responses at Level 1–2"), and label levels in the
  achievement chart's words (`LEVEL_META`: "Level 1 (limited)" … "Level 4
  (high degree)"; readiness pills from `READINESS_TOKENS`). As a space it
  fills the area under the top nav (`absolute inset-0`, not `fixed`: a fixed
  overlay hid its own header under the nav), pads the bottom safe area (the
  tab bar is hidden), and its footer puts the count above one row of 44px
  buttons on phones. It has no address, so
  closing it returns to the space in the address (`closeQuickCheck` in
  `App.tsx`), e.g. back to the Progress row it was opened from.
- **The top nav is the class context** (`top-nav.tsx`, `context-strip.tsx`).
  It is **exactly two bars**; don't add a third. Suggestions and materials
  live on the landing page as widgets, not in the header.
  1. **Navigation:** the logo, the Subject and Grade selects (their values
     centred in the pill), the four spaces as quiet text links, the province
     (a low-key globe with its abbreviation over it, opening a list of
     provinces) and the gear, on a bar in the subject's colour (`--subject-*` via `SUBJECTS[].color`), brand
     `primary` with none (on every page, the landing page included).
     - **The bar** is that colour mixed 30% into the page,
       `color-mix(in oklab, <colour> 30%, var(--background))`, with its text in
       `--foreground`. Mix in OKLab, not OKLCH: OKLCH swings the hue through the
       background's hue (blue turns maroon in dark mode). Don't fill the bar at
       full strength; the subject colours are deep in light mode and bright in
       dark, so `--foreground` fails on them. `pnpm check:contrast` checks
       `--foreground` on every subject's bar (`<token>/30@background`).
     - **The logo** is the stacked lockup (samara over the wordmark),
       `ui/maple-key-logo.tsx`, straight on the bar with no tile, in one flat
       colour: the bar's `--foreground`, so dark in light mode and light in dark
       mode. `public/maple-key-lockup.png` is alpha only, used as a CSS mask over
       `currentColor`. 64px tall in the 80px desktop bar, 48px on phones.
  2. **Subject data** (`subject-data-bar.tsx`), switching with the class:
     - **A subject and grade with curriculum data:** the whole curriculum as a
       timeline, one equal-width section per strand on a single row, each
       labelled with its code, name and taught count; names wrap to two lines
       rather than truncating. The blocks are coloured by `signal-*`
       readiness, with "now" at the overall the last lesson reached. The
       class's "N/M taught" and **Open Progress ›** sit at the end, never
       before the strands. **Each strand is a link** (its own tab stop) into
       Progress at that strand (`#progress/B`); the overall slivers inside are
       too small to click (WCAG 2.5.8), so they're visual, with a tooltip.
       There is no drop-down: detail lives on Progress. On Progress the strand
       in view gets `aria-current="location"` and a highlight
       (`src/lib/progress-location.ts`), and a strand link there scrolls
       instead of adding a history entry.
       All from `buildClassProgress` (`src/lib/class-progress.ts`).
     - **Otherwise** (no subject, no grade, or no curriculum data): the
       subjects the teacher has worked on (subject and grade) as chips under
       the label "Subjects", not "classes", most recently active first
       (`src/lib/recent-classes.ts`), each with a taught meter. Picking one
       sets the subject and grade. With no classes yet, one plain prompt to pick
       a subject and grade. No summary stats here: they repeat the widgets.
     - **Phones** keep a one-line progress row that opens Progress. The class
       sheet is just the Subject and Grade selects, the province note and one
       "Open Progress" button.

  **The landing page** is This week across the top (Mon–Fri of lessons
  planned and Quick Checks recorded, with previous / next week and a way back
  to today), then **Where the class is** with **Gaps** as a slim bar under
  it, beside Materials.

  **The Where the class is widget** (`whats-next-widget.tsx`, on the landing
  page beside Materials) shows where a class sits in the curriculum, with the
  facts behind it; it was a third header bar. With a subject and grade picked
  it's that class; otherwise up to three across the teacher's classes, gaps
  first (largest first), then the rest, most recently active first. Each card
  acts on its own class, so its buttons set the subject and grade first.
  Headlines state position, not orders: "A gap on B1.2 …", "B1.3 … follows
  your last lesson", "B1.1 … is first in the Ontario curriculum order". The
  options name the expectation: "Plan a B1.2 lesson", "Browse 32 B1.1
  resources" (or "Search for B1.2 resources" when none are tagged), "Run a
  Quick Check". The position has no model call (`src/lib/next-step.ts`,
  unit-tested): a gap when a Quick Check since the last lesson has one on its
  expectations, else the expectation after the last lesson in the scope and
  sequence (`src/lib/scope-sequence.ts`: a file in `src/data/sequences/` if
  one exists for the subject and grade, else the curriculum order). Every
  clause must point at data the teacher can see. **Don't add rules here:**
  districts will overlay their own scope and sequence, which overrides any
  order we'd suggest.

  **Show where the class is; never tell the teacher what to do.** Make gaps
  obvious and natural to find, and offer options, not instructions:
  - No "re-teach", "small group", "move on", "next up", "start with",
    "first", "before moving on" or "needs work". Say what the data shows
    ("7 of 10 responses were at Level 1–2 on B1.2").
  - Actions are options of **equal weight** (all outlined, `OPTION` in
    `progress-space.tsx` and `whats-next-widget.tsx`); none is filled in as
    the thing to do. The gap (the `pop` warning and its words) is what stands
    out.
  - A **gap** has one definition, `src/lib/expectation-status.ts`
    (unit-tested): more than half the responses at Level 1–2, which is exactly
    where the readiness colour stops reading on-track. The header bar's "Gap on
    B1", Gaps, Where the class is and Progress all use it; gaps resting on thin
    evidence rank lower and carry a hedge. Never write a second threshold.
  - The curriculum's own order is fine to show (strands, overalls, "now" at
    the last lesson); it's directions that go.

  The landing page follows the same selection: This week, Gaps,
  Where the class is and Pick up where you left off show only what matches the subject and grade
  picked (`useSelectedClassData`), and an empty picker means all. A teacher has
  one class on the go, shown in the nav, so the page doesn't repeat it as cards.
  The strand timeline splits each overall into checked (readiness colour),
  taught but not checked (grey) and not yet taught: teachers check as they go,
  so gaps sit inside the taught stretch.

  **Settings** (`settings-page.tsx`: account, province, appearance, help and the
  tour, test mode) and the **Classroom profile** (`classroom-profile.tsx`:
  materials and spaces, lesson defaults such as handout language, no-tech mode
  and planner layout) are full pages. Settings opens from the gear and the
  phone account sheet; the Classroom profile from Settings, the phone account
  sheet and the planner's materials step. Both apply changes as they're made; there is no
  Save button.

  **Classroom materials carry subject tags** (`src/lib/classroom-resources.ts`):
  each built-in material has `subjects`, one or more schema subjects
  (`Subject` from `shared/resource-schema.ts`), or `["General"]` for what
  serves every subject. General is never mixed with a subject. Custom materials
  a teacher types in may carry `subjects`; untagged ones count as General
  (`customMaterialSubjects`). A new built-in material must be tagged, or
  `classroom-resources.test.ts` fails. There's no Arts subject in the schema
  yet, so art supplies are General.

  **The Materials widget** (`materials-widget.tsx`, on the landing page beside
  Where the class is) replaces the header's Materials button. It shows what the
  teacher has as a wrapping tag cloud (never a sideways scroll), browsable in
  place with type filters, under the heading alone (no subtitle), arranged
  by `groupMaterials` (`src/lib/materials-for-subject.ts`, unit-tested): with a
  subject picked, "For <subject>" first, then "Every subject" (General), then
  "Other subjects", each in that subject's category order (Math: manipulatives
  first; Language: books, then the reading spaces; Science: the lab, then
  equipment). It also offers quick adds for that subject. Edits stay in the
  Classroom profile. The save functions in `classroom-resources.ts` announce
  changes; read them through `subscribeMaterials` so open views refresh.

  Province is in Settings and behind the nav's globe. The class context has **one store**,
  `src/lib/global-filters.ts` (province, grade, subject, strand, plus the
  session-only planner topic); never keep a second copy in a component or
  `App.tsx`. **Every space follows the top nav, always:** no space keeps its
  own subject or grade or falls back to one. Strand is a
  Search-only filter, picked in that page's header.
- **Every space has an address** (`src/lib/space-route.ts`): `#plan`,
  `#search`, `#progress`, `#lessons`, `#settings`, `#classroom`; changing
  space pushes a history entry, so Back works. Quick Check has none. New
  hashes must not start with main.tsx's standalone ones (`#account`,
  `#district`, `#admin`, `#activity=`).
- **Progress** (`progress-space.tsx`, was Track) is the class's place in the
  curriculum down to the specific expectations, and a launchpad into
  planning. It shows exactly the nav's subject and grade (nothing picked: the
  teacher's subjects as cards), reads `buildClassProgress` and the gap rule,
  and offers actions by state, never by verdict. `#progress/B`, `/B2`,
  `/B2.3` deep-link to a strand, an overall (opened) or a specific (marked);
  scrolling replaces the address with the strand in view, and every action
  first points the address at its row, so Back returns there. Overalls start
  collapsed except the frontier and any with a gap. `PROGRESS_SPEC.md` is the
  design record (all six PRs shipped).
- **Lessons carries the Quick Check history** (`lessons-library.tsx`, from
  `src/lib/tally-summary.ts`, unit-tested). Each card shows its last check,
  "N responses · M answer sets" (responses are students, `attempts`; answer
  sets are Record presses, `events`; never call either "checks"), a four-level
  bar and the readiness label. **Earlier Quick Checks** lists checks whose
  lesson has left the 20-entry log, by their snapshot title. Both follow the
  nav's subject and grade and update live.
- **Phone shell (below `md`).**
  - **Layout:** the app is one full-height flex column (`App.tsx`): a 56px header (`top-nav.tsx`) with a one-line progress row under it once a subject is chosen, the space, then the bottom tab bar (`bottom-tab-bar.tsx`). The header's class chip opens a bottom sheet with the Subject/Grade selects and an "Open Progress" button. The tab bar is a real row, not a fixed overlay, so pages need no bottom padding and a `sticky bottom-0` footer inside a space lands just above it.
  - **Tab bar:** it hides while the on-screen keyboard is up and during Quick Check.
  - **Planner:** during setup the planner's page header (an icon alone on phones) is hidden below `md`, and the setup nav collapses to the Guided/All options toggle with "Step 3 of 5 · Format" beside it and a slim five-part bar whose finished parts jump back (`setup-steps.tsx`); the step chips are `md` and up. Body and footers pad 16px on phones. A saved lesson reopened from Lessons shows no "generated successfully" banner (`justGenerated`).
  - **Touch targets:** controls a teacher taps in class are at least 40px tall (44 for the main ones), whatever they look like: pad the hit area rather than enlarge the visual (`-my-*` with `min-h-10`). WCAG's 24px is the floor, not the goal.
  - **Nav items:** desktop's pill toggle and the tab bar both read the four spaces from `src/lib/nav-items.ts`.
  - **Account:** the header avatar opens `account-sheet.tsx` (Settings, Classroom profile, Invite staff, Sign out). There is no hamburger menu.
  - **Safe areas:** with `viewport-fit=cover`, the header pads the top inset, the tab bar the bottom one, and the app root the sides.
- **Focus rings on `<select>` use `keyboard:focus-visible:ring-2
  keyboard:focus-visible:ring-ring`.** Chrome keeps `:focus-visible` on a
  select after a mouse pick, so a plain ring lingers after every choice. The
  `keyboard:` variant (`src/index.css`, fed by `src/lib/input-modality.ts`)
  shows it unless the last input was a mouse or touch. Never remove a ring
  outright.
- **Phone menus and filters use `ui/bottom-sheet.tsx`.** It's a Radix Dialog with a Framer slide-up. It closes on backdrop tap, Escape, the close button, or a swipe down on its handle; the swipe starts only on the handle, so the body scrolls freely. It takes a `footer` for a pinned primary action (the filters sheet's "Show N results").

## Architecture notes for Claude Code

- Lesson generation is a **two-call flow**: planning questions first, then
  generation. Don't collapse it into one call.
- **The lesson shape is specified in `LESSON_SPEC.md`** (three-part arc,
  success criteria, differentiation, CRRP and equity framing, reflection
  checkpoint, and the output rules). The prompt in `api/generate-lesson.ts` and
  its manual-fallback copy in `src/components/lesson-planner/lesson-export.ts`
  implement it; change all three together. Stages are **step lists, not
  paragraphs** (the style rules live once in `shared/lesson-prompt.ts`); the
  model is `LESSON_MODEL` (env), compared with `scripts/compare-lesson-models.mjs`.
- Planning-question answer formats use a **closed enum** — extend the enum,
  don't introduce free-form formats.
- Resource curation is a **three-agent waterfall** (Researcher → review →
  Assessor) — keep the stages distinct; it's also the competitive-moat story,
  so don't shortcut it for convenience.
- Static resource data ships as `public/resources.json` (~2.5 MB) and is fetched
  via SWR. Treat as read-only at runtime; a nightly Claude Code routine
  regenerates it (see `ROUTINES.md`). **There is no database** — admin edits
  accumulate in localStorage and land as a draft PR via `api/admin-push.ts`, so
  git history is the audit log and the recovery path.
- **Supabase migration in progress** (see `supabase/README.md`). The project
  holds the resource tables, generated constraints, audit log and RLS.
  **The read path is built but not switched on:** `pnpm build` writes
  `dist/resources.json` from the database only when `SUPABASE_URL` /
  `SUPABASE_ANON_KEY` are set, and ships the committed file otherwise. As of
  2026-11-06 Vercel has neither, so production still serves the committed
  `public/resources.json`. Setting both on Vercel Production is the switch. **Writes still go to `public/resources.json` in git** —
  admin push, routines and scripts edit it as before, and
  `.github/workflows/sync-supabase.yml` carries each merge into the database
  (`seed-supabase.py --prune`, parity check, redeploy). So an edit is live only
  once it's merged *and* synced. Never write to the database directly until the
  write paths move.
- **Student activities** (short links `/a/<id>`) live in Supabase table
  `activities`. RLS is on with no policies, so only `api/activities.ts` (holding
  `SUPABASE_SECRET_KEY`, server-only) can reach it. It stores teacher-written
  content; student answers never leave the student's device (local autosave,
  then a PDF they attach in Classroom). Keep it that way unless a privacy review
  signs off. Without the secret key, sharing falls back to hash links.
- **Teacher accounts** (`#account`, `src/components/account/`) use Supabase
  Auth (Google + email link) and the multi-tenant tables
  (`organizations` → `profiles` → `lessons`, `invitations`). Every policy keys
  off `private.visible_org_ids()`. Profiles are never self-inserted: a user gets
  one only from `accept_pending_invitation()` (an invite, matched on their
  confirmed email). **Accounts are invite-only**: there is no self-serve signup.
  Schools, districts and solo teachers are set up by the operator (an org plus
  an invite, see `supabase/README.md`); admins then invite their own staff. `api/invitations.ts` inserts the invite *as the admin* so RLS
  decides, then uses the secret key only to send the email. **Sign-in is
  required**: `RequireAccount` (in `src/main.tsx`) sends anyone without a
  profile to `#account`; only `#account`, student activity links and
  `/privacy` / `/tos` are open. Without `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_PUBLISHABLE_KEY` (local dev, the Pages mirror) there are no
  accounts and the app runs ungated. Lessons still live in localStorage.
  The signed-out `#account` screen is `SignIn` in `account-space.tsx`: a red brand panel and the form, stacked on phones and split from `md`.
  - **States:** every state (sending, link sent, error, Google redirecting) keeps its space reserved. The form and the "Check your inbox" panel share one grid cell, so swapping them moves nothing.
  - **Testing it locally:** set the two `VITE_SUPABASE_*` variables to dummy values and stub the auth endpoints in the browser.
- **The resource schema has one home: `schema/resource-schema.json`** (currently
  `schema_version` 3.0). It holds every field vocabulary, the required/optional
  split, and the admin allowlists, and all three languages read it:
  `shared/resource-schema.ts` for the client *and* `api/` (both tsconfigs include
  `shared/`), `scripts/_schema.py` for the ingest scripts. Add a subject, strand,
  or link status there — never inline in a component, an API route, or a script.
  The literal unions in `shared/resource-schema.ts` are hand-written because a
  JSON import widens to `string[]`; `scripts/check-schema-sync.py` fails CI if
  they drift. Validate the dataset with `pnpm validate:schema`.
- **The curriculum is fetched, not hand-written.** `scripts/fetch-curriculum.py`
  pulls Ontario Grades 1–8 (every subject in the schema; FSL is Core French
  4–8) plus the Grade 9 courses (MTH1W, SNC1W, ENL1W, CGC1W, PPL1O, FSF1D) from the Ministry's public curriculum content service and writes two
  layers. The **outline** (`src/data/curriculum/on.en.outline.json`: strand
  labels, overall titles, every expectation code, no wording) is bundled, so
  `strandLabel`, `overallTitle`, `expectationCodes` and the rest of
  `src/lib/curriculum-codes.ts` stay synchronous. The **text**
  (`public/curriculum/on/en/<subject>/g<grade>.json`) is fetched only when a
  subject and grade is open, through `useCurriculumText` in
  `src/lib/curriculum-text.ts`; `describeCode` returns undefined until then.
  Province and language are path segments (`on/en`), so French or another
  province is another run of the script, not a new format. Never type
  curriculum labels or wording into a component; rerun the script.
- **No orphan expectation codes.** Every code in a resource's
  `curriculum_expectations` must exist in the curriculum data for its subject
  and one of its grades, whatever its province (the catalogue tags against the
  Ontario curriculum). A resource whose subject and grade have no curriculum
  data carries no codes. One rule, `shared/curriculum-check.ts`, used by the
  admin editor (blocks save) and `api/admin-push.ts` (rejects the push), and
  mirrored in `scripts/validate-resources.py` (fails CI on any write path:
  routines, scripts, admin PRs). Never add codes by hand; to cover a new grade
  or subject, extend `scripts/fetch-curriculum.py` (Grade 9 courses come in
  through its `secondary` map).
- **Resources must be specific.** `granularity` (activity · lesson · unit ·
  collection · tool · reference) records how focused a resource is; most of the
  catalog has been hubs and whole courses tagged as if they taught one
  expectation. The schema's `intake` gate fails CI for any record added from
  2026-11-07 on that isn't an activity, lesson or unit, or that links a site's
  front page — so any ingest path (routine, script or admin) must drill down to
  the specific page rather than relabel. Older records are classified by the
  enrich-resources routine.
- `usage_notes` and `instructional_modes` are **not display-only**:
  `api/generate-lesson.ts` injects them as "Deployment note" / "Best used as" and
  structures the lesson around them. Changing how they're generated changes
  generated lessons, so verify with a real generation, not just the card UI.
- Triage state lives under `metadata` (`verified`, `needs_review`,
  `review_priority`, `enriched_at`, `link_status`). The admin changeset can write
  `metadata` as a *partial* patch — `applyEdit` in `src/lib/admin-changes.ts`
  merges it so provenance (`added_at` / `added_by`) survives; a plain spread would
  clobber it. `api/admin-push.ts` carries a twin of that merge, since `api/` can't
  import from `src/` — but both ends now take their allowlists from
  `schema/resource-schema.json`, so only the merge itself is hand-synced.
- **Never conflate "our request failed" with "the resource is dead."** A denied
  egress proxy returns 403 for every host, which is how 580 live URLs came to be
  recorded as `blocked`. Link-check code separates `dead` (the site said so) from
  `error` (we failed), and nothing is auto-suppressed on a link verdict. The
  `link_status` vocabulary is closed and shared — `dead`/`dead_domain`/`invalid`/
  `moved` are verdicts about the resource, `blocked`/`error` are about us.

## Known constraints / things that bite

- **PDF rendering:** font stack and layout diverge from browser; always check exports.
- **Truncation:** lesson content has overflowed containers before — verify long
  generations, not just short demo content.
- **Mobile sticky footers** (the planner's Next / Generate bar) are `sticky bottom-0`
  inside the space's scroll container, above the tab bar. Test on real viewport
  heights (375×667 is the tight one), not just desktop devtools.
- **`fixed inset-0` overlays** (assessment modal, drawers): currently not
  viewport-safe on mobile. Phase C will switch to `dvh` + `safe-area-inset`.
- **Performance:** very few `React.memo` / `useMemo` callsites today
  (~5 files). Hot re-render paths sit in `assessment-modal.tsx` and
  `class-dashboard.tsx`.

## Design → Code handoff workflow

1. Make design changes in **Claude Design** (it reads this design-system section
   via the linked `src/` subdirectory).
2. Iterate on the canvas until the layout uses the real tokens above.
3. Hand the bundle to **Claude Code** with one instruction.
4. Claude Code applies it against this repo, respecting the architecture notes
   above and the file conventions below.

## Conventions

- **Branching:** feature work on `claude/<slug>` branches; PRs target `main`.
- **Commits:** short imperative subject (e.g. "Extract Card primitive"); body
  explains *why*, not *what*.
- **PRs:** draft until ready for review; one primitive per PR during Phase B
  rather than a single mega-refactor.
- **No `any` in new TypeScript.** Run `npm run typecheck` before pushing.
- **No hardcoded colors / hex / arbitrary spacing in new code.** Use tokens.
- Reference PRs that set precedent (e.g. backend improvements in PR #44).
- **PR watching:** rely on webhook events (comments, CI failures, merge/close)
  to follow a watched PR. Do **not** schedule `send_later` self check-in
  reminders for it — skip that fallback here.
