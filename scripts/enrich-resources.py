#!/usr/bin/env python3
"""
enrich-resources.py — deterministic plumbing for the resource-enrichment routine.

Why this exists
---------------
`usage_notes` is supposed to tell the lesson-planning prompt how to deploy a
resource. Today it carries no resource-specific signal at all: 1,743 records share
**23 distinct strings**, templated off `resource_type` (every `video` gets one of
four canned sentences). `instructional_modes` is the same story — 1,644
`individual` / 1,403 `whole-class` from the same rule-based generator.

Neither field is cosmetic. `api/generate-lesson.ts` injects them into the prompt as
"Deployment note" and "Best used as", and instructs the model to structure the
lesson around them. So 23 canned strings are steering every generated lesson.

This script does the parts that don't need an LLM, so they cost nothing against the
subscription and can't be got subtly wrong in prose:

    select  — pick the next bounded batch of un-enriched records, emit a plan
    apply   — validate the model's output and merge it, stamping enriched_at

**You** (via the `enrich-resources` skill) do the part that needs judgement:
reading each resource's actual page and writing notes grounded in it.

Usage
-----
    python3 scripts/enrich-resources.py select --out /tmp/en-plan.json \
        --subject Science --grade-band junior --limit 85     # the pilot
    python3 scripts/enrich-resources.py select --out /tmp/en-plan.json --limit 120
    python3 scripts/enrich-resources.py apply --plan /tmp/en-plan.json \
        --results /tmp/en-results.json

Stdlib only. No network, no API key.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# public/ is authoritative; docs/ is the Pages mirror, written only if present.
OUTPUTS = [
    REPO_ROOT / "public" / "resources.json",
    REPO_ROOT / "docs" / "resources.json",
]

# Closed enum — matches PedagogicalFunction in src/lib/types.ts. Extend in both
# places together; never let a free-form value in.
PEDAGOGICAL_FUNCTIONS = {
    "hook",
    "core_teaching",
    "guided_practice",
    "independent_practice",
    "assessment",
    "extension",
}

# Matches the instructional_modes union in src/lib/types.ts.
INSTRUCTIONAL_MODES = {"whole-class", "small-group", "individual", "station-rotation"}

# Link verdicts the enrichment fetch can produce. `dead`/`moved` route the record
# to human review; nothing is ever auto-suppressed on a link check.
LINK_VERDICTS = {"live", "dead", "moved", "blocked", "error"}
REVIEW_WORTHY_VERDICTS = {"dead", "moved"}

USAGE_NOTES_MIN = 40
USAGE_NOTES_MAX = 600
MINUTES_MIN, MINUTES_MAX = 1, 600

# If a batch comes back with this share of its notes duplicated, the model
# templated instead of reading the pages — which is the exact failure we are
# replacing. Refuse the batch rather than swap one template for another.
MAX_DUPLICATE_SHARE = 0.15


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def is_enriched(resource: dict) -> bool:
    return bool((resource.get("metadata") or {}).get("enriched_at"))


# ── select ──────────────────────────────────────────────────────────────────

def cmd_select(args: argparse.Namespace) -> int:
    data = load_json(OUTPUTS[0])
    resources = data.get("resources", [])

    candidates = [r for r in resources if not is_enriched(r)]
    if args.subject:
        candidates = [r for r in candidates if (r.get("subject") or "").lower() == args.subject.lower()]
    if args.grade_band:
        candidates = [r for r in candidates if r.get("grade_band") == args.grade_band]
    if not args.include_hidden:
        # Collection hubs and suppressed records aren't served to teachers, so
        # enriching them spends the budget where it can't reach a lesson.
        candidates = [r for r in candidates if not r.get("is_collection") and not r.get("suppressed")]

    # Stable order so a rerun after a crash resumes rather than reshuffles.
    candidates.sort(key=lambda r: r.get("id", ""))
    batch = candidates[: args.limit]

    total = len(resources)
    enriched = sum(1 for r in resources if is_enriched(r))
    print(f"[select] {total} records | {enriched} enriched | {total - enriched} remaining")
    if args.subject or args.grade_band:
        scope = " ".join(filter(None, [args.grade_band or "", args.subject or ""]))
        print(f"[select] scope: {scope.strip()} -> {len(candidates)} un-enriched in scope")
    print(f"[select] this batch: {len(batch)}")

    plan = {
        "generated_at": now_iso(),
        "scope": {"subject": args.subject or None, "grade_band": args.grade_band or None},
        "remaining_after_batch": max(0, len(candidates) - len(batch)),
        "batch": [
            {
                "id": r.get("id"),
                "url": r.get("url"),
                "topic_title": r.get("topic_title"),
                "description": r.get("description"),
                "subject": r.get("subject"),
                "grade_level": r.get("grade_level"),
                "resource_type": r.get("resource_type"),
                "curriculum_expectations": r.get("curriculum_expectations"),
                # Included so the model can see how generic the current value is;
                # it must NOT copy or paraphrase it.
                "current_usage_notes": r.get("usage_notes"),
            }
            for r in batch
        ],
    }
    out = Path(args.out)
    write_json(out, plan)
    print(f"[select] wrote plan -> {out}")
    if not batch:
        print("[select] NOTHING_TO_ENRICH")
    return 0


# ── apply ───────────────────────────────────────────────────────────────────

def validate_result(item: dict, known_ids: set[str]) -> tuple[dict | None, str | None]:
    """Return (clean_record, error). Anything malformed is rejected, not coerced."""
    rid = item.get("id")
    if rid not in known_ids:
        return None, f"unknown id: {rid!r}"

    notes = (item.get("usage_notes") or "").strip()
    if not (USAGE_NOTES_MIN <= len(notes) <= USAGE_NOTES_MAX):
        return None, f"{rid}: usage_notes must be {USAGE_NOTES_MIN}-{USAGE_NOTES_MAX} chars (got {len(notes)})"

    func = item.get("pedagogical_function")
    if func not in PEDAGOGICAL_FUNCTIONS:
        return None, f"{rid}: pedagogical_function {func!r} not in the closed enum"

    minutes = item.get("estimated_minutes")
    if not isinstance(minutes, int) or isinstance(minutes, bool) or not (MINUTES_MIN <= minutes <= MINUTES_MAX):
        return None, f"{rid}: estimated_minutes must be an int {MINUTES_MIN}-{MINUTES_MAX} (got {minutes!r})"

    modes = item.get("instructional_modes")
    if not isinstance(modes, list) or not modes or not set(modes) <= INSTRUCTIONAL_MODES:
        return None, f"{rid}: instructional_modes must be a non-empty subset of {sorted(INSTRUCTIONAL_MODES)}"

    verdict = item.get("link_status")
    if verdict is not None and verdict not in LINK_VERDICTS:
        return None, f"{rid}: link_status {verdict!r} not in {sorted(LINK_VERDICTS)}"

    return {
        "id": rid,
        "usage_notes": notes,
        "pedagogical_function": func,
        "estimated_minutes": minutes,
        "instructional_modes": sorted(set(modes)),
        "link_status": verdict,
    }, None


def cmd_apply(args: argparse.Namespace) -> int:
    plan = load_json(Path(args.plan))
    results_path = Path(args.results)
    if not results_path.exists():
        sys.exit(f"ERROR: no results at {results_path}")
    results = json.loads(results_path.read_text(encoding="utf-8"))
    if not isinstance(results, list):
        sys.exit("ERROR: results file must be a JSON array")

    batch_ids = {item["id"] for item in plan.get("batch", [])}
    data = load_json(OUTPUTS[0])
    resources = data.get("resources", [])
    by_id = {r.get("id"): r for r in resources}

    clean: list[dict] = []
    errors: list[str] = []
    for item in results:
        record, err = validate_result(item, set(by_id))
        if err:
            errors.append(err)
            continue
        if record["id"] not in batch_ids:
            errors.append(f"{record['id']}: not in this plan's batch")
            continue
        clean.append(record)

    # The anti-template guard: resource-specific notes should be nearly all
    # unique. A pile of identical notes means the pages were not actually read.
    notes_counts = Counter(r["usage_notes"] for r in clean)
    duplicated = sum(n for note, n in notes_counts.items() if n > 1)
    dup_share = duplicated / len(clean) if clean else 0.0

    print("=" * 72)
    print(f"ENRICHMENT APPLY — {now_iso()}")
    print("=" * 72)
    print(f"results received : {len(results)}")
    print(f"valid            : {len(clean)}")
    print(f"rejected         : {len(errors)}")
    print(f"distinct notes   : {len(notes_counts)} across {len(clean)} records "
          f"({dup_share:.0%} duplicated)")
    if errors:
        print("\nRejected:")
        for e in errors[:25]:
            print(f"  - {e}")
        if len(errors) > 25:
            print(f"  … and {len(errors) - 25} more")

    if not clean:
        print("\nNothing valid to apply.")
        return 1

    if dup_share > MAX_DUPLICATE_SHARE:
        print(f"\nREFUSED: {dup_share:.0%} of usage_notes are duplicates, over the "
              f"{MAX_DUPLICATE_SHARE:.0%} ceiling.")
        print("Resource-specific notes should be near-unique. This looks like the")
        print("templating this job exists to remove — rerun the batch, reading each page.")
        for note, n in notes_counts.most_common(3):
            if n > 1:
                print(f"  {n}x  {note[:90]}")
        return 1

    stamp = now_iso()
    flagged = 0
    for record in clean:
        resource = by_id[record["id"]]
        resource["usage_notes"] = record["usage_notes"]
        resource["pedagogical_function"] = record["pedagogical_function"]
        resource["estimated_minutes"] = record["estimated_minutes"]
        resource["instructional_modes"] = record["instructional_modes"]

        metadata = resource.setdefault("metadata", {})
        metadata["enriched_at"] = stamp
        verdict = record["link_status"]
        if verdict:
            metadata["link_status"] = verdict
            metadata["link_checked_at"] = stamp
            # Route to a human; never auto-suppress on a link verdict.
            if verdict in REVIEW_WORTHY_VERDICTS:
                metadata["needs_review"] = True
                flagged += 1

    data["meta"] = {**data.get("meta", {}), "generated_at": stamp, "total_count": len(resources)}

    for path in OUTPUTS:
        if path.exists() or path == OUTPUTS[0]:
            write_json(path, data)
            print(f"\nwrote {path.relative_to(REPO_ROOT)}")

    still = sum(1 for r in resources if not is_enriched(r))
    print(f"\napplied {len(clean)} record(s); {flagged} flagged needs_review from a link verdict")
    print(f"{still} records remain un-enriched")
    print("\nSample of what landed:")
    for record in clean[:3]:
        print(f"  {record['id']} [{record['pedagogical_function']}, {record['estimated_minutes']}m]")
        print(f"    {record['usage_notes'][:150]}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Resource enrichment plumbing (select + apply).")
    sub = parser.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("select", help="pick the next bounded batch of un-enriched records")
    s.add_argument("--out", required=True, help="where to write the plan JSON")
    s.add_argument("--limit", type=int, default=120, help="max records in this batch (default 120)")
    s.add_argument("--subject", default="", help="restrict to one subject (e.g. Science)")
    s.add_argument("--grade-band", default="", dest="grade_band",
                   help="restrict to one grade_band (e.g. junior)")
    s.add_argument("--include-hidden", action="store_true",
                   help="also enrich collection hubs and suppressed records")
    s.set_defaults(func=cmd_select)

    a = sub.add_parser("apply", help="validate and merge the model's enrichment output")
    a.add_argument("--plan", required=True)
    a.add_argument("--results", required=True)
    a.set_defaults(func=cmd_apply)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
