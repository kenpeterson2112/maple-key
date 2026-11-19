#!/usr/bin/env python3
"""
Fetch the Ontario elementary curriculum (strands, overall and specific
expectations) from the Ministry's public curriculum content service and write
it as static JSON the app loads on demand.

Source: the content API behind https://www.dcp.edu.gov.on.ca (the Ontario
Curriculum and Resources site). It is a headless CMS: each grade is an
`l2___course`, which links down to `l3___strand` → `l4___overall_expectation`
→ `l5___specific_expectation`. Codenames in that CMS are unstable (copies of
copies), so this script never names a strand or expectation by codename — it
walks each course's links and reads the codes (`title_index`) the curriculum
itself prints.

Output (one province/language root per folder, so French or another province
is a new folder, not a new format):

  public/curriculum/<province>/<lang>/<subject-slug>/g<grade>.json
      Full text, fetched by the client only when that subject/grade is open.
  src/data/curriculum/<province>.<lang>.outline.json
      Strand labels, overall titles and every expectation code for each
      subject/grade, without the text. Small, bundled, read synchronously
      (labels, filter dropdowns, coverage denominators).

Usage:
  python3 scripts/fetch-curriculum.py                # Ontario, English, K-8
  python3 scripts/fetch-curriculum.py --subject Math --grade 6
  python3 scripts/fetch-curriculum.py --lang fr      # once French is wanted

Stdlib + requests only; no API key.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).parent.parent
PUBLIC_ROOT = REPO_ROOT / "public" / "curriculum"
OUTLINE_ROOT = REPO_ROOT / "src" / "data" / "curriculum"

API = "https://ws.api.dcp.edu.gov.on.ca/content/api/items"
SITE = "https://www.dcp.edu.gov.on.ca"
LANGS = {"en": "en-CA", "fr": "fr-CA"}
PROVINCE = "on"

# Subject (the app's vocabulary in schema/resource-schema.json) → how to find
# its grade courses. `curriculum` is the L1 codename the elementary courses are
# part_of; `name` narrows a shared L1 (Social Studies / History / Geography
# share one); `program` picks an FSL language program. `secondary` maps a
# Grade 9-12 grade to the Ontario course code that stands for it (secondary is
# organised by course: Grade 9 Math is MTH1W). Slugs are file-system names.
SUBJECTS: dict[str, dict] = {
    "Math": {"slug": "math", "curriculum": "elementary___mathematics___digital", "grades": range(1, 9), "secondary": {9: "MTH1W"}},
    "Science": {"slug": "science", "curriculum": "elementary___science_and_technology__digital_", "grades": range(1, 9), "secondary": {9: "SNC1W"}},
    "Language": {"slug": "language", "curriculum": "elementary___language___francais__2006____digital_", "grades": range(1, 9), "secondary": {9: "ENL1W"}},
    "Health & Physical Education": {"slug": "health-pe", "curriculum": "elementary___health_and_physical_education", "grades": range(1, 9), "secondary": {9: "PPL1O"}},
    "FSL": {"slug": "fsl", "curriculum": "elementary___french_as_a_second_language__digital_", "program": "core_french", "grades": range(4, 9), "secondary": {9: "FSF1D"}},
    "Social Studies": {"slug": "social-studies", "curriculum": "elementary___social_studies__history_and_geography_685274f", "name": "Social Studies", "grades": range(1, 7)},
    "History": {"slug": "history", "curriculum": "elementary___social_studies__history_and_geography_685274f", "name": "History", "grades": range(7, 9)},
    "Geography": {"slug": "geography", "curriculum": "elementary___social_studies__history_and_geography_685274f", "name": "Geography", "grades": range(7, 9), "secondary": {9: "CGC1W"}},
}


def grades_of(spec: dict) -> list[int]:
    return [*spec["grades"], *sorted(spec.get("secondary", {}))]


session = requests.Session()
session.headers["User-Agent"] = "curriculum-fetch/1.0"


def get(url: str, params: dict) -> dict:
    for attempt in range(4):
        try:
            r = session.get(url, params=params, timeout=120)
            r.raise_for_status()
            return r.json()
        except requests.RequestException as exc:
            if attempt == 3:
                raise
            wait = 2 ** attempt * 2
            print(f"  retry in {wait}s ({exc})", file=sys.stderr)
            time.sleep(wait)
    raise AssertionError("unreachable")


def plain(rich: str) -> str:
    """Rich-text HTML → one line of plain text (keeps the e.g. examples)."""
    text = re.sub(r"<object[^>]*>.*?</object>", " ", rich or "", flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text).replace(" ", " ")
    return re.sub(r"\s+", " ", text).strip()


def val(item: dict, field: str):
    return item["elements"].get(field, {}).get("value")


def list_courses(lang: str) -> list[dict]:
    data = get(API, {
        "system.type": "l2___course",
        "language": LANGS[lang],
        "system.language[eq]": LANGS[lang],
        "depth": 0,
        "limit": 2000,
    })
    return data["items"]


def find_course(courses: list[dict], spec: dict, grade: int) -> dict:
    matches = []
    course_code = spec.get("secondary", {}).get(grade)
    for c in courses:
        if course_code:
            # The course page itself, not its PDF twin (slug "<code>-pdf").
            if (val(c, "code") or "") == course_code and val(c, "course_slug") == course_code.lower():
                matches.append(c)
            continue
        if spec["curriculum"] not in (val(c, "part_of") or []):
            continue
        if [g["codename"] for g in val(c, "site___grade") or []] != [f"n{grade}"]:
            continue
        if "name" in spec and not (val(c, "name") or "").startswith(spec["name"]):
            continue
        if "program" in spec and spec["program"] not in [p["codename"] for p in val(c, "site___language_program") or []]:
            continue
        matches.append(c)
    if len(matches) != 1:
        names = [m["system"]["codename"] for m in matches]
        raise SystemExit(f"expected one course for {spec} grade {grade}, found {names}")
    return matches[0]


def fetch_course_tree(codename: str, lang: str) -> tuple[dict, dict]:
    data = get(f"{API}/{codename}", {"language": LANGS[lang], "depth": 8})
    return data["item"], data["modular_content"]


def collect_strands(course: dict, mc: dict) -> list[dict]:
    """Walk `sections` links depth-first until reaching strands, in page order."""
    out: list[dict] = []
    seen: set[str] = set()

    def walk(codenames: list[str]) -> None:
        for cn in codenames:
            item = mc.get(cn)
            if item is None or cn in seen:
                continue
            seen.add(cn)
            if item["system"]["type"] == "l3___strand":
                out.append(item)
            elif isinstance(val(item, "sections"), list):
                walk(val(item, "sections"))

    walk(val(course, "sections") or [])
    return out


def resolve(mc: dict, codename: str, lang: str) -> dict:
    """Items past the depth limit aren't inlined; fetch those individually."""
    if codename not in mc:
        data = get(f"{API}/{codename}", {"language": LANGS[lang], "depth": 0})
        mc[codename] = data["item"]
    return mc[codename]


def build(subject: str, grade: int, courses: list[dict], lang: str) -> dict:
    spec = SUBJECTS[subject]
    course = find_course(courses, spec, grade)
    course, mc = fetch_course_tree(course["system"]["codename"], lang)
    strands = []
    for s in collect_strands(course, mc):
        overalls = []
        for ocn in val(s, "overall_expectations") or []:
            o = resolve(mc, ocn, lang)
            specifics = []
            for scn in val(o, "specific_expectations") or []:
                sp = resolve(mc, scn, lang)
                # Some "specifics" are explanatory blocks (Math A1's SEL table,
                # C4's modelling note) with no code: not expectations.
                if not (val(sp, "title_index") or "").strip():
                    continue
                specifics.append({
                    "code": (val(sp, "title_index") or "").strip(),
                    "topic": (val(sp, "title") or "").strip(),
                    "text": plain(val(sp, "content")),
                })
            overalls.append({
                "code": (val(o, "title_index") or "").strip(),
                "title": (val(o, "title") or "").strip(),
                "text": plain(val(o, "content")),
                "specifics": specifics,
            })
        strands.append({
            "code": (val(s, "title_index") or "").strip(),
            "label": (val(s, "title") or "").strip(),
            "overalls": overalls,
        })
    if not strands:
        raise SystemExit(f"no strands found for {subject} grade {grade}")
    for s in strands:
        if not s["code"]:
            raise SystemExit(f"{subject} grade {grade}: a strand has no code: {s['label']}")
    slug = val(course, "course_slug")
    l1 = (val(course, "part_of") or [""])[0]
    return {
        "province": PROVINCE.upper(),
        "language": lang,
        "subject": subject,
        "grade": str(grade),
        "course_name": val(course, "name"),
        "course_code": val(course, "code") or None,
        "source": {
            "publisher": "Ontario Ministry of Education",
            "url": f"{SITE}/{'en' if lang == 'en' else 'fr'}/curriculum/{curriculum_slug(l1)}/grades/{slug}" if curriculum_slug(l1) else SITE,
            "course_codename": course["system"]["codename"],
            "last_modified": course["system"]["last_modified"],
        },
        "strands": strands,
    }


# URL path segments for the public site, for the "source" link only.
CURRICULUM_SLUGS = {
    "elementary___mathematics___digital": "elementary-math",
    "elementary___science_and_technology__digital_": "elementary-sci-tech",
    "elementary___language___francais__2006____digital_": "elementary-language",
    "elementary___health_and_physical_education": "elementary-health-physical-education",
    "elementary___french_as_a_second_language__digital_": "elementary-fsl",
    "elementary___social_studies__history_and_geography_685274f": "elementary-sshg",
}


def curriculum_slug(l1: str) -> str:
    return CURRICULUM_SLUGS.get(l1, "")


def outline_of(doc: dict) -> dict:
    return {
        "strands": [
            {
                "code": s["code"],
                "label": s["label"],
                "overalls": [
                    {"code": o["code"], "title": o["title"], "specifics": [sp["code"] for sp in o["specifics"]]}
                    for o in s["overalls"]
                ],
            }
            for s in doc["strands"]
        ],
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--lang", choices=sorted(LANGS), default="en")
    ap.add_argument("--subject", choices=sorted(SUBJECTS))
    ap.add_argument("--grade", type=int)
    args = ap.parse_args()

    courses = list_courses(args.lang)
    outline_path = OUTLINE_ROOT / f"{PROVINCE}.{args.lang}.outline.json"
    outline = json.loads(outline_path.read_text()) if outline_path.exists() else {}
    outline.setdefault("province", PROVINCE.upper())
    outline.setdefault("language", args.lang)
    outline.setdefault("subjects", {})

    for subject, spec in SUBJECTS.items():
        if args.subject and subject != args.subject:
            continue
        for grade in grades_of(spec):
            if args.grade and grade != args.grade:
                continue
            doc = build(subject, grade, courses, args.lang)
            n_o = sum(len(s["overalls"]) for s in doc["strands"])
            n_s = sum(len(o["specifics"]) for s in doc["strands"] for o in s["overalls"])
            out = PUBLIC_ROOT / PROVINCE / args.lang / spec["slug"] / f"g{grade}.json"
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
            entry = outline["subjects"].setdefault(subject, {"slug": spec["slug"], "grades": {}})
            entry["slug"] = spec["slug"]
            entry["grades"][str(grade)] = outline_of(doc)
            print(f"{subject:28} G{grade}: {len(doc['strands'])} strands, {n_o} overall, {n_s} specific")

    # Stable ordering so reruns produce minimal diffs.
    for entry in outline["subjects"].values():
        entry["grades"] = dict(sorted(entry["grades"].items(), key=lambda kv: int(kv[0])))
    outline["subjects"] = {k: outline["subjects"][k] for k in SUBJECTS if k in outline["subjects"]}
    outline_path.parent.mkdir(parents=True, exist_ok=True)
    outline_path.write_text(json.dumps(outline, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"wrote {outline_path.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
