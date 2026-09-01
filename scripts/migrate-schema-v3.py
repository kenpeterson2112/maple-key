#!/usr/bin/env python3
"""
migrate-schema-v3.py
One-time migration of resources.json from schema 2.1 to 3.0.

What it does:
  - Drops `alignments` from every record. The field was on all 1743 records
    (1973 elements) but read by nothing: the app filters on the flat
    `curriculum_expectations` mirror instead. 83% of its expectation codes and
    99% of its descriptions were null, and 25 of its `grade` values were
    strings holding array literals ("[6, 7, 8, 9]") against a declared
    number|"K"|"PreK"|null. Removing it cuts the file teachers download by ~40%.
  - Stamps meta.schema_version / total_count / generated_at.

Idempotent: running it twice is a no-op beyond the generated_at timestamp.
Writes both public/ and docs/ so the mirrors stay byte-identical, the same
OUTPUTS convention scripts/normalize-resources.py uses.

    python3 scripts/migrate-schema-v3.py [--dry-run]
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _schema  # noqa: E402

REPO_ROOT = Path(__file__).parent.parent
INPUT = REPO_ROOT / "public" / "resources.json"
OUTPUTS = [
    REPO_ROOT / "public" / "resources.json",
    REPO_ROOT / "docs" / "resources.json",
]

DROPPED_FIELDS = ["alignments"]


def migrate(data: dict) -> tuple:
    resources = data["resources"]
    dropped = {field: 0 for field in DROPPED_FIELDS}

    for resource in resources:
        for field in DROPPED_FIELDS:
            if field in resource:
                del resource[field]
                dropped[field] += 1

    data["meta"] = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "total_count": len(resources),
        "schema_version": _schema.SCHEMA_VERSION,
    }
    return data, dropped


def main() -> int:
    dry_run = "--dry-run" in sys.argv

    with INPUT.open(encoding="utf-8") as fh:
        data = json.load(fh)

    before = data.get("meta", {}).get("schema_version")
    data, dropped = migrate(data)

    print(f"schema_version: {before} -> {data['meta']['schema_version']}")
    print(f"resources: {data['meta']['total_count']}")
    for field, count in dropped.items():
        print(f"dropped '{field}' from {count} record(s)")

    if dry_run:
        print("(dry run — nothing written)")
        return 0

    payload = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    for path in OUTPUTS:
        path.write_text(payload, encoding="utf-8")
        print(f"wrote {path} ({len(payload):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
