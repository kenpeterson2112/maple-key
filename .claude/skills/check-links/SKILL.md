---
name: check-links
description: >-
  Nightly link-health check for public/resources.json. DNS-sweeps every URL
  (catches dead domains) and browser-verifies a rotating ~1/9 slice using
  WebFetch — which loads pages server-side and reads their content, so it tells
  a real dead/404 page from a site that merely bot-walls a script (the 96%-403
  problem that made a plain HTTP probe useless). Flags broken/moved links in a
  single rolling draft PR; never edits resources.json. Runs on the Claude
  subscription — no Anthropic API key.
---

# Check Links — DNS sweep + browser-grade rotation

The deterministic plumbing (DNS, rotation, ledger) lives in
`scripts/link-check.py` and needs no API key. **You** supply the part that
defeats bot-walls: fetching each queued page with `WebFetch` and judging from
its *content* whether the resource is really there. Never use raw `requests` /
`curl` for the verdict — that returns 403 on ~96% of these sites whether or not
the page is live (see `scripts/health-check.py`'s header).

Subject is not a parameter — this checks the whole database, one rotating shard
per night.

## Stage 1 — Set up the rolling branch and carry the ledger forward

This routine maintains **one** standing PR on the `claude/link-health` branch,
refreshed each night, rather than a new PR per run.

```bash
git fetch origin
git checkout -B claude/link-health origin/main
# Carry last night's ledger forward (rotation itself is stateless, but this
# keeps a cumulative view across nights even before the PR is merged).
if git show origin/claude/link-health:public/link-health.json > /tmp/prev-ledger.json 2>/dev/null; then
  cp /tmp/prev-ledger.json public/link-health.json
else
  rm -f public/link-health.json
fi
```

## Stage 2 — Select tonight's work (DNS sweep + shard)

```bash
python3 scripts/link-check.py select --out /tmp/lc-plan.json --cycle 9
```

This DNS-checks all ~1,730 URLs (dead domains + malformed URLs are recorded as
tier-0 findings) and writes tonight's browser queue to `/tmp/lc-plan.json`:

```json
{ "shard": 1, "cycle_days": 9,
  "tier0": { "invalid": [...], "dead_domain": [...] },
  "queue": [ { "url": "...", "id": "r-123", "title": "...", "host": "..." }, ... ] }
```

Read the plan. If `queue` is empty AND both `tier0` lists are empty, skip to
Stage 4 (nothing to verify tonight).

## Stage 3 — Browser-verify the queue with WebFetch

For **each** item in `plan.queue`, call `WebFetch` on its `url` with this prompt:

> Classify this page for a link-health check. Reply with EXACTLY one token,
> then " — ", then a ≤12-word reason.
> Tokens: LIVE (real resource content is present) · DEAD (404 / "page not
> found" / "no longer available" / expired / domain-parking page) · MOVED (the
> page says the content moved, or you were redirected to an unrelated page or a
> bare homepage) · BLOCKED (a login wall or bot/security challenge hides the
> content) · ERROR (server error or empty response).

Rules for turning each fetch into a result:
- Map the token to a lowercase status: `live` / `dead` / `moved` / `blocked` / `error`.
- **WebFetch returned a cross-host redirect URL instead of content:** fetch that
  target once. If it serves the resource → `live` (set `final_url` to the
  target). If it's a homepage / 404 / unrelated page → `moved` (set `final_url`).
- **The WebFetch tool itself failed** (couldn't fetch at all): record `blocked`
  with the error as the reason — a human should look. **Never record `dead`
  from a tool failure**; `dead` requires positive evidence the page is gone.
- Be conservative: when unsure between live and dead, prefer `blocked`. The
  whole point is zero false "dead" positives.

Collect every result into `/tmp/lc-results.json` as a JSON array:

```json
[ { "url": "...", "status": "dead", "reason": "404 page not found", "final_url": null }, ... ]
```

Pace yourself on hot hosts (tonight's queue can carry ~30–40 URLs from a single
domain); fetch sequentially rather than hammering one host in a burst.

## Stage 4 — Apply results and write the ledger

```bash
python3 scripts/link-check.py apply --plan /tmp/lc-plan.json --results /tmp/lc-results.json
```

This merges tier-0 + browser results into `public/link-health.json`, recomputes
the summary, and prints a markdown table of everything broken this run
(`dead` / `dead_domain` / `invalid` / `moved`). Capture that table — it's the PR
body. If it prints `NO_BROKEN_LINKS_THIS_RUN`, there's nothing to report.

## Stage 5 — Land the rolling PR

```bash
git add public/link-health.json
git commit -m "data: refresh nightly link-health report"
git push -f -u origin claude/link-health
```

Then ensure the standing PR is current:
- If **no** open PR exists for `claude/link-health` → `main`, open a **draft** PR
  titled **"Nightly link health"**.
- If one already exists, the force-push updated it — refresh its body.

PR body: lead with the run summary (shard N/9, URLs checked, counts), then the
broken-links table from Stage 4, then a one-line note that `resources.json` was
not modified and the rows are for the maintainer to fix or remove.

If Stage 4 reported `NO_BROKEN_LINKS_THIS_RUN` and no PR is open, make no PR;
just push the ledger refresh so rotation/history stay current.

## Guardrails

- **Never edit `public/resources.json`.** This skill only reads it and writes
  the separate `public/link-health.json` ledger.
- `dead` / `dead_domain` / `invalid` are the only "broken" verdicts that should
  ever come from positive evidence (real 404, DNS failure, malformed URL).
  Bot-walls, challenges, and tool failures are `blocked` — surfaced, but not
  called dead.
- Don't run the API-billed scripts (`fetch-resources.py`,
  `assess-curriculum-expectations.py`); this routine is unrelated to them.
- Requires an environment with outbound network (DNS + WebFetch). No API key.
