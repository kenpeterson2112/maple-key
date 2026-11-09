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

Bright autumn: **apple red** primary, **teal** secondary, **goldenrod** pop, on a
warm near-white. Dark mode is **warm cocoa**, not greyscale. The values live in
`src/index.css` as OKLCH; the hex below is what each one renders as (the CSS
comments carry the same hex, and `pnpm check:contrast` fails if they drift).

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | `#FFFDF8` | `#1C1714` | page |
| `foreground` | `#2A1E1A` | `#F5EDE6` | body text and headings |
| `card` / `card-foreground` | `#FFFFFF` / `#2A1E1A` | `#262019` / `#F5EDE6` | cards, panels |
| `popover` / `popover-foreground` | `#FFFFFF` / `#2A1E1A` | `#2D2620` / `#F5EDE6` | popovers, menus |
| `primary` | `#D93A26` | `#FF5A43` | main actions, brand fills; text on background/card only |
| `primary-hover` | `#C2301D` | `#FF7360` | hover/pressed state of a `primary` fill |
| `primary-strong` | `#B82C1A` | `#FF7360` | red text/icons on muted or any tint |
| `primary-foreground` | `#FFFFFF` | `#1C1714` | text on a `primary` fill |
| `primary-tint` | `#FDE7E3` | `#3D211C` | selected chips and rows |
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
- **Assessment accent, differentiation callouts, warnings, star ratings, "needs work":** goldenrod `pop` (`pop-tint` panel, `pop-strong` text, `pop` fill with `pop-foreground`).
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
`lib/student-activity-pdf.ts`).

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

## Architecture notes for Claude Code

- Lesson generation is a **two-call flow**: planning questions first, then
  generation. Don't collapse it into one call.
- **The lesson shape is specified in `LESSON_SPEC.md`** (three-part arc,
  success criteria, differentiation, CRRP and equity framing, reflection
  checkpoint, and the output rules). The prompt in `api/generate-lesson.ts` and
  its manual-fallback copy in `src/components/lesson-planner/lesson-export.ts`
  implement it; change all three together.
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
- **The resource schema has one home: `schema/resource-schema.json`** (currently
  `schema_version` 3.0). It holds every field vocabulary, the required/optional
  split, and the admin allowlists, and all three languages read it:
  `shared/resource-schema.ts` for the client *and* `api/` (both tsconfigs include
  `shared/`), `scripts/_schema.py` for the ingest scripts. Add a subject, strand,
  or link status there — never inline in a component, an API route, or a script.
  The literal unions in `shared/resource-schema.ts` are hand-written because a
  JSON import widens to `string[]`; `scripts/check-schema-sync.py` fails CI if
  they drift. Validate the dataset with `pnpm validate:schema`.
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
- **Mobile sticky footer:** driven by IntersectionObserver; test on real viewport
  heights, not just desktop devtools.
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
