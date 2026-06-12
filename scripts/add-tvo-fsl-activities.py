#!/usr/bin/env python3
"""
add-tvo-fsl-activities.py
Append TVO Learn "Learning Activity" resources to resources.json under the
FSL subject (one grade per run).

Usage:
    python scripts/add-tvo-fsl-activities.py scripts/fsl-grade6-activities.json --grade 6

Input JSON is a list of objects:
    {
      "activity_number": 1,
      "french_title": "...",
      "url": "https://tvolearn.com/pages/...",
      "description": "...",
      "strand": ["Listening", "Speaking"],
      "curriculum_expectations": ["A1.1", "B1.1"]
    }

Mirrors the conventions used by the existing
"TVO Learn — Grade 8 Financial Literacy Learning Activities" series
(see r-1447..r-1451): single alignment per resource (expectation_code: null),
shared usage_notes, modality ["Interactive", "Online"].
"""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
RESOURCES_PATH = REPO_ROOT / "public" / "resources.json"
DOCS_PATH = REPO_ROOT / "docs" / "resources.json"
TODAY = datetime.utcnow().strftime("%Y-%m-%d")

USAGE_NOTES = (
    "Flexible deployment: project whole-class for guided discovery or assign "
    "on individual devices for self-paced exploration. No station setup required."
)


def get_grade_band(grade: int) -> str:
    if grade <= 2:
        return "primary"
    if grade <= 5:
        return "junior"
    if grade <= 8:
        return "intermediate"
    return "senior"


def snake_case(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_json", help="Path to classified activities JSON")
    parser.add_argument("--grade", type=int, required=True)
    args = parser.parse_args()

    entries = json.loads(Path(args.input_json).read_text(encoding="utf-8"))

    data = json.loads(RESOURCES_PATH.read_text(encoding="utf-8"))
    existing = data["resources"]
    max_num = max(
        (
            int(r["id"][2:])
            for r in existing
            if isinstance(r.get("id"), str) and r["id"].startswith("r-") and r["id"][2:].isdigit()
        ),
        default=0,
    )

    grade = args.grade
    grade_band = get_grade_band(grade)
    publisher = f"TVO Learn — Grade {grade} FSL Learning Activities"

    added_ids = []
    for entry in entries:
        max_num += 1
        strand = entry["strand"]
        resource = {
            "id": f"r-{max_num}",
            "topic_title": f"TVO Learn — Grade {grade} FSL Learning Activity {entry['activity_number']}: {entry['french_title']}",
            "description": entry["description"],
            "url": entry["url"],
            "publisher_creator": publisher,
            "grade_level": [grade],
            "grade_band": grade_band,
            "subject": "FSL",
            "strand": strand,
            "province": "ON",
            "jurisdiction": "ontario",
            "modality": ["Interactive", "Online"],
            "resource_type": "interactive",
            "access_type": "free",
            "is_paid": False,
            "curriculum_expectations": entry["curriculum_expectations"],
            "accessibility": ["No Concerns"],
            "instructional_modes": ["individual", "small-group", "whole-class"],
            "usage_notes": USAGE_NOTES,
            "alignments": [
                {
                    "jurisdiction": "ontario",
                    "grade": grade,
                    "subject": "fsl",
                    "strand": snake_case(strand[0]),
                    "expectation_code": None,
                    "expectation_description": None,
                    "alignment_strength": "primary",
                }
            ],
            "metadata": {
                "added_at": TODAY,
                "added_by": "maple_key_team",
                "verified": False,
                "needs_review": True,
            },
        }
        existing.append(resource)
        added_ids.append(resource["id"])
        print(f"  + [{resource['id']}] {resource['topic_title']}")

    data["meta"]["total_count"] = len(existing)
    data["meta"]["generated_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    output_json = json.dumps(data, ensure_ascii=False, indent=2)
    for path in (RESOURCES_PATH, DOCS_PATH):
        path.write_text(output_json, encoding="utf-8")
        print(f"  Written -> {path}")

    print(f"\nAdded {len(added_ids)} resources ({added_ids[0]}..{added_ids[-1]}). Total: {len(existing)}")


if __name__ == "__main__":
    main()
