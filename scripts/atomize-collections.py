#!/usr/bin/env python3
"""
atomize-collections.py
The Atomizer stage of the resource curation waterfall.

Reads collection-candidates.csv (produced by detect-collections.py), looks up
each flagged entry in resources.json, optionally fetches the page HTML, then
asks Claude to enumerate 3–8 individual leaf-level resources contained within
the collection. New entries are appended to resources.json (both public/ and
docs/). The original collection entry is marked is_collection=true,
decomposed=true so this script is idempotent.

Usage:
    python scripts/atomize-collections.py [--dry-run] [--limit N]
        [--confidence {high,medium,all}] [--skip-fetch]

Requires:
    ANTHROPIC_API_KEY
    pip install anthropic
"""

import argparse
import csv
import html
import json
import os
import re
import ssl
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("ERROR: anthropic not installed. Run: pip install anthropic")

REPO_ROOT = Path(__file__).parent.parent
CANDIDATES_CSV = REPO_ROOT / "scripts" / "collection-candidates.csv"
OUTPUTS = [
    REPO_ROOT / "public" / "resources.json",
    REPO_ROOT / "docs" / "resources.json",
]
TODAY = datetime.utcnow().strftime("%Y-%m-%d")

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

# Tags to strip when extracting visible text from HTML
_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")

SYSTEM_PROMPT = """\
You are a curriculum specialist for the Ontario K-12 education system.

A Maple Key database entry has been identified as a *collection* — a hub page,
course index, or playlist that groups multiple individual resources rather than
being a single activity or lesson itself.

Your task is to enumerate the *specific, atomic resources* contained within (or
strongly implied by) this collection. Each atomic resource should be something a
teacher could assign, use, or link to on its own.

Return ONLY a JSON array (no prose, no markdown fences). Each element must match
this schema exactly:

{
  "topic_title": string,           // Specific descriptive title for this one activity/lesson/tool
  "description": string,           // 2–3 sentences about what THIS resource offers (not the parent collection)
  "url": string,                   // Direct URL to this specific resource. If you can identify a sub-page URL
                                   // from the page content provided, use it. Otherwise reuse the parent URL.
  "publisher_creator": string,
  "grade_level": [int],            // e.g. [6, 7] — the specific grades this activity targets
  "grade_band": string,            // one of: primary, junior, intermediate, senior, multi
  "subject": string,               // inherit from parent unless clearly different
  "strand": [string],              // one or more strands this specific resource covers
  "province": string,              // "ON", "BC", "AB", or "CANADA"
  "jurisdiction": string,          // "ontario", "british_columbia", "alberta", or "canada"
  "modality": [string],            // subset of: Online, Interactive, Video, Audio/Podcast,
                                   // Books & Print Media, Field Trip, Guest Speaker
  "resource_type": string,         // one of: digital, interactive, video, print, audio, kit, other
  "access_type": string,           // one of: free, purchase, licensed
  "is_paid": boolean,
  "curriculum_expectations": [string],  // 1–5 Ontario codes like "D1.1", "B2.3"
  "accessibility": ["No Concerns"],
  "instructional_modes": [],
  "usage_notes": null,
  "alignments": [
    {
      "jurisdiction": string,
      "grade": string,
      "subject": string,
      "strand": string,
      "expectation_code": null,
      "expectation_description": null,
      "alignment_strength": "primary"
    }
  ]
}

Rules:
- Return 3–8 atomic resources. Quality over quantity.
- Each must be genuinely distinct (different topic, strand, or grade focus).
- Prefer specific sub-page URLs extracted from the page content over the parent URL.
  If the collection is a single-URL tool with multiple embedded activities, it is
  acceptable to reuse the parent URL for each atomic entry.
- Do not invent implausible URLs. Only emit sub-page URLs you can see in the
  provided page content.
- grade_level must be a JSON array of integers (e.g. [7, 8]).
- curriculum_expectations must list 1–5 valid Ontario codes. Never empty.
- If you cannot identify at least 3 distinct atomic resources from the data
  provided, return an empty array [].
"""


def fetch_page_text(url: str, timeout: int = 8, max_chars: int = 4000) -> str:
    """Fetch URL and return stripped visible text, or empty string on failure."""
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
                )
            },
        )
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
            raw = resp.read(65536).decode("utf-8", errors="ignore")
        # Rough visible-text extraction: strip tags, unescape entities, collapse whitespace
        text = _TAG_RE.sub(" ", raw)
        text = html.unescape(text)
        text = _WS_RE.sub(" ", text).strip()
        return text[:max_chars]
    except Exception as e:
        print(f"    [fetch] {url} → {type(e).__name__}: {e}", file=sys.stderr)
        return ""


def atomize_with_claude(
    collection: dict,
    page_text: str,
    client: anthropic.Anthropic,
) -> list[dict]:
    """Ask Claude to enumerate atomic resources within this collection."""
    grade_str = json.dumps(collection.get("grade_level") or [])
    strand_str = json.dumps(collection.get("strand") or [])

    user_parts = [
        f"Collection title: {collection.get('topic_title', '')}",
        f"Collection URL: {collection.get('url', '')}",
        f"Publisher: {collection.get('publisher_creator', '')}",
        f"Subject: {collection.get('subject', '')}",
        f"Strand(s): {strand_str}",
        f"Grade level: {grade_str}",
        f"Description: {collection.get('description', '')}",
    ]
    if page_text:
        user_parts.append(f"\nPage content (truncated):\n{page_text}")
    else:
        user_parts.append("\n(Page content unavailable — work from title and description only.)")

    user_message = "\n".join(user_parts) + (
        "\n\nPlease enumerate the atomic resources within this collection."
    )

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = response.content[0].text.strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
        result = json.loads(raw)
        if not isinstance(result, list):
            print("  [warn] Claude did not return a list", file=sys.stderr)
            return []
        return result
    except json.JSONDecodeError as e:
        print(f"  [warn] Claude returned invalid JSON: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"  [error] Claude API call failed: {e}", file=sys.stderr)
        return []


def next_id_num(resources: list[dict]) -> int:
    nums = []
    for r in resources:
        rid = r.get("id", "")
        if isinstance(rid, str) and rid.startswith("r-") and rid[2:].isdigit():
            nums.append(int(rid[2:]))
    return max(nums, default=0) + 1


def stamp(resource: dict, id_num: int) -> dict:
    resource["id"] = f"r-{id_num}"
    resource.setdefault("curriculum_expectations", [])
    resource.setdefault("accessibility", ["No Concerns"])
    resource.setdefault("alignments", [])
    resource.setdefault("instructional_modes", [])
    resource.setdefault("usage_notes", None)
    resource["metadata"] = {
        "added_at": TODAY,
        "added_by": "atomize-collections",
        "verified": False,
        "needs_review": True,
    }
    return resource


def load_candidates(confidence_filter: str) -> list[dict]:
    accepted = {"high", "medium", "low"} if confidence_filter == "all" else {confidence_filter}
    rows = []
    with CANDIDATES_CSV.open(newline="") as f:
        for row in csv.DictReader(f):
            if row["confidence"] in accepted:
                rows.append(row)
    return rows


def main():
    ap = argparse.ArgumentParser(description="Expand collection resources into atomic entries")
    ap.add_argument("--dry-run", action="store_true", help="Print changes without writing")
    ap.add_argument("--limit", type=int, default=None, help="Max collections to process")
    ap.add_argument(
        "--confidence",
        choices=["high", "medium", "all"],
        default="high",
        help="Which confidence tier to process (default: high)",
    )
    ap.add_argument("--skip-fetch", action="store_true", help="Skip URL fetching (faster, less accurate)")
    args = ap.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ERROR: ANTHROPIC_API_KEY environment variable not set")
    client = anthropic.Anthropic(api_key=api_key)

    # Load resources from the primary output file
    primary = OUTPUTS[0]
    data = json.loads(primary.read_text())
    resources: list[dict] = data.get("resources", [])
    by_id = {r["id"]: r for r in resources}
    existing_urls: set[str] = {r.get("url", "") for r in resources}

    candidates = load_candidates(args.confidence)
    print(f"Candidates loaded: {len(candidates)} ({args.confidence} confidence)")

    # Skip already-decomposed collections
    pending = [c for c in candidates if not by_id.get(c["id"], {}).get("decomposed")]
    print(f"Pending (not yet decomposed): {len(pending)}")

    if args.limit:
        pending = pending[: args.limit]
        print(f"Processing first {len(pending)} (--limit {args.limit})")

    new_resources: list[dict] = []
    decomposed_ids: list[str] = []
    id_counter = next_id_num(resources)

    for i, candidate in enumerate(pending):
        cid = candidate["id"]
        collection = by_id.get(cid)
        if not collection:
            print(f"  [{i+1}/{len(pending)}] {cid} — not found in resources.json, skipping")
            continue

        title = collection.get("topic_title", "")
        url = collection.get("url", "")
        print(f"\n[{i+1}/{len(pending)}] {cid}: {title}")
        print(f"  URL: {url}")

        page_text = ""
        if not args.skip_fetch and url:
            print("  Fetching page…", end=" ", flush=True)
            page_text = fetch_page_text(url)
            print(f"{'ok' if page_text else 'failed'} ({len(page_text)} chars)")

        print("  Calling Claude…", end=" ", flush=True)
        atoms = atomize_with_claude(collection, page_text, client)
        print(f"{len(atoms)} atoms returned")

        if not atoms:
            print("  Skipping (no atoms produced).")
            continue

        stamped = []
        for atom in atoms:
            atom_url = atom.get("url", "")
            if atom_url and atom_url in existing_urls:
                print(f"  Duplicate URL, skipping: {atom_url}")
                continue
            atom = stamp(atom, id_counter)
            id_counter += 1
            if atom_url:
                existing_urls.add(atom_url)
            stamped.append(atom)

        print(f"  → {len(stamped)} new entries (after dedup)")
        new_resources.extend(stamped)
        decomposed_ids.append(cid)

        # Polite delay between API calls
        if i < len(pending) - 1:
            time.sleep(1.5)

    print(f"\n{'─' * 60}")
    print(f"Collections processed: {len(decomposed_ids)}")
    print(f"New atomic resources:  {len(new_resources)}")

    if args.dry_run:
        print("\n[dry-run] No files written.")
        if new_resources:
            print("\nSample of first new resource:")
            print(json.dumps(new_resources[0], indent=2))
        return

    if not new_resources and not decomposed_ids:
        print("Nothing to write.")
        return

    # Append new resources and mark originals as decomposed
    resources.extend(new_resources)
    for cid in decomposed_ids:
        if cid in by_id:
            by_id[cid]["is_collection"] = True
            by_id[cid]["decomposed"] = True

    data["resources"] = resources

    for path in OUTPUTS:
        if path.exists():
            path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
            print(f"Written: {path.relative_to(REPO_ROOT)}")

    print("Done.")


if __name__ == "__main__":
    main()
