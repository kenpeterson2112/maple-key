#!/usr/bin/env python3
"""
generate-usage-notes.py
Populates the `usage_notes` field for all resources in public/resources.json
using rule-based generation from existing structured metadata.

No API key required — generates from resource_type, modality,
instructional_modes, and description keywords.

Usage:
    python scripts/generate-usage-notes.py [--dry-run] [--overwrite]

Options:
    --dry-run    Print notes without writing to disk
    --overwrite  Replace existing usage_notes (default: skip non-null values)
"""

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
OUTPUTS = [
    REPO_ROOT / "public" / "resources.json",
    REPO_ROOT / "docs" / "resources.json",
]


def generate_usage_note(resource: dict) -> str:
    resource_type = resource.get("resource_type", "digital")
    modality = resource.get("modality", [])
    modes = resource.get("instructional_modes", [])
    description = resource.get("description", "")
    d = description.lower()

    is_station = "station-rotation" in modes
    is_whole_class = "whole-class" in modes
    is_individual = "individual" in modes

    # Field trip + guest speaker combo
    if "Field Trip" in modality and "Guest Speaker" in modality:
        return (
            "Combines an on-site experience with expert-led instruction; best booked as "
            "a whole-class excursion with pre-trip and post-trip classroom activities."
        )

    # Field trip
    if "Field Trip" in modality:
        return (
            "A whole-class on-site experience; book well in advance and build pre-trip "
            "and post-trip activities to maximise curriculum connections."
        )

    # Guest speaker
    if "Guest Speaker" in modality:
        return (
            "Whole-class presentation format; contact the speaker in advance to align "
            "their content with specific curriculum expectations and lesson timing."
        )

    # Audio / podcast
    if "Audio/Podcast" in modality:
        return (
            "Play whole-class through classroom speakers as a hook or review segment, "
            "or assign for individual listening with headphones. Not suited for station rotation."
        )

    # Video
    if resource_type == "video":
        if any(kw in d for kw in ("lesson", "instruction", "lecture", "teach")):
            return (
                "Show whole-class during direct instruction or assign for individual review. "
                "Pause for discussion at key moments rather than playing straight through."
            )
        return (
            "Show whole-class as a lesson hook or concept anchor, or assign for "
            "independent viewing. Not designed for station rotation."
        )

    # Explicit station-rotation resources (from keyword override in normaliser)
    if is_station and not is_whole_class:
        if resource_type == "physical":
            return (
                "Requires physical materials distributed across stations; set up before class "
                "and plan for groups of 3–4 rotating through. Allow time for clean-up between rotations."
            )
        return (
            "Designed as a set of rotation tasks; print and set up multiple station areas "
            "before class. Works best with groups of 3–4 rotating on a timer."
        )

    # Physical (non-field-trip)
    if resource_type == "physical":
        return (
            "Requires physical materials; distribute to small groups of 3–4 or set up "
            "as a dedicated station. Prepare and organise materials before class."
        )

    # Print
    if resource_type == "print":
        if any(kw in d for kw in ("textbook", " unit", "chapter", "comprehensive")):
            return (
                "A print textbook or unit resource; assign specific pages for individual "
                "reading or guided partner work. No technology required."
            )
        if any(kw in d for kw in ("worksheet", "practice", "drill", "exercise")):
            return (
                "Distribute as an individual or partner activity during the action phase "
                "for independent practice; no technology required."
            )
        return (
            "A print-based resource for individual or small-group work. "
            "Distribute at the start of the activity; no technology required."
        )

    # Interactive
    if resource_type == "interactive":
        if any(kw in d for kw in ("game", "competi", "challenge", "quiz")):
            return (
                "Works well on individual devices for self-paced practice or projected "
                "whole-class for competitive whole-group play. No station rotation needed."
            )
        if any(kw in d for kw in ("manipulat", "virtual", "drag", "hands-on")):
            return (
                "Best on individual or paired devices so students can explore hands-on; "
                "also effective projected whole-class for teacher-led demonstration."
            )
        if any(kw in d for kw in ("investigat", "inquiry", "explor", "discover")):
            return (
                "Open-ended structure supports inquiry; assign on individual devices for "
                "self-directed exploration or project whole-class to guide discussion."
            )
        return (
            "Flexible deployment: project whole-class for guided discovery or "
            "assign on individual devices for self-paced exploration. No station setup required."
        )

    # Digital — various sub-cases
    if resource_type == "digital":
        if "Books & Print Media" in modality:
            return (
                "A downloadable or printable digital resource; print for individual "
                "students or display on-screen for whole-class reference."
            )
        if any(kw in d for kw in ("video", "watch", "watch along")):
            return (
                "Show whole-class as a hook or review segment, or assign for independent viewing. "
                "Not designed for station use."
            )
        if any(kw in d for kw in ("assessment", "quiz", "formative", "self-assessment")):
            return (
                "Best completed individually on student devices as a formative check. "
                "Review answers whole-class for consolidation."
            )
        if any(kw in d for kw in ("lesson", "slides", "presentation", "slideshow", "google slide")):
            return (
                "Teacher-facing lesson resource; display on the projector and work through "
                "with the class. Share the link so students can revisit independently."
            )
        if any(kw in d for kw in ("article", "read", "text", "passage")):
            return (
                "Display on-screen for shared reading or assign on individual devices. "
                "Pairs well with a reading-response prompt or annotation task."
            )
        if any(kw in d for kw in ("game", "competi")):
            return (
                "Works projected whole-class for shared engagement or on individual devices "
                "for self-paced play. No station setup required."
            )
        if is_whole_class and is_individual:
            return (
                "Flexible deployment: works projected for whole-class instruction "
                "or accessed independently on student devices. No station rotation required."
            )
        return (
            "Access on any device; suitable for whole-class display or individual exploration. "
            "No station setup needed."
        )

    # Fallback
    return (
        "Flexible resource; use whole-class for shared instruction or assign "
        "individually depending on available technology and lesson context."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--overwrite", action="store_true")
    args = parser.parse_args()

    with open(OUTPUTS[0]) as f:
        data = json.load(f)

    resources = data["resources"]
    updated = 0
    skipped = 0

    for r in resources:
        existing = r.get("usage_notes")
        if existing and not args.overwrite:
            skipped += 1
            continue
        note = generate_usage_note(r)
        if args.dry_run:
            print(f"[{r['id']}] {r['topic_title']}")
            print(f"  type={r['resource_type']} modes={r.get('instructional_modes')}")
            print(f"  note: {note}")
            print()
        else:
            r["usage_notes"] = note
        updated += 1

    print(f"Generated: {updated}  Skipped: {skipped}", file=sys.stderr)

    if args.dry_run:
        print("Dry run — no files written.", file=sys.stderr)
        return

    for path in OUTPUTS:
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        print(f"Written: {path}", file=sys.stderr)


if __name__ == "__main__":
    main()
