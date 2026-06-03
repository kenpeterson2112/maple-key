#!/usr/bin/env python3
"""
detect-collections.py
Heuristic-only detector for resource entries that look like collections / hubs
rather than single activities. Reads docs/resources.json and emits a CSV +
markdown report listing flagged entries with reasons and a confidence score.

No network calls, no LLM. The output is meant to be skimmed by hand so we can
calibrate the heuristics before building an atomizer.
"""

import csv
import json
import re
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).parent.parent
INPUT = REPO_ROOT / "docs" / "resources.json"
CSV_OUT = REPO_ROOT / "scripts" / "collection-candidates.csv"
MD_OUT = REPO_ROOT / "scripts" / "collection-candidates.md"

# ── Heuristic signals ─────────────────────────────────────────────────────────
#
# Each signal contributes a weight. Total is clamped and turned into a
# confidence bucket. Weights are intentionally rough — this is a first pass
# for human review, not a classifier.

TITLE_STRONG = [
    "collection", "collections",
    "unit", "units",
    "course", "courses",
    "curriculum",
    "library", "libraries",
    "playlist",
    "bundle",
    "series",
    "all activities", "all lessons", "all games", "all resources",
    "activity pack", "lesson pack", "resource pack",
    "category",
    "index",
    "hub",
    "directory",
    "catalog", "catalogue",
]

TITLE_WEAK = [
    "games",
    "activities",
    "lessons",
    "resources",
    "worksheets",
    "videos",
    "problems",
    "exercises",
    "practice",
    "tools",
    "modules",
]

# URL path tokens that suggest an index/listing page rather than a leaf.
URL_PATH_STRONG = [
    "/courses", "/course/",
    "/units", "/unit/",
    "/collection", "/collections",
    "/category", "/categories",
    "/topics",
    "/library",
    "/all-",
    "/browse",
    "/index",
    "/catalog",
]

URL_PATH_WEAK = [
    "/games", "/activities", "/lessons", "/resources",
    "/worksheets", "/videos", "/problems", "/exercises",
    "/practice", "/tools",
]

# Description phrases that hint the entry describes a set, not a thing.
DESC_PHRASES = [
    "collection of",
    "series of",
    "set of",
    "library of",
    "variety of",
    "wide range of",
    "includes activities",
    "includes lessons",
    "includes games",
    "covers multiple",
    "covers several",
    "covers a range",
    "multiple topics",
    "many topics",
    "various topics",
    "browse",
    "explore the",
    "explore our",
    "explore a",
    "categorized by",
    "organized by",
    "sorted by",
    "grouped by",
    "select from",
    "choose from",
    "filter by",
]

# Publishers that are notorious for hub-style entries (from user's spot-checks).
PUBLISHER_HINTS = [
    "brilliant",
    "betterlesson",
    "turtle diary",
    "khan academy",
    "ixl",
    "math playground",
    "splash learn",
    "splashlearn",
    "education.com",
    "teachers pay teachers",
    "tpt",
]


def lower(s):
    return (s or "").lower()


def signal_title(title: str):
    hits = []
    t = lower(title)
    for kw in TITLE_STRONG:
        if kw in t:
            hits.append(("title_strong", kw, 3))
    for kw in TITLE_WEAK:
        # whole-word-ish match so "lessons learned" still catches but
        # "lessonsomething" doesn't pull weight on random ids.
        if re.search(rf"\b{re.escape(kw)}\b", t):
            hits.append(("title_weak", kw, 1))
    return hits


def signal_url(url: str):
    hits = []
    if not url:
        return hits
    try:
        parsed = urlparse(url)
    except ValueError:
        return hits
    path = lower(parsed.path)
    # Very short paths ("/", "/games", "/courses") are strong index signals.
    depth = len([p for p in path.split("/") if p])
    if depth <= 1 and path not in ("", "/"):
        hits.append(("url_shallow", path, 2))
    elif depth == 0:
        hits.append(("url_root", "/", 3))
    for tok in URL_PATH_STRONG:
        if tok in path:
            hits.append(("url_strong", tok, 2))
    for tok in URL_PATH_WEAK:
        if tok in path:
            hits.append(("url_weak", tok, 1))
    # Trailing slash with no file extension also suggests a listing.
    if path.endswith("/") and "." not in path.rsplit("/", 2)[-2:][-1]:
        hits.append(("url_trailing_slash", "/", 1))
    return hits


def signal_description(desc: str):
    hits = []
    d = lower(desc)
    for phrase in DESC_PHRASES:
        if phrase in d:
            hits.append(("desc_phrase", phrase, 2))
    # Very short descriptions (<60 chars) on a resource often = vague hub.
    if desc and len(desc.strip()) < 60:
        hits.append(("desc_short", f"len={len(desc.strip())}", 1))
    return hits


def signal_publisher(pub: str):
    hits = []
    p = lower(pub)
    for hint in PUBLISHER_HINTS:
        if hint in p:
            hits.append(("publisher_hint", hint, 1))
    return hits


def signal_expectations(resource: dict):
    # A resource claiming to align to many curriculum expectations is more
    # likely a unit/collection than a single activity.
    exps = resource.get("curriculum_expectations") or []
    if len(exps) >= 6:
        return [("many_expectations", f"n={len(exps)}", 2)]
    if len(exps) >= 4:
        return [("many_expectations", f"n={len(exps)}", 1)]
    return []


def classify(score: int) -> str:
    if score >= 7:
        return "high"
    if score >= 4:
        return "medium"
    if score >= 2:
        return "low"
    return "none"


def main():
    data = json.loads(INPUT.read_text())
    resources = data.get("resources", [])

    rows = []
    for r in resources:
        title = r.get("topic_title", "")
        url = r.get("url", "")
        desc = r.get("description", "")
        pub = r.get("publisher_creator", "")

        hits = []
        hits += signal_title(title)
        hits += signal_url(url)
        hits += signal_description(desc)
        hits += signal_publisher(pub)
        hits += signal_expectations(r)

        score = sum(w for _, _, w in hits)
        bucket = classify(score)
        if bucket == "none":
            continue

        reasons = "; ".join(f"{kind}:{val}" for kind, val, _ in hits)
        rows.append({
            "id": r.get("id", ""),
            "confidence": bucket,
            "score": score,
            "title": title,
            "publisher": pub,
            "url": url,
            "description": desc,
            "reasons": reasons,
        })

    # Sort high → low so the top of the file is the strongest candidates.
    rows.sort(key=lambda x: (-x["score"], x["title"].lower()))

    CSV_OUT.parent.mkdir(parents=True, exist_ok=True)
    with CSV_OUT.open("w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["id", "confidence", "score", "title", "publisher", "url", "description", "reasons"],
        )
        writer.writeheader()
        writer.writerows(rows)

    # Markdown report grouped by confidence bucket for easier skimming.
    buckets = {"high": [], "medium": [], "low": []}
    for row in rows:
        buckets[row["confidence"]].append(row)

    lines = []
    lines.append(f"# Collection candidates")
    lines.append("")
    lines.append(f"Total resources scanned: **{len(resources)}**")
    lines.append(f"Flagged: **{len(rows)}** "
                 f"(high={len(buckets['high'])}, "
                 f"medium={len(buckets['medium'])}, "
                 f"low={len(buckets['low'])})")
    lines.append("")
    lines.append("Heuristic-only. No fetching, no LLM. Skim and mark false positives.")
    lines.append("")

    for bucket in ("high", "medium", "low"):
        lines.append(f"## {bucket.title()} confidence ({len(buckets[bucket])})")
        lines.append("")
        for row in buckets[bucket]:
            lines.append(f"- **[{row['id']}]** {row['title']} _(score {row['score']})_")
            lines.append(f"  - publisher: {row['publisher']}")
            lines.append(f"  - url: {row['url']}")
            if row["description"]:
                lines.append(f"  - desc: {row['description']}")
            lines.append(f"  - signals: {row['reasons']}")
            lines.append("")

    MD_OUT.write_text("\n".join(lines))

    print(f"Scanned {len(resources)} resources.")
    print(f"Flagged {len(rows)} "
          f"(high={len(buckets['high'])}, medium={len(buckets['medium'])}, low={len(buckets['low'])})")
    print(f"CSV: {CSV_OUT.relative_to(REPO_ROOT)}")
    print(f"MD : {MD_OUT.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
