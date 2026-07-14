#!/usr/bin/env python3
"""
add-chatterhigh-tax-literacy.py

Appends the 7 CRA "Learn about your taxes" lesson plans to resources.json as
individual, atomized entries under the Financial Literacy strand (Math, Grade 9).

These are the source content behind ChatterHigh's Gamified Tax Literacy Course
for Teens (resources.chatterhigh.com/gamified-tax-literacy-course-for-teens).
Each lesson plan has its own stable canada.ca URL and can be independently
assigned, which is why they're added as separate resources rather than one
bundled entry.

Usage:
    python scripts/add-chatterhigh-tax-literacy.py [--dry-run]
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
RESOURCES_PATH = REPO_ROOT / "public" / "resources.json"
DOCS_PATH = REPO_ROOT / "docs" / "resources.json"
TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
GENERATED_AT = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

CRA_BASE = (
    "https://www.canada.ca/en/revenue-agency/services/tax"
    "/individuals/educational-programs/lesson-plans/"
)

USAGE_NOTES = (
    "Self-paced online lesson with built-in quizzes; assign individually or "
    "walk through as a class using the embedded real-life tax-slip examples. "
    "Also deliverable as a scored, gamified activity via ChatterHigh's "
    "Gamified Tax Literacy Course for Teens."
)

ALIGNMENT = {
    "jurisdiction": "ontario",
    "grade": None,
    "subject": "mathematics",
    "strand": "financial_literacy",
    "expectation_code": None,
    "expectation_description": None,
    "alignment_strength": "primary",
}

# fmt: off
ENTRIES = [
    {
        "topic_title": "CRA Learn About Your Taxes — Purpose of Taxes",
        "description": (
            "Official CRA lesson plan explaining why Canadians pay taxes, what "
            "tax revenue funds, and how the Canadian tax system works, with "
            "built-in quizzes and real-life examples. Covers the civic and "
            "economic rationale for taxation as a mechanism to distribute "
            "resources for public services."
        ),
        "url": CRA_BASE + "lp-purpose-taxes.html",
        "curriculum_expectations": ["F1.5"],
    },
    {
        "topic_title": "CRA Learn About Your Taxes — Starting to Work",
        "description": (
            "Lesson plan covering what students need to know when they start "
            "their first job: obtaining a Social Insurance Number, completing a "
            "TD1 form, reading a pay stub, and understanding T4 slips and "
            "payroll deductions (CPP, EI, income tax). Includes 4 sub-lessons "
            "and interactive quizzes."
        ),
        "url": CRA_BASE + "lp-starting-work.html",
        "curriculum_expectations": ["F1.1", "F1.2"],
    },
    {
        "topic_title": "CRA Learn About Your Taxes — Preparing to Do Your Taxes",
        "description": (
            "Guides students through organizing the information and slips "
            "needed before filing — including T4s and other income slips — and "
            "compares different filing methods (paper vs. certified tax "
            "software). Covers key dates and how staying organized reduces "
            "barriers to reaching financial goals."
        ),
        "url": CRA_BASE + "lp-preparing-your-taxes.html",
        "curriculum_expectations": ["F1.1", "F1.3"],
    },
    {
        "topic_title": "CRA Learn About Your Taxes — Completing a Basic Tax Return",
        "description": (
            "Step-by-step lesson on filling out a tax return: reporting all "
            "income sources (including tips and platform-economy income), "
            "understanding Canada's progressive tax system, and calculating "
            "whether a refund or balance owing results. Real T4 slip examples "
            "are embedded throughout."
        ),
        "url": CRA_BASE + "lp-completing-basic-return.html",
        "curriculum_expectations": ["F1.2", "F1.5"],
    },
    {
        "topic_title": "CRA Learn About Your Taxes — After Sending Us Your Tax Return",
        "description": (
            "Explains what happens after a return is filed: how to read a "
            "Notice of Assessment, how to request a change to a return, and "
            "how to respond to CRA correspondence. Helps students understand "
            "what factors (errors, missing slips) can affect their financial "
            "standing post-filing."
        ),
        "url": CRA_BASE + "lp-after-sending-tax-return.html",
        "curriculum_expectations": ["F1.3"],
    },
    {
        "topic_title": "CRA Learn About Your Taxes — Accessing Your Benefits and Credits",
        "description": (
            "Introduces the most common CRA-administered benefits and credits "
            "(e.g., GST/HST credit, Canada Child Benefit), explains basic "
            "eligibility criteria, and walks students through how to apply and "
            "keep receiving payments — illustrating how government programs "
            "distribute financial resources to eligible individuals."
        ),
        "url": CRA_BASE + "lp-accessing-benefits-credits.html",
        "curriculum_expectations": ["F1.2", "F1.5"],
    },
    {
        "topic_title": "CRA Learn About Your Taxes — Using My Account",
        "description": (
            "Walks students through registering for and navigating CRA's "
            "\"My Account\" online portal: viewing tax information, tracking "
            "refunds, updating personal details, and managing benefit payments "
            "digitally. An accessible introduction to managing one's finances "
            "through official government digital services."
        ),
        "url": CRA_BASE + "lp-using-my-account.html",
        "curriculum_expectations": ["F1.1"],
    },
]
# fmt: on


def next_id_num(resources: list) -> int:
    nums = [
        int(r["id"][2:])
        for r in resources
        if isinstance(r.get("id"), str)
        and r["id"].startswith("r-")
        and r["id"][2:].isdigit()
    ]
    return max(nums, default=0) + 1


def build_resource(entry: dict, id_num: int) -> dict:
    return {
        "id": f"r-{id_num}",
        "topic_title": entry["topic_title"],
        "description": entry["description"],
        "url": entry["url"],
        "publisher_creator": "Canada Revenue Agency (CRA)",
        "grade_level": [9],
        "grade_band": "senior",
        "subject": "Math",
        "strand": ["Financial Literacy"],
        "province": "ON",
        "jurisdiction": "ontario",
        "modality": ["Online", "Interactive"],
        "resource_type": "interactive",
        "access_type": "free",
        "is_paid": False,
        "curriculum_expectations": entry["curriculum_expectations"],
        "accessibility": ["No Concerns"],
        "instructional_modes": ["individual", "whole-class"],
        "usage_notes": USAGE_NOTES,
        "alignments": [ALIGNMENT],
        "metadata": {
            "added_at": TODAY,
            "added_by": "maple_key_team",
            "verified": False,
            "needs_review": True,
        },
        "language": "en",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print without writing")
    args = parser.parse_args()

    data = json.loads(RESOURCES_PATH.read_text(encoding="utf-8"))
    resources: list = data["resources"]
    existing_urls = {r.get("url", "") for r in resources}

    id_counter = next_id_num(resources)
    added = []

    for entry in ENTRIES:
        if entry["url"] in existing_urls:
            print(f"  [skip] already present: {entry['url']}")
            continue
        resource = build_resource(entry, id_counter)
        id_counter += 1
        resources.append(resource)
        existing_urls.add(entry["url"])
        added.append(resource)
        print(f"  + [{resource['id']}] {resource['topic_title']}")

    if not added:
        print("Nothing to add — all entries already present.")
        return

    data["meta"]["total_count"] = len(resources)
    data["meta"]["generated_at"] = GENERATED_AT

    if args.dry_run:
        print(f"\n[dry-run] Would add {len(added)} resources. No files written.")
        return

    output = json.dumps(data, ensure_ascii=False, indent=2)
    for path in (RESOURCES_PATH, DOCS_PATH):
        path.write_text(output, encoding="utf-8")
        print(f"  Written → {path.relative_to(REPO_ROOT)}")

    print(f"\nAdded {len(added)} resources "
          f"({added[0]['id']}..{added[-1]['id']}). "
          f"Total: {len(resources)}")


if __name__ == "__main__":
    main()
