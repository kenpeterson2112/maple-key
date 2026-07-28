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

## Prerequisite — the routine environment needs open web egress

Every one of these routines is a web-research job. `WebSearch` finds candidates,
`WebFetch` verifies them, and for link health `WebFetch` *is* the verdict. If the
environment's network policy blocks outbound HTTPS to arbitrary hosts, both
routines still "succeed" nightly while accomplishing nothing.

**How to tell:** in a session on that environment, `WebFetch https://example.com/`.
A `403` or `407` is the egress proxy refusing on policy — not a dead site.
`curl -sS "$HTTPS_PROXY/__agentproxy/status"` reports the proxy state and recent
denials. Package registries (npm, PyPI, crates.io) are usually allowed even when
the open web is not, so a successful `pnpm install` proves nothing here.

**How to fix:** open the environment at https://claude.ai/settings and raise its
network access level so general web hosts are reachable. The routines need no
`ANTHROPIC_API_KEY` — only network.

Both skills now preflight this and fail loudly (`check-links` Stage 3a,
`refresh-resources` Stage 0.5) rather than reporting an empty run. A run that
stops with "environment fault: control URL failed" is the preflight working, not
a new bug.

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
   converted to UTC. Use the cron below (staggered so the two PRs stay
   separate).
5. **Prompt:** paste the matching prompt below.
6. Save. Each nightly run opens a **draft PR** you can review and merge.

Create **two** routines: one rotating resource-refresh routine and one
link-health routine.

Earlier versions of this document told you to create five — one per subject plus
link health. That is now one routine covering all four subjects, because four
near-identical schedules meant four things to misconfigure independently, and
two of them sat un-scheduled and unnoticed for six weeks. Fewer moving parts is
the point.

### Routine 1 — Resource refresh, rotating subject (daily 02:00 UTC — `0 2 * * *`)

One routine covers all four subjects on a four-night cycle. The skill derives
tonight's subject from the date (`days_since_epoch % 4` over
`science → social_studies → history → geography`), the same stateless rotation
`scripts/link-check.py` uses for its shard. A missed night costs one subject's
turn and nothing else — there is no cursor to fall out of sync.

Do **not** name a subject in the prompt; that is what switches the skill into
manual single-subject mode.

```
Refresh the Maple Key resource library for tonight's rotating subject. Use the
`refresh-resources` skill and let it derive the subject from the date — do not
pick one yourself. Follow the Researcher → review → Assessor waterfall exactly:
run the skill's seed searches for that subject, curate 3-8 resources that
genuinely fit the subject's Ontario grade scope and match the schema, verify
every URL loads, then in the Assessor pass assign real Ontario curriculum
expectation codes and grade levels. Append them to public/resources.json and
mirror the change to docs/resources.json (updating meta.total_count and
meta.generated_at). Skip any URL already present. Commit to a claude/ branch and
open a draft PR titled "data: add nightly <Subject> resources". If the Stage 0.5
egress preflight fails, report that as an environment fault and stop. If no
suitable new resources are found, make no commit and stop.
```

### Routine 2 — Link health (daily 04:30 UTC — `30 4 * * *`)

**Must be daily.** The shard is derived from the date
(`days_since_epoch % cycle`), so a nightly run walks all 9 shards in 9 nights.
On a weekly cadence the same rotation takes 9 weeks and most of the library
sits `unchecked` indefinitely.

Unlike the resource routine, this one checks the *existing* library for broken
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
a little headroom after the resource routine.

## Verifying the routines actually run

### The watchdog does this for you

`.github/workflows/routine-watchdog.yml` runs every day at 12:00 UTC and opens
a GitHub issue when the routines stop producing fresh output. It reads only the
files the routines maintain — `public/link-health.json` (`meta.last_run`,
`meta.summary`) and `public/resources.json` (`meta.generated_at`) — and never
calls a routine or the Anthropic API.

That indirection is deliberate: **a routine that never fires cannot report its
own absence.** Push notifications, preflights and better prompts all live
*inside* the run, so none of them fire either. The alarm has to be somewhere
that executes independently, which is why it is a plain GitHub Actions cron
rather than a sixth routine.

It maintains one issue, edited in place rather than re-posted, and closes it
automatically once every check passes again. Run it by hand any time:

```bash
python3 scripts/routine-watchdog.py
```

It flags three things: link health not running for 3+ days, a link-health run
that produced `blocked` rows but zero `live`/`dead`/`moved` verdicts (the
signature of blocked egress, not of bad links), and a resource library that has
not grown in 21 days. The resource threshold is generous on purpose — an
occasional empty night is a legitimate outcome of the waterfall.

### Checking by hand

If you want to look yourself, these routines fail *quietly*. A routine with no
schedule, or one pointed at an environment with no web egress, looks healthy in
the UI and produces nothing. Check all four of these, not just the first:

| Check | Where | Healthy looks like |
| --- | --- | --- |
| Schedule is set | https://claude.ai/code/routines | Every routine shows a **next run** time. A routine with no cron never fires — it is poke-only, and the UI does not flag this. |
| Cadence matches the design | same | Both are **daily**. Link health on a weekly cadence stretches its 9-night rotation to 9 *weeks*. |
| It has run recently | same | A **last run** within the last day. |
| It produced something | repo PR list | The resource routine opens `data: add nightly <Subject> resources` draft PRs; link health keeps one rolling `Nightly link health` PR current. |

The ledger is the fastest health signal for link checking:

```bash
python3 -c "import json;print(json.load(open('public/link-health.json'))['meta'])"
```

`summary.blocked` in the hundreds with **zero** `live` means the browser tier
never worked — that is the egress fault above, not 580 bad links. A healthy run
is mostly `live` with a small `blocked` tail from genuine bot-walls.

## Known drift (audited 2026-07-28)

The live routines had diverged from this document. Recorded here so the next
audit has a baseline:

- **Science** and **Social Studies** routines existed but had **no cron
  expression** — `next_run_at` was unset and neither had *ever* fired since
  being created on 2026-06-16. No resource PR has ever landed.
- **History** and **Geography** routines were **never created**, so half the
  subjects had no automation at all.
- **Link health** ran weekly (`0 7 * * 6`) instead of nightly, stretching a
  9-night sweep to 9 weeks. This is why ~1,100 of 1,743 URLs sat `unchecked`.
- The environment's egress policy blocked `WebFetch`, so the browser tier
  recorded 580 `blocked` / 0 `live` across runs on 2026-06-17, 07-04, 07-18 and
  07-25.
- The live Social Studies prompt asked for grades **6–9**; social studies is
  grades **1–6** (see the corrected prompt above).

Routines created through the web UI can only be edited in the web UI — the API
refuses agent edits to them, so an agent cannot repair this drift for you.

**What changed in response:** the four per-subject routines collapsed into one
date-rotating routine (four schedules to keep correct became one), and
`.github/workflows/routine-watchdog.yml` now watches the output independently so
the next six-week silence surfaces on day three instead of never. Neither change
can set a cron for you — that part is still manual, and still the first thing to
check.

## Notes & limits

- **Billing:** routine runs consume subscription usage, not API token credits.
- **Frequency:** routines allow a minimum 1-hour interval and have a per-account
  daily run cap — two runs/night is comfortably within that. See your remaining runs at
  https://claude.ai/code/routines and https://claude.ai/settings/usage.
- **Review gate:** new rows are stamped `needs_review: true`, and runs land as
  **draft PRs** rather than committing straight to `main`.
- **Fallback:** the API path still exists if you ever need it — run the
  `Nightly Science / Social Studies Resource Discovery` workflows manually from
  the Actions tab (`workflow_dispatch`). These still require `ANTHROPIC_API_KEY`.
- **Link health vs. resource refresh:** link health checks the *existing*
  library (broken/moved links) and writes only `public/link-health.json` via a
  rolling PR; it never edits `resources.json`. The resource routine *adds*
  new rows. Tune the sweep with `--cycle` (nights for a full pass) and
  `--per-host-cap` in `scripts/link-check.py`.
- Routines are a research-preview feature; the UI and limits may change.
