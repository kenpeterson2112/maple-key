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

### Color tokens (OKLCH)

Light mode (`:root`):
```
--background:            oklch(0.96  0.02  65)   /* warm cream */
--foreground:            oklch(0.18  0.02  25)
--card:                  oklch(0.99  0.005 70)
--card-foreground:       oklch(0.18  0.02  25)
--popover:               oklch(0.99  0.005 70)
--popover-foreground:    oklch(0.18  0.02  25)
--primary:               oklch(0.6   0.2   30)   /* maple orange */
--primary-foreground:    oklch(0.99  0.005 70)
--secondary:             oklch(0.55  0.22  25)
--secondary-foreground:  oklch(0.99  0.005 70)
--muted:                 oklch(0.85  0.02  50)
--muted-foreground:      oklch(0.4   0.02  25)
--accent:                oklch(0.6   0.2   30)
--accent-foreground:     oklch(0.99  0.005 70)
--destructive:           oklch(0.55  0.24  15)
--destructive-foreground:oklch(0.99  0.005 70)
--border:                oklch(0.9   0.01  50)
--input:                 oklch(0.99  0.005 70)
--ring:                  oklch(0.6   0.2   30)
--radius:                0.875rem
```

Dark mode (`.dark`) is declared in `src/index.css` but not yet wired to a UI
toggle — treat it as defined but unused until a theme switcher lands.

**Rule:** never hardcode hex values in components. Always reference via Tailwind
utilities backed by `@theme inline` (e.g. `bg-primary`, `text-muted-foreground`,
`border-border`).

### Type stack

```
--font-sans:    "Geist", system-ui, -apple-system, sans-serif
--font-display: "Alteix Sans", "Geist", system-ui, sans-serif
```

`Alteix Sans` is loaded via `@font-face` from `/public/fonts/AlteixsansRegulardemo-E4j1n.otf`
with `font-display: swap`. Reserve `--font-display` for marketing / hero
headings; body copy uses `--font-sans`.

**Known gotcha:** PDF rendering does not honor the same font fallback chain as
the browser. Any font change must be verified in the exported PDF, not just on
screen.

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
- **The resource schema has one home: `schema/resource-schema.json`** (currently
  `schema_version` 3.0). It holds every field vocabulary, the required/optional
  split, and the admin allowlists, and all three languages read it:
  `shared/resource-schema.ts` for the client *and* `api/` (both tsconfigs include
  `shared/`), `scripts/_schema.py` for the ingest scripts. Add a subject, strand,
  or link status there — never inline in a component, an API route, or a script.
  The literal unions in `shared/resource-schema.ts` are hand-written because a
  JSON import widens to `string[]`; `scripts/check-schema-sync.py` fails CI if
  they drift. Validate the dataset with `pnpm validate:schema`.
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
