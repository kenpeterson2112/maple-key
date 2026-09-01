#!/usr/bin/env python3
"""
check-schema-sync.py
Proves shared/resource-schema.ts has not drifted from schema/resource-schema.json.

The JSON is the source of truth for every vocabulary, but a JSON import widens to
string[] in TypeScript — the literal unions and the admin allowlists in
shared/resource-schema.ts therefore have to be written out by hand. This script
is what keeps that hand-written half honest, so adding a value to the JSON
without adding it to the union fails CI instead of silently mis-typing the app.

    python3 scripts/check-schema-sync.py

Exits non-zero on any mismatch, or if a union it expects to find is missing (a
rename should fail loudly rather than pass by matching nothing).
"""

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _schema  # noqa: E402

REPO_ROOT = Path(__file__).parent.parent
TS_PATH = REPO_ROOT / "shared" / "resource-schema.ts"

# JSON vocabulary name -> exported TypeScript union type name.
UNION_BY_VOCABULARY = {
    "grade_band": "GradeBand",
    "subject": "Subject",
    "modality": "Modality",
    "resource_type": "ResourceType",
    "access_type": "AccessType",
    "accessibility": "AccessibilityRating",
    "instructional_modes": "InstructionalMode",
    "pedagogical_function": "PedagogicalFunction",
    "link_status": "LinkStatus",
}

# JSON admin allowlist -> exported TypeScript const tuple name.
TUPLE_BY_ALLOWLIST = {
    "editable_keys": "ADMIN_EDITABLE_KEYS",
    "editable_metadata_keys": "ADMIN_EDITABLE_METADATA_KEYS",
}


def extract_union(source: str, name: str) -> list:
    """Pull the string literals out of `export type <name> = | "a" | "b"`."""
    match = re.search(
        rf'export type {re.escape(name)}\s*=\s*(.*?)(?=\n\n|\nexport |\n// )',
        source,
        re.DOTALL,
    )
    if not match:
        raise LookupError(f'no `export type {name}` found in {TS_PATH.name}')
    return re.findall(r'"([^"]*)"', match.group(1))


def extract_tuple(source: str, name: str) -> list:
    """Pull the string literals out of `export const <name> = [...] as const`."""
    match = re.search(
        rf'export const {re.escape(name)}\s*=\s*\[(.*?)\]\s*as const',
        source,
        re.DOTALL,
    )
    if not match:
        raise LookupError(f'no `export const {name} = [...] as const` found in {TS_PATH.name}')
    return re.findall(r'"([^"]*)"', match.group(1))


def compare(label: str, from_json: list, from_ts: list) -> list:
    missing = [v for v in from_json if v not in from_ts]
    extra = [v for v in from_ts if v not in from_json]
    problems = []
    if missing:
        problems.append(f"{label}: in JSON but not in TypeScript: {missing}")
    if extra:
        problems.append(f"{label}: in TypeScript but not in JSON: {extra}")
    return problems


def main() -> int:
    source = TS_PATH.read_text(encoding="utf-8")
    problems = []

    for vocabulary, union in UNION_BY_VOCABULARY.items():
        try:
            problems.extend(
                compare(vocabulary, _schema.SCHEMA["vocabularies"][vocabulary], extract_union(source, union))
            )
        except LookupError as exc:
            problems.append(str(exc))

    for allowlist, tuple_name in TUPLE_BY_ALLOWLIST.items():
        try:
            problems.extend(
                compare(f"admin.{allowlist}", _schema.ADMIN[allowlist], extract_tuple(source, tuple_name))
            )
        except LookupError as exc:
            problems.append(str(exc))

    if problems:
        print("FAIL schema/resource-schema.json and shared/resource-schema.ts disagree:")
        for p in problems:
            print(f"  {p}")
        return 1

    checked = len(UNION_BY_VOCABULARY) + len(TUPLE_BY_ALLOWLIST)
    print(f"OK   shared/resource-schema.ts matches schema/resource-schema.json ({checked} lists)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
