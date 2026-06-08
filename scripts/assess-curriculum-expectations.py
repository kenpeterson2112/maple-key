#!/usr/bin/env python3
"""
assess-curriculum-expectations.py

The Assessor stage of the resource curation waterfall. Uses Claude to assign
Ontario curriculum expectation codes (e.g. "D1.1", "B2.3") — and, when missing,
grade levels — to resources in public/resources.json.

Idempotent: resources with non-empty curriculum_expectations are skipped unless
--force is passed. Resources with non-empty grade_level keep their existing
grades; the model only fills empty grade_level arrays.

Usage:
    python scripts/assess-curriculum-expectations.py [--dry-run] [--batch-size N] [--limit N] [--filter-subject SUBJ]

Requires:
    ANTHROPIC_API_KEY
    pip install anthropic
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

import anthropic

REPO_ROOT = Path(__file__).parent.parent
OUTPUTS = [
    REPO_ROOT / "public" / "resources.json",
    REPO_ROOT / "docs" / "resources.json",
]

CODE_RE = re.compile(r"^[A-Z]\d+\.\d+$")

SYSTEM_PROMPT = (
    "You are an Ontario K-12 curriculum specialist. Given a list of educational "
    "resources, you assign each one the Ontario curriculum overall/specific "
    "expectation codes it covers (e.g. 'D1.1', 'B2.3') and, when missing, the "
    "grade level(s) it targets. "
    "Codes follow the form <LETTER><DIGIT>.<DIGIT>. Use only codes that actually "
    "exist in the Ontario curriculum for the subject and grade. Return strict "
    "JSON only — no prose, no markdown fences."
)

USER_PROMPT_TEMPLATE = """\
For each of the {count} resources below, return one JSON object with:
  - "id": the resource id, exactly as given
  - "curriculum_expectations": array of 1-5 Ontario curriculum codes \
(<LETTER><DIGIT>.<DIGIT>) that the resource covers, drawn from the subject's curriculum at the listed/inferred grade level
  - "grade_level": array of integers (1-12) or "K"/"PreK". If the input \
already lists grade levels, return them unchanged. If empty, infer the most \
likely 1-3 grades from the title, description, and strand.

Return ONLY a JSON array of {count} such objects, in the same order as the input.

Resources:
{items}"""


def build_item_text(r: dict, idx: int) -> str:
    grades = r.get("grade_level") or []
    grades_display = json.dumps(grades) if grades else "[] (infer from content)"
    strand = r.get("strand") or []
    strand_display = ", ".join(strand) if strand else "unspecified"
    return (
        f'{idx + 1}. id={r["id"]}\n'
        f'   Title: {r.get("topic_title", "")}\n'
        f'   Subject: {r.get("subject", "unknown")} | Strand: {strand_display}\n'
        f'   Grade level: {grades_display} | Band: {r.get("grade_band", "unknown")}\n'
        f'   Description: {r.get("description", "")}'
    )


def parse_response(raw: str, batch_size: int) -> list[dict] | None:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  [warn] JSON decode error: {e}")
        return None
    if not isinstance(parsed, list) or len(parsed) != batch_size:
        print(f"  [warn] Expected list of {batch_size}, got {type(parsed).__name__} of {len(parsed) if hasattr(parsed, '__len__') else '?'}")
        return None
    return parsed


def sanitize_codes(raw_codes) -> list[str]:
    if not isinstance(raw_codes, list):
        return []
    cleaned = []
    seen = set()
    for c in raw_codes:
        if not isinstance(c, str):
            continue
        c = c.strip().upper()
        if CODE_RE.match(c) and c not in seen:
            seen.add(c)
            cleaned.append(c)
    return cleaned


def sanitize_grades(raw_grades) -> list:
    if not isinstance(raw_grades, list):
        return []
    out = []
    seen = set()
    for g in raw_grades:
        if isinstance(g, bool):
            continue
        if isinstance(g, int) and 1 <= g <= 12:
            key = ("int", g)
        elif isinstance(g, str) and g.upper() in ("K", "PREK"):
            g = "K" if g.upper() == "K" else "PreK"
            key = ("str", g)
        elif isinstance(g, str) and g.strip().isdigit():
            n = int(g.strip())
            if 1 <= n <= 12:
                g = n
                key = ("int", n)
            else:
                continue
        else:
            continue
        if key not in seen:
            seen.add(key)
            out.append(g)
    return out


def assess_batch(client: anthropic.Anthropic, batch: list[dict]) -> list[dict] | None:
    items_text = "\n\n".join(build_item_text(r, i) for i, r in enumerate(batch))
    user_msg = USER_PROMPT_TEMPLATE.format(count=len(batch), items=items_text)

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=len(batch) * 200,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = response.content[0].text
        return parse_response(raw, len(batch))
    except anthropic.APIError as e:
        print(f"  [error] API error: {e}")
        return None


def run(args: argparse.Namespace) -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ERROR: ANTHROPIC_API_KEY environment variable not set")

    client = anthropic.Anthropic(api_key=api_key)

    source = OUTPUTS[0]
    print(f"Reading {source} …")
    data = json.loads(source.read_text(encoding="utf-8"))
    resources = data["resources"]
    resource_index = {r["id"]: r for r in resources}

    candidates = [
        r for r in resources
        if (args.force or not r.get("curriculum_expectations") or not r.get("grade_level"))
        and (args.filter_subject is None or r.get("subject") == args.filter_subject)
    ]
    if args.limit:
        candidates = candidates[: args.limit]

    print(f"  {len(resources)} total resources")
    print(f"  {len(candidates)} need assessment" + (f" (filtered to subject={args.filter_subject})" if args.filter_subject else ""))

    if not candidates:
        print("Nothing to do.")
        return

    batch_size = args.batch_size
    updated_codes = 0
    updated_grades = 0
    failed = 0

    for batch_start in range(0, len(candidates), batch_size):
        batch = candidates[batch_start: batch_start + batch_size]
        print(f"  Batch {batch_start // batch_size + 1}: {len(batch)} resources ({batch[0]['id']} … {batch[-1]['id']})")

        results = assess_batch(client, batch)
        if results is None:
            failed += len(batch)
            print("  Batch failed, skipping.")
            continue

        # Match results to input by id (preferred) then by index as fallback
        results_by_id = {r.get("id"): r for r in results if isinstance(r, dict) and r.get("id")}
        for i, input_resource in enumerate(batch):
            result = results_by_id.get(input_resource["id"]) or (results[i] if isinstance(results[i], dict) else None)
            if not result:
                failed += 1
                continue

            codes = sanitize_codes(result.get("curriculum_expectations"))
            grades = sanitize_grades(result.get("grade_level"))

            target = resource_index[input_resource["id"]]
            if codes and (args.force or not target.get("curriculum_expectations")):
                if args.dry_run:
                    print(f"  [{target['id']}] codes: {codes}")
                else:
                    target["curriculum_expectations"] = codes
                updated_codes += 1
            if grades and not target.get("grade_level"):
                if args.dry_run:
                    print(f"  [{target['id']}] grades: {grades}")
                else:
                    target["grade_level"] = grades
                updated_grades += 1

        if args.dry_run and batch_start == 0:
            print("(dry run — stopping after first batch)")
            break

        time.sleep(0.5)

    if args.dry_run:
        print(f"\nDry run complete. Would update codes for {updated_codes}, grades for {updated_grades}.")
        return

    output_json = json.dumps(data, ensure_ascii=False, indent=2)
    for path in OUTPUTS:
        if path.exists() or path == OUTPUTS[0]:
            path.write_text(output_json, encoding="utf-8")
            print(f"  Written → {path}")

    print(f"\nDone. Codes updated: {updated_codes}, grades updated: {updated_grades}, failed: {failed}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Assign Ontario curriculum codes (and infer missing grades) via Claude")
    parser.add_argument("--dry-run", action="store_true", help="Print results without writing")
    parser.add_argument("--batch-size", type=int, default=10, metavar="N")
    parser.add_argument("--limit", type=int, default=None, metavar="N", help="Process at most N resources")
    parser.add_argument("--filter-subject", metavar="SUBJ", help="Only process this subject (e.g. 'Math', 'Science')")
    parser.add_argument("--force", action="store_true", help="Re-assess resources that already have codes")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
