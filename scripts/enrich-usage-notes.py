#!/usr/bin/env python3
"""
enrich-usage-notes.py
Populates the `usage_notes` field for resources in public/resources.json using Claude Haiku.

Usage:
    python scripts/enrich-usage-notes.py [--dry-run] [--batch-size N] [--filter-type TYPE]

Options:
    --dry-run           Print generated notes without writing to disk
    --batch-size N      Resources per API call (default: 20)
    --filter-type TYPE  Only enrich resources of a specific resource_type
                        (interactive, digital, print, video, physical)

The script is idempotent: resources with a non-empty usage_notes value are skipped.
Writes back to both public/resources.json and docs/resources.json.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import anthropic

REPO_ROOT = Path(__file__).parent.parent
OUTPUTS = [
    REPO_ROOT / "public" / "resources.json",
    REPO_ROOT / "docs" / "resources.json",
]

SYSTEM_PROMPT = (
    "You are a K-8 Ontario curriculum specialist. "
    "You write concise, practical usage notes for educational resources. "
    "Return only the usage note text — no labels, no quotes, no extra explanation."
)

USER_PROMPT_TEMPLATE = """\
For each of the {count} resources below, write a single usage note (1-2 plain sentences) \
describing how a teacher would most naturally deploy it in a K-8 Ontario classroom. \
Be specific about whether it works best projected whole-class, as an independent student \
activity, or in small-group/station rotation. Do NOT add markdown or numbering — \
return ONLY a JSON array of {count} strings in the same order as the input.

{items}"""


def build_item_text(r: dict, idx: int) -> str:
    modalities = ", ".join(r.get("modality") or []) or "unknown"
    return (
        f'{idx + 1}. "{r["topic_title"]}"\n'
        f'   Type: {r.get("resource_type", "unknown")} | Modality: {modalities}\n'
        f'   Description: {r.get("description", "")}'
    )


def enrich_batch(client: anthropic.Anthropic, batch: list[dict]) -> list[str] | None:
    items_text = "\n\n".join(build_item_text(r, i) for i, r in enumerate(batch))
    user_msg = USER_PROMPT_TEMPLATE.format(count=len(batch), items=items_text)

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=len(batch) * 120,
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_msg}],
        )
        raw = response.content[0].text.strip()
        # Strip accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        notes = json.loads(raw)
        if isinstance(notes, list) and len(notes) == len(batch):
            return [str(n).strip() for n in notes]
        print(f"  [warn] Expected {len(batch)} notes, got {len(notes) if isinstance(notes, list) else type(notes)}")
        return None
    except json.JSONDecodeError as e:
        print(f"  [warn] JSON decode error: {e}")
        return None
    except anthropic.APIError as e:
        print(f"  [error] API error: {e}")
        return None


def enrich_single(client: anthropic.Anthropic, resource: dict) -> str | None:
    result = enrich_batch(client, [resource])
    return result[0] if result else None


def run(args: argparse.Namespace) -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ERROR: ANTHROPIC_API_KEY environment variable not set")

    client = anthropic.Anthropic(api_key=api_key)

    source = OUTPUTS[0]
    print(f"Reading {source} …")
    data = json.loads(source.read_text(encoding="utf-8"))
    resources = data["resources"]

    candidates = [
        r for r in resources
        if not r.get("usage_notes")
        and (args.filter_type is None or r.get("resource_type") == args.filter_type)
    ]

    print(f"  {len(resources)} total resources")
    print(f"  {len(candidates)} need usage_notes" + (f" (filtered to type={args.filter_type})" if args.filter_type else ""))

    if not candidates:
        print("Nothing to do.")
        return

    if args.dry_run:
        print("\n[DRY RUN] Sample batch (first batch only):\n")

    batch_size = args.batch_size
    updated = 0
    failed = 0

    # Build an index so we can update resources in-place
    resource_index = {r["id"]: r for r in resources}

    for batch_start in range(0, len(candidates), batch_size):
        batch = candidates[batch_start: batch_start + batch_size]
        print(f"  Batch {batch_start // batch_size + 1}: {len(batch)} resources ({candidates[batch_start]['id']} … {batch[-1]['id']})")

        notes = enrich_batch(client, batch)

        if notes is None:
            print("  Batch failed, falling back to per-resource calls …")
            notes = []
            for r in batch:
                note = enrich_single(client, r)
                notes.append(note or "")
                if not note:
                    failed += 1
                time.sleep(0.1)

        for r, note in zip(batch, notes):
            if note:
                if args.dry_run:
                    print(f"  [{r['id']}] {r['topic_title']}")
                    print(f"    → {note}\n")
                else:
                    resource_index[r["id"]]["usage_notes"] = note
                updated += 1
            else:
                failed += 1

        if args.dry_run:
            print("(dry run — stopping after first batch)")
            break

        # Brief pause to avoid rate limits
        time.sleep(0.5)

    if args.dry_run:
        print(f"\nDry run complete. Would update {updated} resources.")
        return

    # Write back to both output files
    output_json = json.dumps(data, ensure_ascii=False, indent=2)
    for path in OUTPUTS:
        path.write_text(output_json, encoding="utf-8")
        print(f"  Written → {path}")

    print(f"\nDone. Updated: {updated}, Failed: {failed}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Enrich resource usage_notes via Claude")
    parser.add_argument("--dry-run", action="store_true", help="Print results without writing")
    parser.add_argument("--batch-size", type=int, default=20, metavar="N")
    parser.add_argument("--filter-type", metavar="TYPE", help="Only process this resource_type")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
