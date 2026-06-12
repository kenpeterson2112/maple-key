#!/usr/bin/env python3
"""
add-ophea-resources.py
Append Ophea (https://ophea.net/fr) resources to resources.json under the
"Health & Physical Education" subject. These are French-language Ontario
Education physique et sante (EPS / H&PE) resources.

Usage:
    python scripts/add-ophea-resources.py scripts/ophea-resources.csv

Input is the raw browser-extension scrape with header:
    title,url,description,grade_level,resource_type

Constant tags applied to every row (Ophea is an Ontario H&PE non-profit; the
scrape only captures page-visible fields, so the rest mirror the TVO ingestion
conventions):
    subject            = "Health & Physical Education"
    language           = "fr"
    publisher_creator  = "Ophea"
    province           = "ON"        jurisdiction = "ontario"
    access_type        = "free"      is_paid = False        (see CURATION overrides)

Per-resource strand is curated here (keyed by URL slug) against the four
Ontario 2019 H&PE strands; grade_level / resource_type / modality are derived
from the scraped columns. Every row is stamped needs_review = True.

This run also backfills language = "en" on every pre-existing resource so the
new field is consistent across the DB.
"""

import argparse
import csv
import re
import unicodedata
from datetime import datetime
from pathlib import Path

import json


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

REPO_ROOT = Path(__file__).parent.parent
RESOURCES_PATH = REPO_ROOT / "public" / "resources.json"
DOCS_PATH = REPO_ROOT / "docs" / "resources.json"
TODAY = datetime.utcnow().strftime("%Y-%m-%d")

PUBLISHER = "Ophea"
SUBJECT = "Health & Physical Education"
LANGUAGE = "fr"

# Ontario 2019 H&PE strands. Keyed by the resource's URL slug (path after /fr/).
# strand[0] is the primary alignment. "access" overrides the free default.
CURATION = {
    "ressource-dapprentissage-de-la-petite-enfance": {"strand": ["Active Living", "Healthy Living"]},
    "50-gif-dactivites-physiques-dophea": {"strand": ["Active Living"]},
    "bien-bouger": {"strand": ["Movement Competence"]},
    "favoriser-une-vie-saine-chez-les-eleves-laide-de-lart-dramatique": {"strand": ["Healthy Living"]},
    "ressources-deducation-sur-le-cannabis": {"strand": ["Healthy Living"]},
    "alimenter-la-reflexion-pour-des-choix-plus-sains": {"strand": ["Healthy Living"]},
    "lapq-chaque-jour": {"strand": ["Active Living"]},
    "vitalite": {"strand": ["Movement Competence", "Active Living"]},
    "le-bien-etre-et-ton-portefeuille": {"strand": ["Social-Emotional Learning Skills", "Healthy Living"]},
    "changer-et-grandir-de-always": {"strand": ["Healthy Living"]},
    "recreagir": {"strand": ["Active Living"]},
    "lapprentissage-fonde-sur-lenquete": {"strand": ["Active Living", "Movement Competence", "Healthy Living"]},
    "ressources-deducation-sur-le-vapotage": {"strand": ["Healthy Living"]},
    "ressources-sur-la-securite-sur-internet": {"strand": ["Healthy Living"]},
    "trousse-de-sensibilisation-pour-la-journee-de-la-loi-rowan-pour-les-ecoles": {"strand": ["Healthy Living"]},
    "excursions-virtuelles-gestion-du-stress-et-adaptation": {"strand": ["Social-Emotional Learning Skills"]},
    "les-commotions-cerebrales-guide-de-lenseignant-et-lecon": {"strand": ["Healthy Living"]},
    "trousse-pour-leducation-en-plein-air": {"strand": ["Active Living"]},
    "au-dela-des-murs-activites-pour-lexterieur": {"strand": ["Active Living"]},
    "le-jeu-pour-tous-strategies-pour-des-activites-intra-muros-inclusives": {"strand": ["Active Living"]},
    "la-pedagogie-sensible-et-adaptee-la-culture-en-education-physique-et-sante": {"strand": ["Social-Emotional Learning Skills", "Active Living"]},
    "eps-lapprentissage-en-ligne": {"strand": ["Active Living", "Movement Competence", "Healthy Living"]},
    "le-mouvement-pour-les-personnes-ayant-une-deficience-soutien-pour-leducation-physique-inclusive": {"strand": ["Active Living", "Movement Competence"]},
    "ecoles-affiliees-la-jays-care-foundation": {"strand": ["Active Living"]},
    "ressources-deducation-sur-la-prevention-de-la-violence-fondee-sur-le-genre": {"strand": ["Healthy Living"]},
    # Ophea sells the full curriculum-support packages (membership / purchase).
    "ressources-dappui-deps-elementaire": {"strand": ["Active Living", "Movement Competence", "Healthy Living"], "access": "purchase"},
    "ressources-deps-pour-le-secondaire": {"strand": ["Active Living", "Movement Competence", "Healthy Living"], "access": "purchase"},
    "trousse-pour-leducation-en-plein-air-0": {"strand": ["Active Living"]},
}


def slug_of(url: str) -> str:
    return url.rstrip("/").rsplit("/fr/", 1)[-1]


def snake_case(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")


def grade_band(grades: list) -> str:
    numeric = [g for g in grades if isinstance(g, int)]
    if not numeric:  # K-only resource
        return "primary"
    lo, hi = min(numeric), max(numeric)
    bands = set()
    for g in numeric:
        if g <= 2:
            bands.add("primary")
        elif g <= 5:
            bands.add("junior")
        elif g <= 8:
            bands.add("intermediate")
        else:
            bands.add("senior")
    if len(bands) > 1:
        return "multi"
    return bands.pop()


def parse_grades(cell: str, description: str):
    """Return (grades, truncated_unresolved). Maps French grade labels to ints
    (K for early years), then extends truncated ('...') cells using ranges /
    level keywords found in the description."""
    grades = []

    def add(v):
        if v not in grades:
            grades.append(v)

    truncated = "..." in cell or "…" in cell
    for token in re.split(r"[,/]", cell):
        t = token.strip().lower()
        if not t or t.startswith("..") or t.startswith("…"):
            continue
        if "petite enfance" in t or "maternelle" in t or "jardin" in t:
            add("K")
            continue
        m = re.match(r"(\d+)", t)
        if m:
            add(int(m.group(1)))

    resolved = True
    if truncated:
        resolved = False
        desc = strip_accents(description.lower())
        # Explicit ranges, e.g. "1re a la 12e annee", "9e a 12e annee".
        for lo, hi in re.findall(r"(\d+)\s*re?\s*a\s*(?:la\s+)?(\d+)\s*e?\s*ann", desc):
            for g in range(int(lo), int(hi) + 1):
                add(g)
            resolved = True
        if "maternelle" in desc or "jardin" in desc:
            add("K")
            resolved = True
        if "secondaire" in desc:
            for g in range(9, 13):
                add(g)
            resolved = True
        if "elementaire" in desc or "primaire" in desc:
            for g in range(1, 9):
                add(g)
            resolved = True

    numeric = sorted(g for g in grades if isinstance(g, int))
    ordered = (["K"] if "K" in grades else []) + numeric
    return ordered, (truncated and not resolved)


def map_type_and_modality(cell: str):
    """French resource-format labels -> (resource_type, modality[])."""
    t = cell.lower()
    modality = ["Online"]
    if "vid" in t:
        modality.append("Video")
    if "affiche" in t or "plan de le" in t:
        modality.append("Books & Print Media")
    if "activit" in t or "outil" in t:
        modality.append("Interactive")

    if "vid" in t:
        resource_type = "video"
    elif "activit" in t or "outil" in t:
        resource_type = "interactive"
    elif "affiche" in t or "plan de le" in t:
        resource_type = "print"
    else:
        resource_type = "digital"

    # de-dupe, preserve order
    seen, mod = set(), []
    for m in modality:
        if m not in seen:
            seen.add(m)
            mod.append(m)
    return resource_type, mod


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv", help="Path to the Ophea scrape CSV")
    args = parser.parse_args()

    rows = list(csv.DictReader(Path(args.input_csv).read_text(encoding="utf-8").splitlines()))

    data = json.loads(RESOURCES_PATH.read_text(encoding="utf-8"))
    existing = data["resources"]

    # Backfill the new language field on every pre-existing resource.
    backfilled = 0
    for r in existing:
        if "language" not in r:
            r["language"] = "en"
            backfilled += 1

    seen_urls = {r.get("url") for r in existing}
    max_num = max(
        (
            int(r["id"][2:])
            for r in existing
            if isinstance(r.get("id"), str) and r["id"].startswith("r-") and r["id"][2:].isdigit()
        ),
        default=0,
    )

    added_ids, needs_grade_review = [], []
    for row in rows:
        url = row["url"].strip()
        if url in seen_urls:
            print(f"  = skip (already present): {url}")
            continue
        slug = slug_of(url)
        cur = CURATION.get(slug, {})
        strand = cur.get("strand", ["Healthy Living"])
        if slug not in CURATION:
            print(f"  ! no curation entry for slug '{slug}' -> defaulting strand {strand}")

        grades, unresolved = parse_grades(row["grade_level"], row["description"])
        if unresolved or not grades:
            needs_grade_review.append((url, row["grade_level"]))
        resource_type, modality = map_type_and_modality(row["resource_type"])
        access = cur.get("access", "free")

        max_num += 1
        resource = {
            "id": f"r-{max_num}",
            "topic_title": row["title"].strip(),
            "description": row["description"].strip(),
            "url": url,
            "publisher_creator": PUBLISHER,
            "grade_level": grades,
            "grade_band": grade_band(grades),
            "subject": SUBJECT,
            "language": LANGUAGE,
            "strand": strand,
            "province": "ON",
            "jurisdiction": "ontario",
            "modality": modality,
            "resource_type": resource_type,
            "access_type": access,
            "is_paid": access != "free",
            "curriculum_expectations": [],
            "accessibility": ["No Concerns"],
            "instructional_modes": ["individual", "small-group", "whole-class"],
            "usage_notes": None,
            "alignments": [
                {
                    "jurisdiction": "ontario",
                    "grade": next((g for g in grades if isinstance(g, int)), None),
                    "subject": "health_and_physical_education",
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
        seen_urls.add(url)
        added_ids.append(resource["id"])
        print(f"  + [{resource['id']}] {resource['topic_title']}  grades={grades}")

    data["meta"]["total_count"] = len(existing)
    data["meta"]["generated_at"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    output_json = json.dumps(data, ensure_ascii=False, indent=2)
    for path in (RESOURCES_PATH, DOCS_PATH):
        path.write_text(output_json, encoding="utf-8")
        print(f"  Written -> {path}")

    print(f"\nAdded {len(added_ids)} resources. Backfilled language=en on {backfilled} existing. Total: {len(existing)}")
    if needs_grade_review:
        print("\nGrade list truncated in source / unresolved -- verify these manually:")
        for url, raw in needs_grade_review:
            print(f"  - {raw!r}  {url}")


if __name__ == "__main__":
    main()
