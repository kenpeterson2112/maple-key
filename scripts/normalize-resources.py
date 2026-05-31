#!/usr/bin/env python3
"""
normalize-resources.py
Cleans and restructures public/resources.json to schema v2.0.

Changes made:
- grade_level: string/CSV → sorted array of int/"K"/"PreK"
- modality: CSV string → sorted canonical string array
- accessibility: normalize casing
- submitted_by → metadata.added_by (canonical names)
- timestamp → metadata.added_at (YYYY-MM-DD)
- needs_review → metadata.needs_review (bool)
- New fields: resource_type, access_type, grade_band, jurisdiction, alignments, metadata
- curriculum_expectations kept at top level for backward compat
- Wraps output in {"meta": {...}, "resources": [...]}
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent
INPUT = REPO_ROOT / "public" / "resources.json"
OUTPUTS = [
    REPO_ROOT / "public" / "resources.json",
    REPO_ROOT / "docs" / "resources.json",
]
REPORT = REPO_ROOT / "scripts" / "normalization-report.txt"

# ── Lookup tables ──────────────────────────────────────────────────────────────

SUBMITTED_BY_MAP = {
    "sab": "Sabrina Greupner",
    "SAb".lower(): "Sabrina Greupner",
    "sabrina": "Sabrina Greupner",
    "sabrina greupner": "Sabrina Greupner",
    "resource team": "maple_key_team",
    "excel import": "maple_key_team",
}

PROVINCE_TO_JURISDICTION = {
    "ON": "ontario",
    "AB": "alberta",
    "BC": "british_columbia",
    "MB": "manitoba",
    "QC": "quebec",
    "NS": "nova_scotia",
    "SK": "saskatchewan",
    "NL": "newfoundland",
    "NB": "new_brunswick",
    "PE": "prince_edward_island",
    "YT": "yukon",
    "NT": "northwest_territories",
    "NU": "nunavut",
}

# Token → canonical modality name
MODALITY_TOKEN_MAP = {
    "online": "Online",
    "interactive": "Interactive",
    "books & print media": "Books & Print Media",
    "books": "Books & Print Media",
    "print": "Books & Print Media",
    "video": "Video",
    "film": "Video",
    "trip": "Field Trip",
    "field trip": "Field Trip",
    "guest speaker": "Guest Speaker",
    "speaker": "Guest Speaker",
    "audio": "Audio/Podcast",
    "podcast": "Audio/Podcast",
    "audio/podcast": "Audio/Podcast",
}

SUBJECT_DISPLAY_MAP = {
    "math": "Math",
    "mathematics": "Math",
    "science": "Science",
    "language": "Language",
    "social studies": "Social Studies",
    "social": "Social Studies",
    "health": "Health",
    "arts": "Arts",
    "music": "Music",
}

SUBJECT_KEY_MAP = {
    "Math": "mathematics",
    "Mathematics": "mathematics",
    "Science": "science",
    "Language": "language",
    "Social Studies": "social_studies",
    "Health": "health",
    "Arts": "arts",
    "Music": "music",
}

# ── Grade helpers ──────────────────────────────────────────────────────────────

def _grade_to_num(g: str):
    """Return numeric representation: PreK=-1, K=0, 1-12=int, else None."""
    g = g.strip()
    if g.upper() in ("K",):
        return 0
    if g.upper() in ("PREK", "PRE-K", "PRE_K"):
        return -1
    try:
        return int(g)
    except ValueError:
        return None


def _num_to_grade(n: int):
    if n == -1:
        return "PreK"
    if n == 0:
        return "K"
    return n


def normalize_grade_level(grade_str) -> list:
    if not grade_str and grade_str != 0:
        return []
    # Handle already-normalized array (idempotent re-run)
    if isinstance(grade_str, list):
        return grade_str

    grade_str = str(grade_str).strip()
    # Strip trailing symbols like + or *
    grade_str = re.sub(r"[+*]+$", "", grade_str).strip()

    # Range pattern: "K-8", "PreK-12", "5-12", "7-8"
    range_match = re.match(r"^(PreK|Pre-K|K|\d+)\s*-\s*(\d+)$", grade_str, re.IGNORECASE)
    if range_match:
        start_num = _grade_to_num(range_match.group(1))
        end_num = _grade_to_num(range_match.group(2))
        if start_num is not None and end_num is not None and end_num >= start_num:
            return [_num_to_grade(n) for n in range(start_num, end_num + 1)]

    # Comma-separated: "7, 8" or "6, 7, 8, 9"
    if "," in grade_str:
        parts = [p.strip() for p in grade_str.split(",")]
        result = []
        for p in parts:
            n = _grade_to_num(p)
            if n is not None:
                result.append(_num_to_grade(n))
        return result

    # Single value
    n = _grade_to_num(grade_str)
    if n is not None:
        return [_num_to_grade(n)]

    return [grade_str]  # unknown — preserve as-is


def get_grade_band(grades: list) -> str:
    if not grades:
        return "multi"
    nums = []
    for g in grades:
        if g == "PreK":
            nums.append(-1)
        elif g == "K":
            nums.append(0)
        elif isinstance(g, int):
            nums.append(g)
    if not nums:
        return "multi"
    lo, hi = min(nums), max(nums)
    if hi <= 2:
        return "primary"
    if lo >= 3 and hi <= 5:
        return "junior"
    if lo >= 6 and hi <= 8:
        return "intermediate"
    if lo >= 9:
        return "senior"
    return "multi"


# ── Modality helpers ───────────────────────────────────────────────────────────

def normalize_modality(modality_str) -> list:
    if not modality_str:
        return []
    # Handle already-normalized array (idempotent re-run)
    if isinstance(modality_str, list):
        tokens = [t.strip() for t in modality_str]
    else:
        tokens = [t.strip() for t in str(modality_str).split(",")]
    canonical = set()
    for token in tokens:
        key = token.lower()
        mapped = MODALITY_TOKEN_MAP.get(key)
        if mapped:
            canonical.add(mapped)
        else:
            canonical.add(token)  # preserve unknown values
    return sorted(canonical)


def get_resource_type(modalities: list) -> str:
    m_lower = {m.lower() for m in modalities}
    if "interactive" in m_lower:
        return "interactive"
    if "video" in m_lower:
        return "video"
    if m_lower == {"books & print media"}:
        return "print"
    if "field trip" in m_lower:
        return "physical"
    return "digital"


def infer_instructional_modes(modalities: list, resource_type: str, title: str, description: str) -> list:
    m_lower = {m.lower() for m in modalities}
    text = (title + " " + description).lower()

    # Experiential — always whole-class
    if "field trip" in m_lower or "guest speaker" in m_lower:
        modes = ["whole-class"]

    elif resource_type == "video" or "audio/podcast" in m_lower:
        modes = ["individual", "whole-class"]

    elif resource_type == "print":
        modes = ["individual", "small-group"]

    elif resource_type == "interactive":
        modes = ["individual", "small-group", "whole-class"]

    elif resource_type == "physical":
        modes = ["small-group", "station-rotation"]

    elif resource_type == "digital":
        if "books & print media" in m_lower:
            # Downloadable/printable digital resource
            modes = ["individual", "small-group"]
        else:
            modes = ["individual", "whole-class"]

    else:
        modes = ["individual", "whole-class"]

    # Station/centre override: if the title or description clearly describes
    # a station or centre activity, mark it as such regardless of resource_type.
    if any(kw in text for kw in ("station", "centre", "center", "rotation")):
        modes = ["small-group", "station-rotation"]

    return sorted(set(modes))


# ── Subject helpers ────────────────────────────────────────────────────────────

def normalize_subject_display(subject: str) -> str:
    """Return the canonical display form of a subject."""
    if not subject:
        return "Other"
    mapped = SUBJECT_DISPLAY_MAP.get(subject.strip().lower())
    return mapped if mapped else subject.strip()


def subject_to_key(subject_display: str) -> str:
    """Return snake_case key for alignments."""
    return SUBJECT_KEY_MAP.get(subject_display, subject_display.lower().replace(" ", "_"))


# ── Accessibility ──────────────────────────────────────────────────────────────

def normalize_accessibility(acc_list: list) -> list:
    if not acc_list:
        return ["Not Reviewed"]
    result = []
    for item in acc_list:
        lower = item.lower()
        if "no concerns" in lower:
            result.append("No Concerns")
        elif "some concerns" in lower:
            result.append("Some Concerns")
        elif "not accessible" in lower:
            result.append("Not Accessible")
        else:
            result.append(item)
    return result


# ── Contributor names ──────────────────────────────────────────────────────────

def normalize_added_by(submitted_by: str) -> str:
    if not submitted_by:
        return "maple_key_team"
    return SUBMITTED_BY_MAP.get(submitted_by.strip().lower(), submitted_by.strip())


# ── Timestamp ─────────────────────────────────────────────────────────────────

_TS_FORMATS = [
    "%m/%d/%Y %H:%M:%S",
    "%-m/%-d/%Y %H:%M:%S",  # Linux non-padded (may not be needed)
    "%m/%d/%Y %H:%M",
]


def normalize_timestamp(ts: str):
    if not ts:
        return None
    for fmt in _TS_FORMATS:
        try:
            return datetime.strptime(ts.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # Fallback: extract date portion manually
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", ts.strip())
    if m:
        month, day, year = m.groups()
        try:
            return datetime(int(year), int(month), int(day)).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return None


# ── Alignments ────────────────────────────────────────────────────────────────

def build_alignments(resource: dict, grade_levels: list, subject_key: str) -> list:
    codes = resource.get("curriculum_expectations") or []
    strands = resource.get("strand") or []
    province = resource.get("province") or "ON"
    jurisdiction = PROVINCE_TO_JURISDICTION.get(province, "ontario")

    # Primary grade for alignment
    primary_grade = next((g for g in grade_levels if isinstance(g, int)), None)
    if primary_grade is None and grade_levels:
        primary_grade = grade_levels[0]

    # Primary strand → snake_case
    strand_raw = strands[0] if strands else None
    if strand_raw:
        strand_key = re.sub(r"[^a-z0-9]+", "_", strand_raw.lower()).strip("_")
    else:
        strand_key = None

    alignments = []
    if codes:
        for code in codes:
            alignments.append({
                "jurisdiction": jurisdiction,
                "grade": primary_grade,
                "subject": subject_key,
                "strand": strand_key,
                "expectation_code": code,
                "expectation_description": None,
                "alignment_strength": "primary",
            })
    else:
        alignments.append({
            "jurisdiction": jurisdiction,
            "grade": primary_grade,
            "subject": subject_key,
            "strand": strand_key,
            "expectation_code": None,
            "expectation_description": None,
            "alignment_strength": "primary",
        })

    return alignments


# ── Main normalization ─────────────────────────────────────────────────────────

def normalize_resource(resource: dict, auto_id_counter: int) -> dict:
    # ── ID ──
    raw_id = resource.get("id")
    if raw_id is not None:
        # Already in "r-NNN" format (idempotent re-run) or numeric
        new_id = str(raw_id) if str(raw_id).startswith("r-") else f"r-{raw_id}"
    else:
        new_id = f"r-{auto_id_counter}"

    # ── Grade ──
    grade_levels = normalize_grade_level(str(resource.get("grade_level") or ""))
    grade_band = get_grade_band(grade_levels)

    # ── Subject ──
    subject_display = normalize_subject_display(resource.get("subject", ""))
    subject_key = subject_to_key(subject_display)

    # ── Modality ──
    modalities = normalize_modality(resource.get("modality") or "")
    resource_type = get_resource_type(modalities)
    instructional_modes = infer_instructional_modes(
        modalities,
        resource_type,
        resource.get("topic_title") or "",
        resource.get("description") or "",
    )

    # ── Access ──
    is_paid = bool(resource.get("is_paid", False))
    access_type = "purchase" if is_paid else "free"

    # ── Province / Jurisdiction ──
    province = (resource.get("province") or "ON").strip()
    jurisdiction = PROVINCE_TO_JURISDICTION.get(province, "ontario")

    # ── Accessibility ──
    accessibility = normalize_accessibility(resource.get("accessibility") or [])

    # ── Curriculum expectations (top-level for backward compat) ──
    curriculum_expectations = resource.get("curriculum_expectations") or []

    # ── Alignments ──
    alignments = build_alignments(resource, grade_levels, subject_key)

    # ── Metadata ── (handle both old flat fields and already-migrated metadata object)
    existing_meta = resource.get("metadata") or {}
    added_by = existing_meta.get("added_by") or normalize_added_by(resource.get("submitted_by") or "")
    added_at = existing_meta.get("added_at") or normalize_timestamp(resource.get("timestamp") or "")
    raw_needs_review = existing_meta.get("needs_review", resource.get("needs_review"))
    needs_review = raw_needs_review is True or raw_needs_review == "yes"

    return {
        "id": new_id,
        "topic_title": (resource.get("topic_title") or "").strip(),
        "description": (resource.get("description") or "").strip(),
        "url": (resource.get("url") or "").strip(),
        "publisher_creator": (resource.get("publisher_creator") or "").strip(),
        # Grade / subject / location (kept at top level for filtering)
        "grade_level": grade_levels,
        "grade_band": grade_band,
        "subject": subject_display,
        "strand": resource.get("strand") or [],
        "province": province,
        "jurisdiction": jurisdiction,
        # Modality / access
        "modality": modalities,
        "resource_type": resource_type,
        "access_type": access_type,
        "is_paid": is_paid,
        # Curriculum (top-level for backward compat with existing filter/card logic)
        "curriculum_expectations": curriculum_expectations,
        # Accessibility
        "accessibility": accessibility,
        # Publication info (sparse — only 11% of records have this)
        **({"year_published": resource["year_published"]} if resource.get("year_published") is not None else {}),
        # Pedagogical deployment context
        "instructional_modes": instructional_modes,
        "usage_notes": resource.get("usage_notes") or None,
        # New relational structure
        "alignments": alignments,
        # Provenance
        "metadata": {
            "added_at": added_at,
            "added_by": added_by,
            "verified": False,
            "needs_review": needs_review,
        },
    }


# ── Report helpers ─────────────────────────────────────────────────────────────

def run():
    print(f"Reading {INPUT} …")
    raw_data = json.loads(INPUT.read_text(encoding="utf-8"))

    # Accept both the old flat array and the new {"resources": [...]} wrapper
    if isinstance(raw_data, dict) and "resources" in raw_data:
        raw = raw_data["resources"]
    elif isinstance(raw_data, list):
        raw = raw_data
    else:
        print("ERROR: expected top-level JSON array or {resources: []} object", file=sys.stderr)
        sys.exit(1)

    total_in = len(raw)
    print(f"  {total_in} records loaded")

    # Stats
    stats = {
        "had_id": 0,
        "auto_id": 0,
        "grade_changed": 0,
        "modality_changed": 0,
        "accessibility_changed": 0,
        "name_normalized": 0,
        "with_curriculum_codes": 0,
        "without_curriculum_codes": 0,
        "grade_band_counts": {},
        "subject_counts": {},
        "jurisdiction_counts": {},
        "instructional_mode_counts": {},
    }

    auto_id_counter = 1
    resources = []

    for raw_r in raw:
        had_id = "id" in raw_r and raw_r["id"] is not None
        if had_id:
            stats["had_id"] += 1
        else:
            stats["auto_id"] += 1

        counter = auto_id_counter if not had_id else 0
        if not had_id:
            auto_id_counter += 1

        normed = normalize_resource(raw_r, counter)

        # Stats
        if str(raw_r.get("grade_level", "")) != str(normed["grade_level"]):
            stats["grade_changed"] += 1
        orig_modality = raw_r.get("modality") or ""
        if orig_modality != ", ".join(normed["modality"]) and orig_modality != "":
            stats["modality_changed"] += 1

        orig_acc = (raw_r.get("accessibility") or [])
        if orig_acc != normed["accessibility"]:
            stats["accessibility_changed"] += 1

        orig_name = (raw_r.get("submitted_by") or "").strip()
        if normalize_added_by(orig_name) != orig_name:
            stats["name_normalized"] += 1

        if normed["curriculum_expectations"]:
            stats["with_curriculum_codes"] += 1
        else:
            stats["without_curriculum_codes"] += 1

        gb = normed["grade_band"]
        stats["grade_band_counts"][gb] = stats["grade_band_counts"].get(gb, 0) + 1

        subj = normed["subject"]
        stats["subject_counts"][subj] = stats["subject_counts"].get(subj, 0) + 1

        jur = normed["jurisdiction"]
        stats["jurisdiction_counts"][jur] = stats["jurisdiction_counts"].get(jur, 0) + 1

        for mode in normed.get("instructional_modes") or []:
            stats["instructional_mode_counts"][mode] = stats["instructional_mode_counts"].get(mode, 0) + 1

        resources.append(normed)

    # Build output
    output = {
        "meta": {
            "generated_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "total_count": len(resources),
            "schema_version": "2.1",
        },
        "resources": resources,
    }

    # Write outputs
    output_json = json.dumps(output, ensure_ascii=False, indent=2)
    for path in OUTPUTS:
        path.write_text(output_json, encoding="utf-8")
        print(f"  Written → {path}")

    # Write report
    lines = [
        "Normalization Report",
        "=" * 60,
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        f"Input records:              {total_in}",
        f"Output records:             {len(resources)}",
        "",
        f"Records with original id:   {stats['had_id']}",
        f"Records assigned auto-id:   {stats['auto_id']}",
        "",
        f"grade_level changed:        {stats['grade_changed']}",
        f"modality changed:           {stats['modality_changed']}",
        f"accessibility changed:      {stats['accessibility_changed']}",
        f"contributor names normed:   {stats['name_normalized']}",
        "",
        f"With curriculum codes:      {stats['with_curriculum_codes']}",
        f"Without curriculum codes:   {stats['without_curriculum_codes']}",
        "",
        "Grade band breakdown:",
    ]
    for gb, count in sorted(stats["grade_band_counts"].items()):
        lines.append(f"  {gb:<16} {count}")
    lines += ["", "Subject breakdown:"]
    for subj, count in sorted(stats["subject_counts"].items(), key=lambda x: -x[1]):
        lines.append(f"  {subj:<20} {count}")
    lines += ["", "Jurisdiction breakdown:"]
    for jur, count in sorted(stats["jurisdiction_counts"].items(), key=lambda x: -x[1]):
        lines.append(f"  {jur:<24} {count}")
    lines += ["", "Instructional modes breakdown:"]
    for mode, count in sorted(stats["instructional_mode_counts"].items(), key=lambda x: -x[1]):
        lines.append(f"  {mode:<24} {count}")

    report_text = "\n".join(lines) + "\n"
    REPORT.write_text(report_text, encoding="utf-8")
    print(f"  Report → {REPORT}")
    print()
    print(report_text)


if __name__ == "__main__":
    run()
