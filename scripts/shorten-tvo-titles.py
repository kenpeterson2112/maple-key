#!/usr/bin/env python3
"""Shorten redundant TVO Learn resource titles in resources.json.

The resource card already renders "Gr N · Subject · Strand · Publisher" directly
under the title, so the grade / subject / strand / "Learning Activity N"
scaffolding baked into TVO `topic_title`s just repeats what the card already
shows. This rewrites those titles down to the unique activity subtitle only,
e.g.:

    TVO Learn — Grade 4 Science and Technology (Global Focus)
        Learning Activity 1: Save the Salmon
      -> Save the Salmon

Discoverability is unaffected: keyword search also matches url + description, and
every TVO url contains "tvolearn.com".

Data-only change. Rewrites `topic_title` on TVO entries in BOTH public/ and docs/
resources.json (kept byte-identical). No other field is touched. The generator
scripts (add-tvo-*.py) are intentionally left as-is.

Usage:
    python3 scripts/shorten-tvo-titles.py            # report only (no writes)
    python3 scripts/shorten-tvo-titles.py --apply    # rewrite both JSON files
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FILES = [ROOT / "public" / "resources.json", ROOT / "docs" / "resources.json"]

# Entries whose reduced title can't be derived cleanly by the rule cascade
# (numbered roll-ups with no subtitle, non-"TVO Learn" oddballs, course-code
# entries). Curated by hand, keyed by resource id -> new topic_title.
OVERRIDES: dict[str, str] = {
    # Numbered activities with no ": subtitle" — keep the specific topic + number
    # (the topic is often more specific than the strand shown on the card).
    "r-1177": "Data — Activity 3",
    "r-1178": "Data — Activity 8",
    "r-1242": "Data — Activity 1",
    "r-1396": "Data — Activity 4",
    "r-1397": "Data — Activity 6",
    "r-1447": "Financial Literacy — Activity 2",
    "r-1448": "Financial Literacy — Activity 4",
    "r-1449": "Financial Literacy — Activity 5",
    "r-1450": "Financial Literacy — Activity 8",
    "r-1451": "Financial Literacy — Activity 11",
    "r-1784": "Algebra — Activity 1",
    "r-1785": "Algebra — Activity 4",
    "r-1786": "Algebra — Activity 6",
    "r-1787": "Algebra — Activity 7",
    "r-2058": "Number — Activity 7",
    "r-2027": "Global Settlement — Activity 1",
    "r-2239": "Natural Resources — Activity 1",
    "r-2240": "Natural Resources — Activity 2",
    "r-2241": "Natural Resources — Activity 3",
    "r-2242": "Natural Resources — Activity 4",
    "r-2243": "Natural Resources — Activity 6",
    "r-2244": "Natural Resources — Activity 8",
    "r-2287": "Creating Canada — Activity 1",
    # Roll-up / landing pages (a set of activities, no single subtitle)
    "r-1011": "Algebra — Activities",
    "r-1095": "Financial Literacy — Activities",
    "r-1096": "Financial Literacy — Activities",
    "r-1884": "Science & Technology Hub",
    "r-2001": "Science & Technology Hub",
    "r-1932": "History & Geography Hub",
    "r-2026": "History & Geography Hub",
    "r-1483": "Financial Literacy — Activity 3",
    "r-1871": "Algebra — Activity 2",
    "r-2262": "Global Inequalities — Activity 1",
    "r-2263": "Global Inequalities — Activity 2",
    "r-2264": "Global Inequalities — Activity 5",
    "r-2265": "Global Inequalities — Activity 6",
    "r-2266": "Global Inequalities — Activity 7",
    "r-2267": "Global Inequalities — Activity 8",
    # Oddballs
    "r-1097": "Math & Financial Literacy Webinars",
    "r-1134": "Coding in the Classroom",
    "r-1529": "Coding Transformations",
    "r-2224": "SNC1W Science",
    "r-1934": "Geography & History Curated List",
}

ACTIVITY_COLON = re.compile(r"Learning Activit(?:y|ies)\s*\d*\s*:\s*(.+)$", re.I)
TRAILING_ACTIVITY_SET = re.compile(r"\s*Learning Activit(?:y|ies)\s*$", re.I)


def shorten(res: dict) -> str | None:
    """Return the new title, or None if it needs an explicit override."""
    rid = res.get("id")
    if rid in OVERRIDES:
        return OVERRIDES[rid]

    title = res["topic_title"]

    # Rule A: "... Learning Activity N: {Subtitle}"  -> {Subtitle}
    m = ACTIVITY_COLON.search(title)
    if m:
        return m.group(1).strip()

    # Rule B: a colon that isn't the Activity form, e.g.
    # "... Mathematics: Spatial Sense Learning Activities" -> "Spatial Sense"
    if ":" in title:
        tail = title.rsplit(":", 1)[1].strip()
        tail = TRAILING_ACTIVITY_SET.sub("", tail).strip()
        if tail:
            return tail

    # Rule C: trailing parenthetical as the subtitle, e.g.
    # "... (Data & Probability)" -> "Data & Probability"
    pm = re.search(r"\(([^)]+)\)\s*$", title)
    if pm:
        inner = pm.group(1).strip()
        # Skip grade-range parentheticals like "(Grades 7–8)".
        if not re.match(r"(?i)grades?\b", inner):
            return inner

    # Fall through -> needs an override.
    return None


def main() -> int:
    apply = "--apply" in sys.argv

    data = json.loads(FILES[0].read_text(encoding="utf-8"))
    resources = data["resources"]
    tvo = [r for r in resources if "TVO" in (r.get("topic_title") or "")]

    changes: list[tuple[str, str, str]] = []  # (id, old, new)
    unresolved: list[dict] = []
    for r in tvo:
        new = shorten(r)
        if new is None:
            unresolved.append(r)
            continue
        old = r["topic_title"]
        if new != old:
            changes.append((r["id"], old, new))

    print(f"TVO entries: {len(tvo)}  |  changed: {len(changes)}  |  "
          f"unresolved (need override): {len(unresolved)}\n")

    print("== BEFORE -> AFTER ==")
    for rid, old, new in changes:
        print(f"  [{rid}] {old}\n      -> {new}")

    if unresolved:
        print("\n== UNRESOLVED (add to OVERRIDES) ==")
        for r in unresolved:
            print(f"  [{r['id']}] {r['topic_title']}  || strand={r.get('strand')} "
                  f"grade={r.get('grade_level')} subject={r.get('subject')}")

    # Collision report over the resulting TVO titles.
    from collections import Counter
    final = {}
    for r in tvo:
        new = shorten(r)
        final[r["id"]] = new if new is not None else r["topic_title"]
    dupes = {t: c for t, c in Counter(final.values()).items() if c > 1}
    if dupes:
        print("\n== COLLISIONS (identical resulting titles) ==")
        for t, c in dupes.items():
            print(f"  x{c}: {t!r}")

    if unresolved:
        print("\nABORT: unresolved titles present; add them to OVERRIDES before --apply.")
        return 1

    if not apply:
        print("\n(report only — pass --apply to write)")
        return 0

    # Apply to both files identically.
    new_by_id = {rid: new for rid, old, new in changes}
    for path in FILES:
        d = json.loads(path.read_text(encoding="utf-8"))
        n = 0
        for r in d["resources"]:
            if r.get("id") in new_by_id:
                r["topic_title"] = new_by_id[r["id"]]
                n += 1
        path.write_text(
            json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"wrote {path.relative_to(ROOT)} ({n} titles updated)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
