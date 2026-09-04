#!/usr/bin/env python3
"""
validate-resources.py
Validates public/resources.json against schema/resource-schema.json.

Checks the field contract (required present, nothing undeclared), the closed
vocabularies, and the cross-field invariants the schema declares. Run in CI so a
bad ingest fails the build rather than landing in the dataset.

    python3 scripts/validate-resources.py [path ...]

Exits non-zero and prints one line per problem if anything fails.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _schema  # noqa: E402

REPO_ROOT = Path(__file__).parent.parent
DEFAULT_TARGETS = [
    REPO_ROOT / "public" / "resources.json",
    REPO_ROOT / "docs" / "resources.json",
]

KNOWN_FIELDS = set(_schema.ALL_FIELDS)
KNOWN_METADATA_FIELDS = set(_schema.ALL_METADATA_FIELDS)


def validate_resource(resource: dict, index: int) -> list:
    """Return a list of human-readable problems with one record."""
    problems = []
    rid = resource.get("id", f"<index {index}>")

    for field in _schema.REQUIRED_FIELDS:
        if field not in resource:
            problems.append(f"{rid}: missing required field '{field}'")

    for field in resource:
        if field not in KNOWN_FIELDS:
            problems.append(f"{rid}: undeclared field '{field}'")

    # Flags are written only when true and omitted otherwise, so a literal
    # false means some writer stopped following the convention.
    for flag in _schema.FLAG_FIELDS:
        if flag in resource and resource[flag] is not True:
            problems.append(f"{rid}: flag '{flag}' must be true or absent, got {resource[flag]!r}")

    for field, value in resource.items():
        if field == "usage_notes" and value is None:
            continue
        bad = _schema.out_of_vocabulary(field, value)
        for v in bad:
            problems.append(f"{rid}: {field} value not in vocabulary: {v!r}")

    for grade in resource.get("grade_level", []):
        if not _schema.is_valid_grade_level(grade):
            problems.append(f"{rid}: invalid grade_level {grade!r}")

    # ── Invariants ──────────────────────────────────────────────────────────
    if "is_paid" in resource and "access_type" in resource:
        expected = resource["access_type"] == "purchase"
        if resource["is_paid"] is not expected:
            problems.append(
                f"{rid}: is_paid={resource['is_paid']!r} disagrees with "
                f"access_type={resource['access_type']!r}"
            )

    province = resource.get("province")
    if province in _schema.JURISDICTION_BY_PROVINCE:
        expected = _schema.JURISDICTION_BY_PROVINCE[province]
        if resource.get("jurisdiction") != expected:
            problems.append(
                f"{rid}: jurisdiction={resource.get('jurisdiction')!r} does not match "
                f"province={province!r} (expected {expected!r})"
            )

    # ── metadata ────────────────────────────────────────────────────────────
    metadata = resource.get("metadata")
    if not isinstance(metadata, dict):
        problems.append(f"{rid}: metadata must be an object")
        return problems

    for field in _schema.REQUIRED_METADATA_FIELDS:
        if field not in metadata:
            problems.append(f"{rid}: metadata missing required field '{field}'")
    for field in metadata:
        if field not in KNOWN_METADATA_FIELDS:
            problems.append(f"{rid}: metadata undeclared field '{field}'")

    link_status = metadata.get("link_status")
    if link_status is not None and link_status not in _schema.LINK_STATUSES:
        problems.append(f"{rid}: metadata.link_status not in vocabulary: {link_status!r}")

    priority = metadata.get("review_priority")
    if priority is not None and (not isinstance(priority, int) or isinstance(priority, bool) or priority < 0):
        problems.append(f"{rid}: metadata.review_priority must be a non-negative integer, got {priority!r}")

    return problems


def validate_file(path: Path) -> list:
    problems = []
    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)

    if not isinstance(data, dict) or "resources" not in data:
        return [f"{path}: expected an object with a 'resources' key"]

    meta = data.get("meta", {})
    if meta.get("schema_version") != _schema.SCHEMA_VERSION:
        problems.append(
            f"{path}: meta.schema_version is {meta.get('schema_version')!r}, "
            f"expected {_schema.SCHEMA_VERSION!r}"
        )

    resources = data["resources"]
    if meta.get("total_count") != len(resources):
        problems.append(
            f"{path}: meta.total_count is {meta.get('total_count')!r} but there are "
            f"{len(resources)} resources"
        )

    seen = {}
    for i, resource in enumerate(resources):
        problems.extend(validate_resource(resource, i))
        rid = resource.get("id")
        if rid in seen:
            problems.append(f"{rid}: duplicate id (also at index {seen[rid]})")
        seen[rid] = i

    return problems


def main() -> int:
    targets = [Path(a) for a in sys.argv[1:]] or DEFAULT_TARGETS
    total = 0
    for path in targets:
        if not path.exists():
            print(f"SKIP {path} (not found)")
            continue
        problems = validate_file(path)
        total += len(problems)
        if problems:
            print(f"FAIL {path} — {len(problems)} problem(s):")
            for p in problems[:50]:
                print(f"  {p}")
            if len(problems) > 50:
                print(f"  … and {len(problems) - 50} more")
        else:
            print(f"OK   {path}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
