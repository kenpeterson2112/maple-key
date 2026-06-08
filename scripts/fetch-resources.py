#!/usr/bin/env python3
"""
fetch-resources.py
Nightly job: discovers educational resources via web search and adds them to resources.json.

Usage:
    python scripts/fetch-resources.py --subject science
    python scripts/fetch-resources.py --subject social_studies

Requires:
    ANTHROPIC_API_KEY environment variable
    pip install anthropic duckduckgo-search requests
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import ssl
import uuid
from datetime import datetime
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("ERROR: anthropic not installed. Run: pip install anthropic")

try:
    from duckduckgo_search import DDGS
except ImportError:
    sys.exit("ERROR: duckduckgo-search not installed. Run: pip install duckduckgo-search")

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent
RESOURCES_PATH = REPO_ROOT / "public" / "resources.json"
DOCS_PATH = REPO_ROOT / "docs" / "resources.json"
TODAY = datetime.utcnow().strftime("%Y-%m-%d")

# ── Subject config ─────────────────────────────────────────────────────────────

SUBJECT_CONFIG = {
    "science": {
        "display": "Science",
        "strands": [
            "Earth and Space Systems",
            "Life Systems",
            "Matter and Energy",
            "STEM Skills and Connections",
        ],
        "queries": [
            "Ontario science curriculum grades 6 7 8 9 free educational resources teachers",
            "Earth Space Systems Ontario grades 6-9 interactive learning resources",
            "Life Systems biology ecology Ontario curriculum middle school free",
            "Matter Energy chemistry physics Ontario grades 6-9 educational resources",
            "STEM skills connections Ontario curriculum interactive activities free",
            "Canadian science education resources grades 6 to 9 online free",
        ],
    },
    "social_studies": {
        "display": "Social Studies",
        "strands": [
            "Heritage and Identity",
            "People and Environments",
            "Power and Governance",
        ],
        "queries": [
            "Ontario social studies curriculum grades 6 7 8 free educational resources",
            "Heritage Identity Canadian history culture Ontario grades 6-9 resources",
            "People Environments geography Ontario curriculum middle school free",
            "Power Governance civics democracy Ontario grades 6-9 resources",
            "Canadian geography history civics free classroom resources teachers",
            "Indigenous culture heritage Ontario curriculum resources teachers free",
        ],
    },
}

# Allowed modalities and resource types (from schema)
MODALITIES = ["Online", "Interactive", "Books & Print Media", "Video", "Audio/Podcast", "Field Trip", "Guest Speaker"]
RESOURCE_TYPES = ["digital", "interactive", "video", "print", "audio", "kit", "other"]
ACCESS_TYPES = ["free", "purchase", "licensed"]
GRADE_BANDS = ["primary", "junior", "intermediate", "senior", "multi"]

ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


# ── Web search ────────────────────────────────────────────────────────────────

def search_ddg(query: str, max_results: int = 10) -> list[dict]:
    """Run a DuckDuckGo text search and return [{title, href, body}]."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        return results
    except Exception as e:
        print(f"  [warn] DDG search failed for '{query}': {e}", file=sys.stderr)
        return []


def collect_candidates(queries: list[str]) -> list[dict]:
    """Run all queries and deduplicate by URL."""
    seen_urls: set[str] = set()
    candidates: list[dict] = []
    for q in queries:
        print(f"  Searching: {q}")
        results = search_ddg(q, max_results=8)
        for r in results:
            url = r.get("href", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                candidates.append({
                    "title": r.get("title", ""),
                    "url": url,
                    "snippet": r.get("body", ""),
                })
        time.sleep(1)  # be polite to DDG
    return candidates


# ── URL validation ─────────────────────────────────────────────────────────────

def is_url_reachable(url: str, timeout: int = 8) -> bool:
    """Return True if the URL returns a 2xx or 3xx HTTP status."""
    if not url.startswith(("http://", "https://")):
        return False
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout, context=ssl_ctx) as resp:
            return resp.status < 400
    except Exception:
        return False


# ── Claude formatting ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a curriculum specialist for the Ontario K-12 education system.
Your task is to evaluate web search results and extract educational resources suitable
for Maple Key — a Canadian teacher resource platform targeting grades 6–9.

Return ONLY a JSON array (no prose, no markdown fences). Each element must match this schema exactly:

{
  "topic_title": string,           // Clear descriptive title
  "description": string,           // 2-3 sentence description of what the resource offers
  "url": string,                   // Must be a real URL from the input
  "publisher_creator": string,     // Organization or author name
  "grade_level": [string|int],     // e.g. [6, 7, 8] or ["K"] — grades 6-9 focus
  "grade_band": string,            // one of: primary, junior, intermediate, senior, multi
  "subject": string,               // exactly as given
  "strand": [string],              // one or more from the given strands list
  "province": string,              // "ON" for Ontario-specific, "BC", "AB", or "CANADA" for national
  "jurisdiction": string,          // "ontario", "british_columbia", "alberta", or "canada"
  "modality": [string],            // subset of: Online, Interactive, Video, Audio/Podcast, Books & Print Media, Field Trip, Guest Speaker
  "resource_type": string,         // one of: digital, interactive, video, print, audio, kit, other
  "access_type": string,           // one of: free, purchase, licensed
  "is_paid": boolean,
  "curriculum_expectations": [string],   // 1-5 Ontario curriculum codes in the form "<LETTER><DIGIT>.<DIGIT>" (e.g. "D1.1", "B2.3") that the resource covers, drawn from the subject's curriculum for the listed grade(s). Never empty.
  "accessibility": ["No Concerns"],
  "instructional_modes": [],       // populated by normalize-resources.py
  "usage_notes": null,             // populated by enrich-usage-notes.py
  "alignments": [                  // one alignment per strand used
    {
      "jurisdiction": string,
      "grade": string,             // e.g. "[6, 7, 8]"
      "subject": string,           // snake_case, e.g. "social_studies"
      "strand": string,            // snake_case, e.g. "heritage_and_identity"
      "expectation_code": null,
      "expectation_description": null,
      "alignment_strength": "primary"
    }
  ]
}

Rules:
- Only include resources that are clearly educational and appropriate for grades 6–9.
- Only include resources where the URL appears legitimate (not a generic homepage of a search engine).
- Skip duplicates, ads, or low-quality pages.
- Prefer free, online, Canadian or Ontario-specific resources.
- `grade_level` must be a JSON array of integers (e.g. [6, 7, 8]) or the strings "K" / "PreK". Never wrap values in extra quotes or brackets — emit `[6]`, not `["[6]"]` or `["['6']"]`.
- `curriculum_expectations` must list 1–5 Ontario curriculum codes covered by the resource. Each code is `<LETTER><DIGIT>.<DIGIT>` (e.g. "D1.1"). Skip a candidate rather than emit a resource you cannot align to at least one code.
- Return between 3 and 8 resources.
- If none of the candidates are suitable, return an empty array [].
"""


def extract_resources_with_claude(
    candidates: list[dict],
    subject: str,
    strands: list[str],
    existing_urls: set[str],
) -> list[dict]:
    """Use Claude to select and format resources from raw search candidates."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        sys.exit("ERROR: ANTHROPIC_API_KEY environment variable not set")

    client = anthropic.Anthropic(api_key=api_key)

    # Filter out already-known URLs before sending to Claude
    fresh_candidates = [c for c in candidates if c["url"] not in existing_urls]
    if not fresh_candidates:
        print("  No new candidate URLs (all already in database).")
        return []

    user_message = f"""Subject: {subject}
Available strands: {json.dumps(strands)}

Here are {len(fresh_candidates)} web search candidates to evaluate:

{json.dumps(fresh_candidates, indent=2)}

Extract suitable educational resources and return a JSON array following the schema in the system prompt.
"""

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )
        raw = response.content[0].text.strip()
        # Strip any accidental markdown fences
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)
        resources = json.loads(raw)
        if not isinstance(resources, list):
            print("  [warn] Claude did not return a list", file=sys.stderr)
            return []
        return resources
    except json.JSONDecodeError as e:
        print(f"  [warn] Claude returned invalid JSON: {e}", file=sys.stderr)
        return []
    except Exception as e:
        print(f"  [error] Claude API call failed: {e}", file=sys.stderr)
        return []


# ── Resource post-processing ───────────────────────────────────────────────────

def next_id(existing: list[dict]) -> str:
    """Return the next r-NNNN id."""
    nums = []
    for r in existing:
        rid = r.get("id", "")
        if isinstance(rid, str) and rid.startswith("r-") and rid[2:].isdigit():
            nums.append(int(rid[2:]))
    return f"r-{max(nums, default=0) + 1}"


def stamp_resource(resource: dict, next_num: int) -> dict:
    """Attach id and metadata to a resource."""
    resource["id"] = f"r-{next_num}"
    resource["metadata"] = {
        "added_at": TODAY,
        "added_by": "maple_key_team",
        "verified": False,
        "needs_review": True,
    }
    # Ensure required fields have sensible defaults. Note: curriculum_expectations
    # should be populated by the Researcher prompt; the Assessor stage
    # (scripts/assess-curriculum-expectations.py) backfills anything still empty.
    resource.setdefault("curriculum_expectations", [])
    resource.setdefault("accessibility", ["No Concerns"])
    resource.setdefault("alignments", [])
    resource.setdefault("instructional_modes", [])
    resource.setdefault("usage_notes", None)
    return resource


def validate_resources(resources: list[dict], existing_urls: set[str]) -> list[dict]:
    """Filter out resources with unreachable or duplicate URLs."""
    valid = []
    for r in resources:
        url = r.get("url", "")
        if not url:
            continue
        if url in existing_urls:
            print(f"  [skip] Already in database: {url}")
            continue
        print(f"  Checking URL: {url}")
        if is_url_reachable(url):
            valid.append(r)
            existing_urls.add(url)
        else:
            print(f"  [skip] Unreachable: {url}")
    return valid


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch new educational resources from the web.")
    parser.add_argument(
        "--subject",
        required=True,
        choices=list(SUBJECT_CONFIG.keys()),
        help="Subject to fetch resources for",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print results but do not write to resources.json",
    )
    args = parser.parse_args()

    cfg = SUBJECT_CONFIG[args.subject]
    subject_display = cfg["display"]
    strands = cfg["strands"]
    queries = cfg["queries"]

    print(f"\n=== Maple Key Resource Fetcher: {subject_display} ===")
    print(f"Date: {TODAY}")

    # Load existing data
    with open(RESOURCES_PATH) as f:
        data = json.load(f)

    existing_resources: list[dict] = data["resources"]
    existing_urls: set[str] = {r.get("url", "") for r in existing_resources}

    # Step 1: Web search
    print("\n[1/4] Searching the web...")
    candidates = collect_candidates(queries)
    print(f"  Found {len(candidates)} unique candidate URLs")

    if not candidates:
        print("No candidates found. Exiting.")
        sys.exit(0)

    # Step 2: Claude extraction
    print("\n[2/4] Extracting resources with Claude...")
    raw_resources = extract_resources_with_claude(
        candidates, subject_display, strands, set(existing_urls)
    )
    print(f"  Claude identified {len(raw_resources)} candidate resources")

    if not raw_resources:
        print("No resources extracted. Exiting.")
        sys.exit(0)

    # Step 3: URL validation
    print("\n[3/4] Validating URLs...")
    valid_resources = validate_resources(raw_resources, existing_urls)
    print(f"  {len(valid_resources)} resources passed URL validation")

    if not valid_resources:
        print("No valid resources to add. Exiting.")
        sys.exit(0)

    # Step 4: Assign IDs and stamp metadata
    print("\n[4/4] Appending to resources.json...")
    max_num = max(
        (int(r["id"][2:]) for r in existing_resources if isinstance(r.get("id"), str) and r["id"].startswith("r-") and r["id"][2:].isdigit()),
        default=0,
    )

    for i, resource in enumerate(valid_resources):
        max_num += 1
        stamped = stamp_resource(resource, max_num)
        existing_resources.append(stamped)
        print(f"  + [{stamped['id']}] {stamped['topic_title']}")

    # Update meta
    data["resources"] = existing_resources
    data["meta"]["total_count"] = len(existing_resources)
    data["meta"]["generated_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    if args.dry_run:
        print("\n[dry-run] Not writing to disk.")
    else:
        with open(RESOURCES_PATH, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        # Mirror to docs/ if it exists
        if DOCS_PATH.exists():
            with open(DOCS_PATH, "w") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"\nDone. Added {len(valid_resources)} resources. Total: {len(existing_resources)}")


if __name__ == "__main__":
    main()
