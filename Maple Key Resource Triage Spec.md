# Maple Key Resource Triage Spec

## Purpose

Automate first-pass classification of the Maple Key resource database so that Ken reviews a short, pre-sorted list instead of raw entries. The pipeline must be subject-agnostic: nothing in the rubric, prompt, or schema may reference math or any specific subject. The first run is scoped to intermediate (grade 6 to 8) math only; all other records remain untouched and flagged as unreviewed.

## Scope of the first run

- Filter the Supabase resources table to records tagged grade 6, 7, or 8 and subject math.
- Every record outside that slice gets `triage_status = unreviewed` and is not fetched.
- Nothing is deleted in this pass. Records are labelled, not removed.

## Pipeline steps

1. Select the in-scope slice from Supabase.
2. For each record, fetch the URL. Capture HTTP status, final URL after redirects, page title, and visible text (trimmed to roughly 6,000 characters) plus the list of outbound links with their anchor text.
3. Send the fetched content and the existing record metadata (title, description, grade, subject, expectation tags) to Claude with the rubric prompt below.
4. Write the structured result back to a `resource_triage` table keyed on the resource id.
5. Derive the review pile from the result (see Review piles).
6. Ken reviews the "needs a look" pile in the app or a simple table view, approving or rejecting each item. Approvals and rejections are written back as `human_decision`.

## Classification rubric

Exactly one type label per record:

- **atomic**: a single usable thing a teacher could drop into one lesson. Examples: a lesson plan, a task or problem set, a video, a worksheet or blackline master, an interactive or simulation, a reading passage.
- **hub**: a page whose primary job is to link to other resources. Examples: a unit index, a publisher landing page, a curated list, a search results page, a course home page.
- **dead**: the URL is broken, returns an error, is paywalled or login-walled with no preview, or redirects to something unrelated to the original record.
- **unclear**: the model cannot confidently assign one of the above. This is the escalation bucket and should be rare.

## Quality checks (atomic only)

Four yes-or-no checks, each with a one-clause reason:

1. **clear\_goal**: a teacher could state the learning goal in one sentence.
2. **single\_lesson**: usable within one lesson without major preparation or multi-day setup.
3. **curriculum\_mappable**: maps to at least one curriculum expectation (the model may suggest expectation codes if the record has none, flagged as suggestions).
4. **no\_red\_flags**: free of major problems such as heavy advertising, required student logins, clearly dated content, or inappropriate material.

Hubs, dead and unclear records skip the checks; their check fields are null.

## Hub handling

For hubs, the model returns a list of outbound links that look like candidate child resources (links whose anchor text or URL suggests a lesson, activity, worksheet, video or similar). These go to a `harvest_queue` table and are not scored in this pass. Navigation links, social links, and links back to the same domain root are excluded.

## Model output schema

The model returns strict JSON matching this shape:

```json
{
  "type": "atomic | hub | dead | unclear",
  "confidence": 0.0,
  "reasoning": "one sentence, max 200 characters",
  "checks": {
    "clear_goal": { "pass": true, "reason": "" },
    "single_lesson": { "pass": true, "reason": "" },
    "curriculum_mappable": { "pass": true, "reason": "" },
    "no_red_flags": { "pass": true, "reason": "" }
  },
  "suggested_expectations": ["string"],
  "candidate_children": [
    { "url": "", "anchor_text": "", "guess": "lesson | activity | worksheet | video | other" }
  ],
  "fetch": {
    "http_status": 200,
    "final_url": "",
    "page_title": ""
  }
}
```

`checks` is null for non-atomic types. `candidate_children` is an empty array for non-hub types.

## Supabase tables

### resource\_triage

| column | type | notes |
| --- | --- | --- |
| resource\_id | uuid, primary key, references resources | one row per resource |
| triage\_status | text | unreviewed, triaged, approved, rejected |
| type | text | atomic, hub, dead, unclear |
| confidence | numeric | 0 to 1 |
| reasoning | text | one sentence |
| check\_clear\_goal | boolean, nullable |  |
| check\_single\_lesson | boolean, nullable |  |
| check\_curriculum\_mappable | boolean, nullable |  |
| check\_no\_red\_flags | boolean, nullable |  |
| check\_reasons | jsonb | the four reason strings |
| suggested\_expectations | text\[\] | model suggestions only, not applied |
| http\_status | integer |  |
| final\_url | text |  |
| page\_title | text |  |
| review\_pile | text | likely\_keep, needs\_a\_look, hub, dead |
| human\_decision | text, nullable | keep, drop, defer |
| human\_note | text, nullable |  |
| triaged\_at | timestamptz |  |
| reviewed\_at | timestamptz, nullable |  |
| model | text | model id used |
| rubric\_version | text | bump when the prompt changes |

### harvest\_queue

| column | type | notes |
| --- | --- | --- |
| id | uuid, primary key |  |
| parent\_resource\_id | uuid, references resources | the hub it came from |
| url | text |  |
| anchor\_text | text |  |
| guess | text | lesson, activity, worksheet, video, other |
| status | text | queued, harvested, skipped |
| created\_at | timestamptz |  |

Unique constraint on (parent\_resource\_id, url).

## Review piles

- **likely\_keep**: type is atomic, all four checks pass, confidence at or above 0.75. Ken skims titles only; opens items on exception.
- **needs\_a\_look**: type is atomic with at least one failing check, or confidence below 0.75, or type is unclear. Ken reads the one-sentence reasoning and the failing check reasons, then decides keep, drop or defer.
- **hub**: no review this pass. Children sit in harvest\_queue for a later harvesting routine.
- **dead**: no review. Spot-check a random ten to confirm the fetcher is not misfiring, then bulk-mark as rejected.

## Nightly run

After the first slice has been triaged as a one-off and the rubric is tuned, the same triage step runs unattended each night to work through the rest of the database in small batches. The bottleneck is Ken's review time, not the automation, so the nightly run is sized to what he can review in about five minutes a day.

### Selection

- Each run selects up to `BATCH_SIZE` records (starting value: 30) where `triage_status = unreviewed`, or where the stored `rubric_version` is older than the current one and `human_decision` is null.
- Records with a `human_decision` are never re-triaged automatically, even after a rubric change.
- Selection order comes from a `triage_priority` integer on each record: pilot slice first, then the rest of grades 6 to 8, then outward by grade and subject. Priority is set by a Supabase filter, not by anything in the prompt.

### Backpressure

- Before selecting, the run counts records where `review_pile = needs_a_look` and `human_decision` is null.
- If that count is above `MAX_PENDING_REVIEW` (starting value: 50), the run triages nothing and reports that it skipped. This keeps the review queue from growing faster than Ken clears it.

### Safe re-runs

- Writes are upserts keyed on `resource_id`, so a repeated or partially failed run cannot create duplicates.
- Each record is written as soon as it is triaged. A run that dies halfway leaves finished records done and the rest still unreviewed for the next night.
- A fetch that fails for network reasons (timeout, DNS, 5xx) is not labelled dead on the first attempt. It increments `fetch_attempts` and stays unreviewed; it is labelled dead only after three failed nights.
- The run writes only to `resource_triage`, `harvest_queue` and `triage_runs`. It never edits or deletes rows in the resources table.

### Run log

One row per run in a `triage_runs` table:

| column | type | notes |
| --- | --- | --- |
| id | uuid, primary key |  |
| started\_at | timestamptz |  |
| finished\_at | timestamptz, nullable | null means the run did not complete |
| status | text | completed, skipped\_backpressure, failed |
| selected | integer | records picked up |
| triaged | integer | records written |
| count\_likely\_keep | integer |  |
| count\_needs\_a\_look | integer |  |
| count\_hub | integer |  |
| count\_dead | integer |  |
| fetch\_failures | integer |  |
| children\_queued | integer | links added to harvest\_queue |
| remaining\_unreviewed | integer | database-wide, after the run |
| rubric\_version | text |  |
| error | text, nullable |  |

Two columns are added to `resource_triage` to support this: `fetch_attempts` (integer, default 0) and `run_id` (uuid, references triage\_runs).

### Morning digest

After each run, a short summary goes to Ken (email or a pinned row in the review view):

- Triaged last night, split by pile.
- How many items are waiting in "needs a look", with a link to that queue.
- How many unreviewed records remain and a rough finish date at the current pace.
- Anything unusual: a skipped run, a failed run, or a dead rate above 30 percent for the night, which usually means the fetcher is broken rather than the links.

### Guardrails

- A hard cap on model calls per run equal to `BATCH_SIZE`, so a bug cannot run up cost.
- If more than half of a night's fetches fail, the run stops early, marks itself failed, and labels nothing dead.
- Changing the prompt or rubric requires bumping `rubric_version`, so every result can be traced to the rubric that produced it.

### Pace

At 30 records a night with roughly a third landing in "needs a look", a database of about 1,200 records is fully triaged in around six weeks, with about ten items a day for Ken to decide on. Raise `BATCH_SIZE` only if the review queue is consistently empty.

## Model prompt (outline)

System: You classify educational web resources for a lesson planning platform. You are given the fetched content of a page and its existing catalogue metadata. Return only JSON matching the schema. Be conservative: if a page both contains a usable activity and links to many others, classify by its primary purpose. Do not reference any specific subject in your reasoning beyond what the content itself states.

User message contains: record metadata, http status, final URL, page title, trimmed page text, outbound links list, the rubric definitions above, and the JSON schema.

## Portability test

Before expanding past the first slice, confirm:

- The prompt, rubric and schema contain no subject-specific language.
- Running the pipeline on a small second slice (for example grade 6 science) requires only a change to the Supabase filter.
- Review piles behave the same way on the second slice.

## Out of scope for this pass

- Harvesting children from hubs (separate routine, feeds from harvest\_queue).
- Deleting records.
- Rewriting resource titles or descriptions.
- Applying suggested expectation codes automatically.

## Open decisions

- Whether the review UI lives inside the Maple Key app or a lightweight Supabase table view.
- Confidence threshold (0.75 is a starting point; adjust after the first hundred records).
- Whether the triage runs inside the existing `mk-ops-dbcaretaker` repo or as its own routine.
