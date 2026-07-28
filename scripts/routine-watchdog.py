#!/usr/bin/env python3
"""
routine-watchdog.py — independent staleness alarm for the nightly routines.

The nightly resource-refresh and link-health jobs run as Claude Code routines
that live in the Claude account, NOT in this repo (see ROUTINES.md). Nothing in
git can see whether they are scheduled, enabled, or pointed at an environment
with web access — so when one silently stops firing, nothing notices. Two of
them sat un-scheduled and never fired once for six weeks; the link-health
browser tier spent the same period recording every URL as `blocked` because its
environment had no egress. Every one of those nights looked like a success.

This script is the outside observer. It never calls a routine and never talks to
the Claude API — it only reads the artefacts the routines are supposed to keep
fresh:

    public/link-health.json   meta.last_run, meta.summary
    public/resources.json     meta.generated_at

That indirection is the whole point: a routine that never executes cannot report
its own absence, so the alarm has to live somewhere that runs independently of
it. GitHub Actions cron is that somewhere.

Usage:

    python scripts/routine-watchdog.py                 # human-readable report
    python scripts/routine-watchdog.py --report r.md   # also write markdown

Exit codes:  0 = everything fresh   1 = at least one finding

No third-party dependencies — stdlib only. No network.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
RESOURCES_PATH = REPO_ROOT / "public" / "resources.json"
LEDGER_PATH = REPO_ROOT / "public" / "link-health.json"

# Link health is meant to run nightly. Two consecutive misses is noise (a paused
# subscription, a slow night); three means it stopped.
DEFAULT_LINK_MAX_AGE = 3

# Resource refresh legitimately adds nothing on a night where the waterfall
# finds nothing worth keeping, so this threshold is deliberately generous. It is
# tuned to catch "the routine is dead", not "last night was quiet".
DEFAULT_RESOURCES_MAX_AGE = 21

# Browser-tier verdicts that represent an actual judgement about a page.
# `blocked` is excluded on purpose: it is what every URL collapses to when the
# environment cannot reach the web at all.
VERDICT_STATUSES = ("live", "dead", "moved")


def parse_iso(stamp: str) -> datetime | None:
    """Parse the YYYY-MM-DDTHH:MM:SSZ stamps both ledgers use."""
    if not stamp:
        return None
    try:
        return datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def age_days(stamp: str, now: datetime) -> float | None:
    parsed = parse_iso(stamp)
    if parsed is None:
        return None
    return (now - parsed).total_seconds() / 86400


def load_json(path: Path) -> dict | None:
    try:
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError):
        return None


class Finding:
    def __init__(self, title: str, detail: str, remedy: str) -> None:
        self.title = title
        self.detail = detail
        self.remedy = remedy

    def as_markdown(self) -> str:
        return f"### {self.title}\n\n{self.detail}\n\n**Fix:** {self.remedy}\n"

    def as_text(self) -> str:
        return f"[FAIL] {self.title}\n       {self.detail}\n       Fix: {self.remedy}"


def check_link_health(now: datetime, max_age: int) -> list[Finding]:
    findings: list[Finding] = []
    ledger = load_json(LEDGER_PATH)

    if ledger is None:
        return [
            Finding(
                "Link-health ledger is missing or unreadable",
                f"`{LEDGER_PATH.relative_to(REPO_ROOT)}` could not be parsed. The "
                "link-health routine writes this file on every run, so an absent "
                "ledger means it has never completed a run against this branch.",
                "Check the link-health routine exists and is scheduled at "
                "https://claude.ai/code/routines (see ROUTINES.md).",
            )
        ]

    meta = ledger.get("meta", {})
    summary = meta.get("summary", {})

    # 1. Did it run at all recently?
    age = age_days(meta.get("last_run", ""), now)
    if age is None:
        findings.append(
            Finding(
                "Link-health ledger has no usable `last_run` timestamp",
                f"`meta.last_run` was `{meta.get('last_run')!r}`, which is not a "
                "timestamp this watchdog can read.",
                "Inspect public/link-health.json; scripts/link-check.py writes "
                "this field on every `apply`.",
            )
        )
    elif age > max_age:
        findings.append(
            Finding(
                f"Link-health routine has not run in {age:.1f} days",
                f"`meta.last_run` is `{meta.get('last_run')}`, which is older than "
                f"the {max_age}-day threshold. This routine is meant to run "
                "nightly. The most common cause is a routine with no cron "
                "expression set — it stays enabled and shows no warning, but "
                "never fires.",
                "Confirm the routine has a **next run** time at "
                "https://claude.ai/code/routines. It should be `30 4 * * *`.",
            )
        )

    # 2. It ran — but did the browser tier actually reach anything?
    #    This is the failure that hid for six weeks: DNS keeps working while
    #    WebFetch is blocked, so the run completes and the ledger fills with
    #    `blocked` rows that look like findings rather than an outage.
    verdicts = sum(int(summary.get(key, 0) or 0) for key in VERDICT_STATUSES)
    blocked = int(summary.get("blocked", 0) or 0)
    if blocked and not verdicts:
        findings.append(
            Finding(
                "Link-health browser tier reached nothing — likely blocked egress",
                f"The ledger holds {blocked} `blocked` URLs and zero "
                f"{'/'.join(VERDICT_STATUSES)} verdicts. A working run classifies "
                "most URLs as `live` with a small `blocked` tail from genuine "
                "bot-walls. Zero verdicts means WebFetch never reached any page, "
                "so this run is not evidence about a single link.",
                "The routine's environment is blocking outbound HTTPS. Raise its "
                "network access level so general web hosts are reachable — see "
                "the egress prerequisite in ROUTINES.md.",
            )
        )

    return findings


def check_resources(now: datetime, max_age: int) -> list[Finding]:
    resources = load_json(RESOURCES_PATH)

    if resources is None:
        return [
            Finding(
                "Resource library is missing or unreadable",
                f"`{RESOURCES_PATH.relative_to(REPO_ROOT)}` could not be parsed.",
                "This file is the app's canonical data store — restore it before "
                "worrying about the routines.",
            )
        ]

    meta = resources.get("meta", {})
    age = age_days(meta.get("generated_at", ""), now)

    if age is None:
        return [
            Finding(
                "Resource library has no usable `generated_at` timestamp",
                f"`meta.generated_at` was `{meta.get('generated_at')!r}`.",
                "The refresh-resources skill sets this on every append (Stage 4).",
            )
        ]

    if age > max_age:
        return [
            Finding(
                f"Resource library has not grown in {age:.1f} days",
                f"`meta.generated_at` is `{meta.get('generated_at')}` with "
                f"{meta.get('total_count', '?')} resources, older than the "
                f"{max_age}-day threshold. An occasional empty night is normal — "
                "three weeks of them is not. Note that a blocked environment "
                "reports the same 'nothing found' result as a genuinely quiet "
                "night, which is why this check exists.",
                "Confirm the resource-refresh routine has a **next run** time at "
                "https://claude.ai/code/routines, and that its environment has "
                "web egress (see ROUTINES.md).",
            )
        ]

    return []


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Alarm for nightly routines that have silently stopped working."
    )
    parser.add_argument(
        "--link-max-age",
        type=int,
        default=DEFAULT_LINK_MAX_AGE,
        help=f"days before a missing link-health run is a finding "
        f"(default {DEFAULT_LINK_MAX_AGE})",
    )
    parser.add_argument(
        "--resources-max-age",
        type=int,
        default=DEFAULT_RESOURCES_MAX_AGE,
        help=f"days before a static resource library is a finding "
        f"(default {DEFAULT_RESOURCES_MAX_AGE})",
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="also write a markdown report here (for the watchdog issue body)",
    )
    args = parser.parse_args()

    now = datetime.now(timezone.utc)
    findings = check_link_health(now, args.link_max_age)
    findings += check_resources(now, args.resources_max_age)

    stamp = now.strftime("%Y-%m-%d %H:%M UTC")

    if not findings:
        print(f"ROUTINE WATCHDOG {stamp} — all clear")
        print("  link-health ledger and resource library are both fresh.")
        if args.report:
            args.report.write_text(
                f"All clear as of {stamp}. Both the link-health ledger and the "
                "resource library are fresh.\n",
                encoding="utf-8",
            )
        return 0

    print(f"ROUTINE WATCHDOG {stamp} — {len(findings)} finding(s)")
    for finding in findings:
        print(finding.as_text())

    if args.report:
        body = [
            "The nightly routines live in the Claude account, not in this repo, "
            "so this workflow watches the files they are supposed to keep fresh. "
            "Each finding below means an artefact went stale — the routine that "
            "maintains it has most likely stopped running.",
            "",
            f"_Checked {stamp}._",
            "",
        ]
        body += [finding.as_markdown() for finding in findings]
        body.append(
            "---\n\nThis issue is maintained by "
            "`.github/workflows/routine-watchdog.yml` and updated in place on "
            "each run. It closes itself once every check passes again."
        )
        args.report.write_text("\n".join(body), encoding="utf-8")

    return 1


if __name__ == "__main__":
    sys.exit(main())
