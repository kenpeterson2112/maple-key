# Nightly routines — Claude Code

The nightly resource discovery used to run as **GitHub Actions** that called the
**Anthropic API** (per-token billing via `ANTHROPIC_API_KEY`). That is now
replaced by **Claude Code routines** — scheduled sessions that run on Anthropic's
cloud and draw down your **Claude Pro/Max subscription** instead of the API.

The two `nightly-*.yml` workflows are kept only as a manual, API-billed fallback
(`workflow_dispatch`); their nightly `schedule:` triggers were removed.

## How the routine does the work without the API

A routine is a saved prompt + repo + trigger. When it runs, **Claude itself** is
the agent and does the Researcher → review → Assessor reasoning with its own
`WebSearch` / `WebFetch` tools, via the committed skill at
`.claude/skills/refresh-resources/`. No `messages.create()` call, no API key —
so the cost lands on your subscription.

## One-time setup (in your Claude account)

Routines live in your Claude account, not in this repo — they can't be created
by a commit. Set each one up once:

1. Go to **https://claude.ai/code/routines** → **New routine**
   (or, in the CLI, run `/schedule` and follow the prompts).
2. **Repository:** `kenpeterson2112/maple-key`.
3. **Environment:** pick one with web access (the default **Trusted** network
   level is fine) so `WebSearch` / `WebFetch` work. No `ANTHROPIC_API_KEY` is
   needed.
4. **Trigger:** Schedule → daily. Times are entered in your local timezone and
   converted to UTC. Suggested cadence below (staggered so the two PRs stay
   separate).
5. **Prompt:** paste the matching prompt below.
6. Save. Each nightly run opens a **draft PR** you can review and merge.

Create **five** routines: four resource-refresh (one per subject, below) and
one link-health (further below).

### Routine 1 — Science (suggested: daily 02:00 UTC)

```
Refresh the Maple Key Science resource library. Use the `refresh-resources`
skill with subject = science. Follow the Researcher → review → Assessor
waterfall exactly: discover candidate resources with the skill's Science seed
searches, curate 3–8 that genuinely fit Ontario grades 6–9 and match the
schema, verify every URL loads, then in the Assessor pass assign real Ontario
curriculum expectation codes and grade levels. Append them to
public/resources.json and mirror the change to docs/resources.json (updating
meta.total_count and meta.generated_at). Skip any URL already present. Commit
to a claude/ branch and open a draft PR titled "data: add nightly Science
resources". If no suitable new resources are found, make no commit and stop.
```

### Routine 2 — Social Studies (suggested: daily 02:30 UTC)

```
Refresh the Maple Key Social Studies resource library. Use the
`refresh-resources` skill with subject = social_studies. Follow the Researcher
→ review → Assessor waterfall exactly: discover candidate resources with the
skill's Social Studies seed searches, curate 3–8 that genuinely fit Ontario
grades 1–6 and match the schema, verify every URL loads, then in the Assessor
pass assign real Ontario curriculum expectation codes and grade levels. Append
them to public/resources.json and mirror the change to docs/resources.json
(updating meta.total_count and meta.generated_at). Skip any URL already
present. Commit to a claude/ branch and open a draft PR titled "data: add
nightly Social Studies resources". If no suitable new resources are found, make
no commit and stop.
```

### Routine 3 — History (suggested: daily 03:00 UTC)

```
Refresh the Maple Key History resource library. Use the `refresh-resources`
skill with subject = history. Follow the Researcher → review → Assessor
waterfall exactly: discover candidate resources with the skill's History seed
searches, curate 3–8 that genuinely fit Ontario grades 7–8 and match the
schema, verify every URL loads, then in the Assessor pass assign real Ontario
curriculum expectation codes and grade levels. Append them to
public/resources.json and mirror the change to docs/resources.json (updating
meta.total_count and meta.generated_at). Skip any URL already present. Commit
to a claude/ branch and open a draft PR titled "data: add nightly History
resources". If no suitable new resources are found, make no commit and stop.
```

### Routine 4 — Geography (suggested: daily 03:30 UTC)

```
Refresh the Maple Key Geography resource library. Use the `refresh-resources`
skill with subject = geography. Follow the Researcher → review → Assessor
waterfall exactly: discover candidate resources with the skill's Geography
seed searches, curate 3–8 that genuinely fit Ontario grades 7–8 and match the
schema, verify every URL loads, then in the Assessor pass assign real Ontario
curriculum expectation codes and grade levels. Append them to
public/resources.json and mirror the change to docs/resources.json (updating
meta.total_count and meta.generated_at). Skip any URL already present. Commit
to a claude/ branch and open a draft PR titled "data: add nightly Geography
resources". If no suitable new resources are found, make no commit and stop.
```

### Routine 5 — Link health (suggested: daily 04:30 UTC)

Unlike the resource routines, this one checks the *existing* library for broken
links. It runs `scripts/link-check.py` for the deterministic parts — a nightly
DNS sweep of all ~1,730 URLs (instant dead-domain / malformed-URL flags) plus a
date-sharded ~1/9 rotation, so the whole database gets a browser-grade check
about once a week — and uses Claude's `WebFetch` for the verdict: it loads each
queued page and reads its content, which sidesteps the bot-blocking that makes a
plain HTTP probe return 403 on ~96% of these sites. Findings land in one
**rolling** draft PR on `claude/link-health` and in `public/link-health.json`;
`resources.json` is never touched.

```
Run the Maple Key nightly link-health check. Use the `check-links` skill. It
DNS-sweeps every URL in public/resources.json (flagging dead domains and
malformed URLs) and browser-verifies tonight's rotating ~1/9 shard with
WebFetch, classifying each page as live / dead / moved / blocked / error from
its actual content — so bot-walls aren't mistaken for dead links. Maintain the
single rolling branch claude/link-health: carry the prior public/link-health.json
forward, write the updated ledger, and keep one draft PR titled "Nightly link
health" current with the broken-links report. Never modify public/resources.json.
If nothing is broken this run, refresh the ledger but open no PR.
```

This session can be long — it makes ~150–190 WebFetch calls a night — so give it
a little headroom after the resource routines.

## Notes & limits

- **Billing:** routine runs consume subscription usage, not API token credits.
- **Frequency:** routines allow a minimum 1-hour interval and have a per-account
  daily run cap — five runs/night is comfortably within that. See your remaining runs at
  https://claude.ai/code/routines and https://claude.ai/settings/usage.
- **Review gate:** new rows are stamped `needs_review: true`, and runs land as
  **draft PRs** rather than committing straight to `main`.
- **Fallback:** the API path still exists if you ever need it — run the
  `Nightly Science / Social Studies Resource Discovery` workflows manually from
  the Actions tab (`workflow_dispatch`). These still require `ANTHROPIC_API_KEY`.
- **Link health vs. resource refresh:** link health checks the *existing*
  library (broken/moved links) and writes only `public/link-health.json` via a
  rolling PR; it never edits `resources.json`. The two resource routines *add*
  new rows. Tune the sweep with `--cycle` (nights for a full pass) and
  `--per-host-cap` in `scripts/link-check.py`.
- Routines are a research-preview feature; the UI and limits may change.
