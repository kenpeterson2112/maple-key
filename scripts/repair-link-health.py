#!/usr/bin/env python3
"""
repair-link-health.py — reset link-health verdicts produced by a broken egress
environment back to `unchecked`.

Why this exists
---------------
The nightly link-health routine records a `blocked` verdict when its WebFetch
call fails. When the *environment's own* egress is denied, every fetch in the run
fails, so the routine writes `blocked` against hundreds of perfectly live sites.
ROUTINES.md calls this out: a summary with `blocked` in the hundreds and zero
`live` is the signature of blocked egress, not of bad links.

Those rows are worse than missing data. They look like findings, they sort into
any review queue built over the ledger, and they hide the real breakage.

What counts as corrupted
------------------------
The unit of corruption is a **run**, not a row. A single row's `reason` cannot be
trusted to tell the difference: a genuine bot-wall and a proxy denial both read
"HTTP 403 Forbidden". But a whole run that produced *no* `live`, `dead` or
`moved` verdict while producing `blocked`/`error` ones did not reach the open web
at all, so every browser-tier verdict in it is void.

That rule is deliberately run-scoped so it stays correct in the future: a healthy
run that finds a handful of genuine bot-walls among many `live` results is left
completely alone.

Tier-0 verdicts (`dead_domain`, `invalid`) come from local DNS and URL lint, not
from the network egress path, so they are never touched.

Usage
-----
    python3 scripts/repair-link-health.py            # report only
    python3 scripts/repair-link-health.py --apply    # rewrite the ledger

No third-party dependencies. No network access required.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# public/ is authoritative; docs/ is the GitHub Pages mirror and is only written
# if it already exists (same convention as the other writers in this directory).
OUTPUTS = [
    REPO_ROOT / "public" / "link-health.json",
    REPO_ROOT / "docs" / "link-health.json",
]

# Verdicts that come from the browser tier, i.e. through the egress path.
BROWSER_VERDICTS = {"live", "dead", "moved", "blocked", "error"}
# Browser verdicts that prove the run actually reached the open web.
REACHED_WEB = {"live", "dead", "moved"}
# The self-inflicted ones — what we reset when the run is judged corrupted.
SELF_INFLICTED = {"blocked", "error"}


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def run_key(entry: dict) -> str:
    """Rows written by one run share a `last_checked` stamp."""
    return str(entry.get("last_checked") or "never")


def classify_runs(links: dict) -> dict[str, dict]:
    """Group browser-tier rows by run and decide which runs are void."""
    runs: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for entry in links.values():
        status = entry.get("status")
        if status in BROWSER_VERDICTS:
            runs[run_key(entry)][status] += 1

    verdict: dict[str, dict] = {}
    for stamp, counts in runs.items():
        reached = sum(counts[s] for s in REACHED_WEB)
        self_inflicted = sum(counts[s] for s in SELF_INFLICTED)
        verdict[stamp] = {
            "counts": dict(sorted(counts.items())),
            "reached_web": reached,
            "self_inflicted": self_inflicted,
            # Void iff the run recorded failures but never once reached the web.
            "void": reached == 0 and self_inflicted > 0,
        }
    return verdict


def reset_entry(entry: dict) -> None:
    """Return a row to the same shape `link-check.py` gives an unchecked URL."""
    entry["status"] = "unchecked"
    entry["reason"] = ""
    entry["final_url"] = None
    entry["last_checked"] = None
    entry["first_flagged"] = None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Reset link-health verdicts recorded by runs with no web egress."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="rewrite the ledger (default is a report only)",
    )
    args = parser.parse_args()

    ledger_path = OUTPUTS[0]
    if not ledger_path.exists():
        sys.exit(f"ERROR: no ledger at {ledger_path}")

    ledger = load_json(ledger_path)
    links = ledger.get("links", {})
    if not links:
        sys.exit(f"ERROR: ledger at {ledger_path} has no `links`")

    runs = classify_runs(links)

    print("=" * 72)
    print("LINK-HEALTH LEDGER REPAIR")
    print("=" * 72)
    print(f"ledger: {ledger_path.relative_to(REPO_ROOT)}  ({len(links)} rows)")
    print(f"before: {json.dumps(ledger.get('meta', {}).get('summary', {}), sort_keys=True)}")
    print()
    print("Browser-tier runs found in the ledger:")
    print()
    print(f"{'run (last_checked)':<24} {'reached web':>11} {'failed':>7}  verdict")
    print("-" * 72)
    for stamp in sorted(runs):
        info = runs[stamp]
        label = "VOID — no egress" if info["void"] else "kept"
        print(
            f"{stamp:<24} {info['reached_web']:>11} {info['self_inflicted']:>7}  {label}"
        )
    print()

    void_runs = {s for s, i in runs.items() if i["void"]}
    if not void_runs:
        print("Nothing to repair: every run that recorded a failure also reached the web.")
        return 0

    # Collect the rows to reset, with a per-host tally so the report shows what
    # was being mislabelled rather than just a count.
    to_reset = [
        (url, entry)
        for url, entry in links.items()
        if entry.get("status") in SELF_INFLICTED and run_key(entry) in void_runs
    ]
    by_host: dict[str, int] = defaultdict(int)
    for _, entry in to_reset:
        by_host[entry.get("host") or "(no host)"] += 1

    print(f"Rows to reset to `unchecked`: {len(to_reset)} across {len(by_host)} hosts")
    print("Most-affected hosts:")
    for host, count in sorted(by_host.items(), key=lambda kv: (-kv[1], kv[0]))[:10]:
        print(f"  {count:>4}  {host}")
    print()

    preserved = {
        status: sum(1 for e in links.values() if e.get("status") == status)
        for status in ("dead_domain", "invalid", "dead", "moved", "live")
    }
    print("Preserved untouched (tier-0 and genuine findings):")
    for status, count in preserved.items():
        if count:
            print(f"  {count:>4}  {status}")
    print()

    if not args.apply:
        print("Report only — re-run with --apply to rewrite the ledger.")
        return 0

    for _, entry in to_reset:
        reset_entry(entry)

    summary: dict[str, int] = defaultdict(int)
    for entry in links.values():
        summary[entry["status"]] += 1
    ledger.setdefault("meta", {})["summary"] = dict(sorted(summary.items()))
    # `last_run` is deliberately left alone. This repair is not a check, and
    # routine-watchdog.py reads that field to decide whether the routine is
    # still firing — refreshing it here would silence that alarm with a lie.

    for path in OUTPUTS:
        if path.exists() or path == OUTPUTS[0]:
            write_json(path, ledger)
            print(f"wrote {path.relative_to(REPO_ROOT)}")

    print()
    print(f"after:  {json.dumps(ledger['meta']['summary'], sort_keys=True)}")
    print(f"reset {len(to_reset)} rows from {len(void_runs)} void run(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
