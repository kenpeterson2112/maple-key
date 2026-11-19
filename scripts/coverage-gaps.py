#!/usr/bin/env python3
"""
coverage-gaps.py
Which Ontario specific expectations have no resource in the catalogue.

For each subject and grade, walks every specific expectation in the curriculum
outline (src/data/curriculum/on.en.outline.json) and counts the resources in
public/resources.json that tag it: same subject, the grade in `grade_level`,
the code in `curriculum_expectations`. Suppressed records, collections and
resources whose link the site itself reported dead are left out (pass
--include-dead to count those links anyway).

A resource tagged for several grades carries one list of codes, and codes
repeat across grades with different meanings (Grade 6 B1.1 is not Grade 7
B1.1). So an expectation covered only by multi-grade resources may really be
covered by a neighbouring grade's resource; those are reported apart as
"multi-grade only" and are worth checking before they count as filled.

    python3 scripts/coverage-gaps.py                       # summary, Gr 6-8, the four core subjects
    python3 scripts/coverage-gaps.py --gaps                # plus every gap code
    python3 scripts/coverage-gaps.py --gaps --wording      # plus each gap's curriculum wording
    python3 scripts/coverage-gaps.py --subjects Math --grades 6 --gaps --multi
    python3 scripts/coverage-gaps.py --json coverage.json  # per-expectation counts, for a chart

Read-only: never writes to resources.json.
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _schema  # noqa: E402

REPO_ROOT = Path(__file__).parent.parent
RESOURCES = REPO_ROOT / "public" / "resources.json"
OUTLINE = REPO_ROOT / "src" / "data" / "curriculum" / "on.en.outline.json"
TEXT_DIR = REPO_ROOT / "public" / "curriculum" / "on" / "en"

# Link verdicts about the resource itself (the site said so). `blocked` and
# `error` are about our request and never mean the resource is gone; `moved`
# still reaches a page. See the link_status comment in the schema.
DEAD_VERDICTS = {"dead", "dead_domain", "invalid"}
assert DEAD_VERDICTS <= set(_schema.LINK_STATUSES), "link_status vocabulary changed; update DEAD_VERDICTS"

# Social Studies stops at Grade 6; History and Geography take over in 7-8.
DEFAULT_SUBJECTS = ["Math", "Science", "Language", "Social Studies", "History", "Geography"]
DEFAULT_GRADES = ["6", "7", "8"]


def grades_of(resource: dict) -> set[str]:
    return {str(g) for g in resource.get("grade_level") or []}


def counts_toward(resource: dict, include_dead: bool) -> bool:
    if resource.get("suppressed") or resource.get("is_collection"):
        return False
    status = (resource.get("metadata") or {}).get("link_status")
    return include_dead or status not in DEAD_VERDICTS


def wording(slug: str, grade: str) -> dict[str, str]:
    path = TEXT_DIR / slug / f"g{grade}.json"
    if not path.exists():
        return {}
    doc = json.loads(path.read_text(encoding="utf-8"))
    return {
        sp["code"]: " ".join(sp["text"].replace(" ,", ",").split())
        for s in doc["strands"]
        for o in s["overalls"]
        for sp in o["specifics"]
    }


def build(subjects: list[str], grades: list[str], include_dead: bool, with_text: bool) -> list[dict]:
    resources = json.loads(RESOURCES.read_text(encoding="utf-8"))["resources"]
    outline = json.loads(OUTLINE.read_text(encoding="utf-8"))["subjects"]
    report = []
    for subject in subjects:
        if subject not in outline:
            print(f"warning: no curriculum outline for {subject}", file=sys.stderr)
            continue
        for grade in grades:
            strands = outline[subject]["grades"].get(grade, {}).get("strands")
            if not strands:
                continue  # e.g. Social Studies has no Grade 7; History covers it
            # code -> [counted, counted single-grade, excluded]
            tally: dict[str, list[int]] = {}
            for r in resources:
                if r.get("subject") != subject or grade not in grades_of(r):
                    continue
                ok = counts_toward(r, include_dead)
                single = len(grades_of(r)) == 1
                for code in r.get("curriculum_expectations") or []:
                    t = tally.setdefault(code, [0, 0, 0])
                    if ok:
                        t[0] += 1
                        t[1] += single
                    else:
                        t[2] += 1
            text = wording(outline[subject]["slug"], grade) if with_text else {}
            out_strands = []
            for s in strands:
                overalls = []
                for o in s["overalls"]:
                    if not o["specifics"]:
                        continue  # ongoing processes (Math's A strand) have nothing to tag
                    specifics = []
                    for code in o["specifics"]:
                        n, single, excluded = tally.get(code, [0, 0, 0])
                        sp = {"code": code, "n": n, "single": single, "excluded": excluded}
                        if code in text:
                            sp["text"] = text[code]
                        specifics.append(sp)
                    overalls.append({"code": o["code"], "title": o["title"], "specifics": specifics})
                if overalls:
                    out_strands.append({"code": s["code"], "label": s["label"], "overalls": overalls})
            report.append({"subject": subject, "grade": grade, "strands": out_strands})
    return report


def specifics(entry: dict) -> list[dict]:
    return [sp for s in entry["strands"] for o in s["overalls"] for sp in o["specifics"]]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--subjects", nargs="+", default=DEFAULT_SUBJECTS, metavar="SUBJECT")
    ap.add_argument("--grades", nargs="+", default=DEFAULT_GRADES, metavar="GRADE")
    ap.add_argument("--gaps", action="store_true", help="list the expectations with no resource")
    ap.add_argument("--multi", action="store_true", help="also list those covered only by multi-grade resources")
    ap.add_argument("--wording", action="store_true", help="print each listed expectation's curriculum wording")
    ap.add_argument("--include-dead", action="store_true", help="count resources whose link is dead")
    ap.add_argument("--json", type=Path, metavar="PATH", help="write per-expectation counts (with wording) as JSON")
    args = ap.parse_args()

    unknown = [s for s in args.subjects if s not in _schema.SUBJECTS]
    if unknown:
        ap.error(f"unknown subject(s): {', '.join(unknown)}. Choose from: {', '.join(_schema.SUBJECTS)}")

    report = build(args.subjects, args.grades, args.include_dead, with_text=bool(args.wording or args.json))

    print(f"{'Subject':<16}{'Grade':>5}{'Total':>7}{'Solid':>7}{'Multi':>7}{'Gaps':>6}")
    for e in report:
        sp = specifics(e)
        gaps = sum(1 for x in sp if x["n"] == 0)
        multi = sum(1 for x in sp if x["n"] > 0 and x["single"] == 0)
        print(f"{e['subject']:<16}{e['grade']:>5}{len(sp):>7}{len(sp) - gaps - multi:>7}{multi:>7}{gaps:>6}")
    print("\nSolid: a resource for this grade alone. Multi: only resources tagged for several grades.")

    if args.gaps or args.multi:
        for e in report:
            sp = specifics(e)
            lists = [("No resource", [x for x in sp if x["n"] == 0])] if args.gaps else []
            if args.multi:
                lists.append(("Multi-grade only", [x for x in sp if x["n"] > 0 and x["single"] == 0]))
            for label, items in lists:
                if not items:
                    continue
                print(f"\n{e['subject']} Grade {e['grade']} - {label} ({len(items)})")
                if args.wording:
                    for x in items:
                        print(f"  {x['code']:<7} {x.get('text', '')}")
                else:
                    print("  " + ", ".join(x["code"] for x in items))

    if args.json:
        args.json.write_text(json.dumps(report, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"\nWrote {args.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
