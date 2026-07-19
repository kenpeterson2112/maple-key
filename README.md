# Maple Key

A Canadian K-12 educational resource discovery platform for teachers.

Single-page React app, built with Vite, with AI-assisted lesson planning and
assessment features powered by serverless functions in `api/`.

## Live site

**Production (canonical): https://maplekey.vercel.app/**

Vercel hosts the full app, including the AI features (lesson generation,
assessment, planning questions) backed by the serverless functions in
`api/*.ts`. This is the deployment to use for anything involving AI.

A secondary static mirror is published to GitHub Pages at
**https://kenpeterson2112.github.io/v0-maple-key-website/** for resource
discovery only. GitHub Pages serves static files with no serverless
runtime, so `api/*.ts` doesn't exist there — any AI feature
(`fetch("/api/generate-lesson")` etc.) 404s silently. Don't rely on the
Pages mirror to test or demo AI functionality.

## Stack

- React 19
- Vite 6
- Tailwind CSS v4
- Radix UI (Popover, Dialog) for primitives
- framer-motion for animation
- SWR for the static `resources.json` fetch
- Anthropic SDK, called from Vercel serverless functions in `api/` (lesson
  planning, generation, assessment) — Vercel-only, not available on the
  GitHub Pages mirror

## Develop

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints (typically http://localhost:5173).

## Build

```bash
pnpm build
```

Outputs a static site in `dist/`. For a build with the GitHub Pages
sub-path baked in:

```bash
VITE_BASE_PATH=/v0-maple-key-website/ pnpm build
```

## Admin — Database Manager

Open the app with the `#admin` hash (e.g. `https://maplekey.vercel.app/#admin`)
to load a stripped-down curation surface over `public/resources.json`:
search and filter every record (including collections and suppressed ones),
then tag, suppress, edit, or delete resources. Changes accumulate locally
(they survive reloads via localStorage) until you push them.

**Push to GitHub** sends the changeset to `api/admin-push.ts`, which applies
it to both `public/resources.json` and `docs/resources.json` on a fresh
`admin/resource-edits-*` branch and opens a draft PR — merging the PR is the
review gate; nothing writes to `main` directly. **Download JSON** is the
no-server fallback: it downloads the edited `resources.json` for a manual
commit.

Two Vercel env vars power the push flow:

- `MK_ADMIN_SECRET` — the admin key you type into the push dialog. Not baked
  into the client bundle (unlike `MK_API_SECRET`), so visitors who find
  `#admin` can browse but not open PRs.
- `MK_ADMIN_GITHUB_TOKEN` — fine-grained PAT scoped to this repo with
  *Contents: write* and *Pull requests: write*.

Suppression model: `is_collection` marks hub/index pages (see
`scripts/detect-collections.py`), `suppressed` is the manual catch-all set
from this tool. Both hide a record from every teacher-facing search surface
(`src/lib/use-filtered-resources.ts`) without deleting it.

## Deployment

### Production — Vercel (canonical)

Vercel's GitHub integration auto-builds and deploys on every push to
`main` (see `vercel.json`). This is the only place the AI features work,
because only Vercel runs the serverless functions in `api/`. Don't change
this without updating this README, `CLAUDE.md`, and `DESIGNER_HANDOFF.md`
together.

### Static mirror — GitHub Pages (discovery-only)

`.github/workflows/deploy.yml` also runs on every push to `main`:

1. Builds with `VITE_BASE_PATH=/v0-maple-key-website/`.
2. Replaces the `docs/` folder with the new `dist/` output.
3. Commits the result back to `main` with `[skip ci]` (the marker
   prevents an infinite loop).

GitHub Pages serves the result from `main/docs/`. This mirror has no
serverless runtime, so it's resource-discovery only — the lesson
planning, generation, and assessment features won't work there.

#### One-time Pages setup

In repo Settings → Pages:

- **Source:** *Deploy from a branch*
- **Branch:** `main` / `/docs`

A `.nojekyll` file is dropped into `docs/` by the workflow so GitHub
Pages bypasses Jekyll and serves the assets verbatim.
