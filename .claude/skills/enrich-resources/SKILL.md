---
name: enrich-resources
description: >-
  Replaces the templated usage_notes and instructional_modes in
  public/resources.json with real per-resource guidance, grounded in each
  resource's actual page via WebFetch. Emits usage_notes,
  pedagogical_function, estimated_minutes and regenerated instructional_modes,
  and reuses the same fetch as a link verdict. Runs in bounded, resumable
  batches and lands a draft PR. Runs on the Claude subscription — no
  Anthropic API key.
---

# Enrich Resources — real per-resource deployment guidance

## Why this exists

`usage_notes` is fake. All 1,743 records share **23 distinct strings**, templated
off `resource_type`: every `video` gets one of four canned sentences, every
`interactive` one of seven. `instructional_modes` is the same generator's work —
1,644 `individual`, 1,403 `whole-class`.

Neither is cosmetic. `api/generate-lesson.ts` injects them into the prompt as
`Deployment note:` and `Best used as`, and line ~284 instructs the model to
structure the lesson around them. **23 canned strings are steering every
generated lesson.** That is what this routine fixes.

The deterministic plumbing is `scripts/enrich-resources.py` (select / apply,
no API key, no network). **You** supply the only part that needs judgement:
reading each resource's actual page and writing notes that could only describe
*that* resource.

## The bar for a good `usage_notes`

The test, applied to every note you write:

> If this sentence were pasted onto a *different* resource of the same
> `resource_type`, would it become false?

If it would still read fine, it is a template and it has failed. That is exactly
what the current 23 strings do wrong. `title` + `description` alone are not
enough to clear this bar — descriptions here run ~185 characters and are
themselves generic — which is why you fetch the page.

Good: "Six sortable card decks of Ontario landform photos; print one deck per
table group and have pairs sort before the class builds a shared T-chart."

Bad: "Flexible deployment: works projected for whole-class instruction or
accessed independently on student devices." (True of anything. This is one of the
23.)

## Stage 0 — Pick tonight's scope

**Pilot first.** Before any catalog-wide run, do junior Science only — 85
records — and let a human read the output. This matches the precedent set by the
display-title naming work.

```bash
# The pilot:
python3 scripts/enrich-resources.py select --out /tmp/en-plan.json \
    --subject Science --grade-band junior --limit 85

# After the pilot is reviewed and merged, ordinary nightly batches:
python3 scripts/enrich-resources.py select --out /tmp/en-plan.json --limit 120
```

`select` skips anything already carrying `metadata.enriched_at`, so runs are
resumable and new resources get picked up automatically — there is no cursor to
fall out of sync. It also skips collection hubs and suppressed records, which are
never served to a teacher. If it prints `NOTHING_TO_ENRICH`, stop: make no commit
and no PR.

Read the plan. Each `batch` entry carries `id`, `url`, `topic_title`,
`description`, `grade_level`, `curriculum_expectations`, and
`current_usage_notes`. **`current_usage_notes` is shown so you can see how
generic it is — never copy or paraphrase it.**

## Stage 0.5 — Preflight: confirm this environment has browser egress

Before fetching any resource, `WebFetch` **one control URL** —
`https://example.com/` — and confirm content comes back.

If the control fails, this environment has no outbound egress. **Stop the run
entirely:** make no commit, no PR, and no partial results file. Report it as an
environment fault naming the control URL that failed.

This is not optional caution. A denied proxy CONNECT returns 403 for *every*
host, live or dead. That fault silently produced 580 phantom `blocked` rows in
the link-health ledger across three nightly runs, and it is the likely origin of
the unsourced "96% of these sites 403 non-browser clients" claim in
`scripts/health-check.py`. An enrichment run without egress would be far worse
than a no-op: it would write 120 confidently-worded notes derived from nothing.

**If you cannot read the page, do not write a note about it.**

## Stage 1 — Fetch and enrich, one resource at a time

For each entry in `plan.batch`, `WebFetch` its `url` and ask for both the
enrichment and the link verdict — one fetch does both jobs, so this routine does
not re-walk the same 1,743 URLs that link-health already walks:

> Describe this specific educational resource for a teacher's lesson plan.
> Report: (1) what the resource actually is and what a student does with it;
> (2) whether the page is live, a 404/expired page, a redirect to unrelated
> content, or a login/bot wall.

From the page content, produce one result object per resource:

| Field | Rule |
| --- | --- |
| `usage_notes` | 1–3 sentences, 40–600 chars, specific enough to fail the paste test above. Say what the teacher *does*: what to print, project, assign, pre-load, or group. |
| `pedagogical_function` | Exactly one of `hook` · `core_teaching` · `guided_practice` · `independent_practice` · `assessment` · `extension`. Closed enum — never invent a value. |
| `estimated_minutes` | Integer 1–600, for the student-facing activity only, based on the resource's actual length/scope. |
| `instructional_modes` | Non-empty subset of `whole-class` · `small-group` · `individual` · `station-rotation`. Judge from the resource, not the old value. Only claim `station-rotation` when the resource genuinely suits a centre. |
| `link_status` | `live` · `dead` · `moved` · `blocked` · `error`. |

Link verdict rules — identical in spirit to `check-links`, and for the same
reason:

- `dead` requires **positive evidence** the page is gone (404, "no longer
  available", expired, domain parking).
- A login wall or bot challenge is `blocked`, never `dead`.
- **A WebFetch tool failure is `error`, never `dead`.** "Our request failed" and
  "the resource is gone" are different facts and must never be conflated — that
  conflation is what corrupted the old link data.
- When torn between live and dead, choose `blocked`. Zero false "dead" positives
  is the goal.

If the verdict is anything other than `live`, still write the other fields **only
if you actually saw enough content to ground them**. If the page gave you
nothing, omit the resource from the results file entirely rather than guessing —
a skipped record is picked up by the next run; a fabricated note is permanent.

Pace yourself on hot hosts (`tvolearn.com` alone has ~250 URLs); fetch
sequentially rather than bursting one domain.

Write `/tmp/en-results.json` as a JSON array:

```json
[
  {
    "id": "r-2328",
    "usage_notes": "Interactive particle simulator with a temperature slider…",
    "pedagogical_function": "guided_practice",
    "estimated_minutes": 20,
    "instructional_modes": ["individual", "whole-class"],
    "link_status": "live"
  }
]
```

## Stage 2 — Apply

```bash
python3 scripts/enrich-resources.py apply --plan /tmp/en-plan.json --results /tmp/en-results.json
```

This validates every field (closed enum, integer range, mode subset, note
length), rejects malformed records individually, writes
`public/resources.json` + mirrors `docs/`, and stamps `metadata.enriched_at`.
A `dead` or `moved` verdict also sets `metadata.needs_review` so the record
surfaces in the admin review queue — **nothing is ever auto-suppressed on a link
verdict.**

It **refuses the whole batch** if more than 15% of the notes are duplicates of
each other. That guard exists because swapping one set of templates for another
would look like success while achieving nothing. If you hit it, you did not read
the pages — rerun the batch properly.

## Stage 3 — Land a draft PR

```bash
git checkout -B claude/enrich-resources-$(date +%Y%m%d)
git add public/resources.json docs/resources.json
git commit -m "data: enrich <scope> resource guidance"
git push -u origin claude/enrich-resources-$(date +%Y%m%d)
```

Open a **draft** PR. In the body:

- The scope and counts (`applied`, `rejected`, `remaining un-enriched`).
- Any records flagged `needs_review` from a link verdict, with the verdict.
- **Three or four full before/after `usage_notes` pairs**, so a reviewer can
  judge the quality without reading the diff. This is the most useful thing in
  the PR — the point of the change is note quality, and the diff is too large to
  eyeball.
- For the pilot run, say explicitly that it is the 85-record junior Science pilot
  and that catalog-wide runs are gated on this review.

## Guardrails

- **Never write a note for a page you could not read.** Omit the record instead.
- **`pedagogical_function` is a closed enum.** It now has one home:
  `schema/resource-schema.json`. Extend it there (and in the matching union in
  `shared/resource-schema.ts`, which `scripts/check-schema-sync.py` enforces), in
  its own PR — never by slipping a new value into a results file.
- Don't run the API-billed scripts (`enrich-usage-notes.py`,
  `fetch-resources.py`, `assess-curriculum-expectations.py`). This routine exists
  to replace `enrich-usage-notes.py` on the subscription; billing the API is
  precisely what `ROUTINES.md` moved away from.
- Don't touch `curriculum_expectations`, `grade_level`, or
  `subject` — those belong to the Assessor stage of the curation waterfall.
- Requires outbound egress (`WebFetch`). No `ANTHROPIC_API_KEY`.
