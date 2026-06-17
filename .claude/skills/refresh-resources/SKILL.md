---
name: refresh-resources
description: >-
  Discover and curate new Ontario grades 6–9 educational resources for one
  subject (science or social_studies) and append them to public/resources.json
  via the Researcher → review → Assessor waterfall. Use for the nightly
  resource-refresh routine (see ROUTINES.md) or an on-demand manual refresh.
  Runs entirely on the Claude subscription — it does NOT call the Anthropic API
  and needs no ANTHROPIC_API_KEY. This replaces the per-token work that
  scripts/fetch-resources.py and scripts/assess-curriculum-expectations.py
  used to do via the API.
---

# Refresh Resources — three-agent curation waterfall

You ARE the curation agents. Do the reasoning yourself with `WebSearch` /
`WebFetch` and your own judgement — never shell out to
`scripts/fetch-resources.py` or `scripts/assess-curriculum-expectations.py`
(those bill the Anthropic API, which is exactly what this skill exists to
avoid).

Keep the three stages **distinct** — per CLAUDE.md the waterfall is the
competitive-moat story, so do not collapse Researcher, review, and Assessor
into one pass.

## Input

One subject per run: `science` or `social_studies`. The routine prompt names it.

## Files (read and write both)

- `public/resources.json` — canonical store. Shape: `{ "meta": {...}, "resources": [ ... ] }`.
- `docs/resources.json` — published mirror. After editing `public/`, write the
  identical JSON to `docs/` **only if that file already exists**.

Use 2-space indentation and `ensure_ascii=false` semantics (keep accented
characters as-is) to match the existing file style.

## Subject config

**science**
- Strands: `Earth and Space Systems`, `Life Systems`, `Matter and Energy`, `STEM Skills and Connections`
- Seed searches:
  - Ontario science curriculum grades 6 7 8 9 free educational resources teachers
  - Earth Space Systems Ontario grades 6-9 interactive learning resources
  - Life Systems biology ecology Ontario curriculum middle school free
  - Matter Energy chemistry physics Ontario grades 6-9 educational resources
  - STEM skills connections Ontario curriculum interactive activities free
  - Canadian science education resources grades 6 to 9 online free

**social_studies**
- Strands: `Heritage and Identity`, `People and Environments`, `Power and Governance`
- Seed searches:
  - Ontario social studies curriculum grades 6 7 8 free educational resources
  - Heritage Identity Canadian history culture Ontario grades 6-9 resources
  - People Environments geography Ontario curriculum middle school free
  - Power Governance civics democracy Ontario grades 6-9 resources
  - Canadian geography history civics free classroom resources teachers
  - Indigenous culture heritage Ontario curriculum resources teachers free

## Stage 0 — Load & dedup baseline

1. Read `public/resources.json`.
2. Build the set of existing `url` values — you will skip any candidate whose
   URL already appears.
3. Note the highest existing id of the form `r-<N>`; new ids continue from
   `max(N) + 1`.

## Stage 1 — Researcher (discover)

Run each seed search for the subject with `WebSearch`. Collect candidates as
`{title, url, snippet}`, dedup by URL, and drop any URL already in the store.
Aim for a healthy candidate pool before curating.

## Stage 2 — Review (curate & validate)

From the candidates, select **3–8** genuinely useful resources for Ontario
grades 6–9 and emit each as an object matching this schema **exactly**:

```json
{
  "topic_title": "string — clear descriptive title",
  "description": "string — 2-3 sentences on what the resource offers",
  "url": "string — a real URL from the candidates",
  "publisher_creator": "string — organization or author",
  "grade_level": [6, 7, 8],
  "grade_band": "one of: primary | junior | intermediate | senior | multi",
  "subject": "Science | Social Studies (display form, matching existing rows)",
  "strand": ["one or more from the subject's strand list above"],
  "province": "ON | BC | AB | CANADA",
  "jurisdiction": "ontario | british_columbia | alberta | canada",
  "modality": ["subset of: Online, Interactive, Video, Audio/Podcast, Books & Print Media, Field Trip, Guest Speaker"],
  "resource_type": "one of: digital | interactive | video | print | audio | kit | other",
  "access_type": "one of: free | purchase | licensed",
  "is_paid": false,
  "curriculum_expectations": ["1-5 codes — set in Stage 3"],
  "accessibility": ["No Concerns"],
  "instructional_modes": [],
  "usage_notes": null,
  "alignments": [
    {
      "jurisdiction": "ontario",
      "grade": "[6, 7, 8]",
      "subject": "snake_case, e.g. social_studies",
      "strand": "snake_case, e.g. heritage_and_identity",
      "expectation_code": null,
      "expectation_description": null,
      "alignment_strength": "primary"
    }
  ]
}
```

Curation rules:
- Clearly educational and appropriate for grades 6–9. Prefer **free, online,
  Canadian / Ontario-specific** resources.
- Skip duplicates, ads, low-quality pages, and bare search-engine homepages.
- **No hub/category/homepage links.** A teacher who already knows TVO Learn,
  PhET, or STAO exist gets nothing from a link to their front page or a
  category listing (e.g. `phet.colorado.edu/`, `stao.ca/category/free/`,
  `tvolearn.com/`). Drill down one level further and link the specific
  lesson, unit, activity, or simulation page a teacher could open and use in
  a single class — e.g. `phet.colorado.edu/en/simulations/gravity-and-orbits`,
  not `phet.colorado.edu/`. If a search turns up a repository, search again
  *within* it for the individual resource before giving up on that source.
- `grade_level` is a JSON array of integers (e.g. `[6, 7, 8]`) or the strings
  `"K"` / `"PreK"` — never strings like `"[6]"`.
- One `alignments` entry per strand used; `subject` and `strand` in snake_case.
- **Verify each URL is reachable** with `WebFetch` before keeping it (a 2xx/3xx
  page that actually loads). Drop dead or redirected-to-junk links.
- If nothing is suitable, keep zero — an empty run is a valid outcome.

## Stage 3 — Assessor (curriculum + grades)

This is a **separate review pass** over the resources you just curated. For each:
- Assign 1–5 real Ontario curriculum expectation codes for the subject and
  grade(s), each of the form `<LETTER><DIGIT>.<DIGIT>` (e.g. `D1.1`, `B2.3`).
  Use only codes that genuinely exist for that subject/grade. If you cannot
  align a resource to at least one real code, **drop it** rather than invent one.
- Confirm `grade_level` is sensible (1–3 most likely grades); fix if Stage 2
  guessed wrong.
- Write the codes into `curriculum_expectations`. `curriculum_expectations`
  must never be empty on a kept resource.

## Stage 4 — Stamp, append, write

For each kept resource, in order:
1. Set `id` to the next `r-<N>` (incrementing from the baseline max).
2. Set `metadata`:
   ```json
   { "added_at": "<UTC date YYYY-MM-DD>", "added_by": "maple_key_team", "verified": false, "needs_review": true }
   ```
3. Ensure defaults are present: `curriculum_expectations` (non-empty),
   `accessibility` (`["No Concerns"]`), `alignments`, `instructional_modes`
   (`[]`), `usage_notes` (`null`).

Then append to `resources`, and update `meta`:
- `meta.total_count` = new length of `resources`
- `meta.generated_at` = current UTC timestamp `YYYY-MM-DDTHH:MM:SSZ`

Write `public/resources.json`, then mirror to `docs/resources.json` if it exists.

## Stage 5 — Land the change

- If **zero** resources were added, make no commit — report that none were found.
- Otherwise commit to a `claude/` branch with a message like
  `data: add nightly <Subject> resources` and open a **draft PR** for review
  (the rows carry `needs_review: true`, so a human confirms them before merge).

## Guardrails

- Never touch other subjects' rows; only append.
- Preserve existing file formatting and field shapes — this JSON is consumed by
  the live app via SWR and by the PDF export path.
- Do not run the API-billed Python scripts. The whole point is to stay on the
  subscription.
