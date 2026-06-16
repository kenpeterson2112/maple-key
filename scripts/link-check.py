#!/usr/bin/env python3
"""
link-check.py — deterministic plumbing for the nightly link-health routine.

This script does the parts that DON'T need an LLM (and so cost nothing against
the Claude subscription):
  * URL lint + DNS resolution over every resource (catches dead *domains* and
    malformed URLs with zero false positives).
  * Date-sharded rotation: each night a deterministic ~1/CYCLE slice of the
    DNS-resolving URLs is queued for a browser-grade check, so the whole
    database is covered every CYCLE nights without any persisted cursor.
  * Ledger bookkeeping in public/link-health.json.

The browser-grade check itself (the part that defeats bot-walls) is done by
Claude via WebFetch in the `check-links` skill — NOT here. This script only
selects what to fetch and records what came back.

Two phases:

    python scripts/link-check.py select --out /tmp/lc-plan.json
        -> DNS-sweeps everything, picks tonight's browser queue, writes a plan.

    # ... the skill WebFetches plan["queue"] and writes results JSON ...

    python scripts/link-check.py apply --plan /tmp/lc-plan.json \
        --results /tmp/lc-results.json
        -> merges tier-0 + browser results into public/link-health.json and
           prints a markdown summary of what is broken this run.

No third-party dependencies — stdlib only. DNS needs outbound network.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import socket
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parent.parent
RESOURCES_PATH = REPO_ROOT / "public" / "resources.json"
LEDGER_PATH = REPO_ROOT / "public" / "link-health.json"

DNS_TIMEOUT = 5
socket.setdefaulttimeout(DNS_TIMEOUT)

# Statuses we treat as "broken / needs a human" when reporting.
ACTIONABLE = {"dead", "dead_domain", "invalid", "moved"}
# Re-check these first when they fall in tonight's shard.
RECHECK_FIRST = {"dead", "moved", "blocked", "error"}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def shard_of(url: str, cycle: int) -> int:
    """Stable (unsalted) shard assignment so rotation needs no stored cursor."""
    digest = hashlib.md5(url.encode("utf-8")).hexdigest()
    return int(digest, 16) % cycle


def todays_shard(cycle: int) -> int:
    return int(time.time() // 86400) % cycle


def lint(url: str) -> str | None:
    """Return an issue code for a structurally invalid URL, else None."""
    if not url:
        return "missing_url"
    if not url.startswith(("http://", "https://")):
        return "missing_scheme"
    try:
        if not urlparse(url).netloc:
            return "malformed_url"
    except ValueError:
        return "malformed_url"
    return None


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_resource_urls() -> dict[str, dict]:
    """url -> {id, title, host}; first occurrence wins (dupes handled elsewhere)."""
    data = load_json(RESOURCES_PATH)
    out: dict[str, dict] = {}
    for r in data.get("resources", []):
        url = (r.get("url") or "").strip()
        if url and url not in out:
            out[url] = {
                "id": r.get("id", ""),
                "title": r.get("topic_title", ""),
                "host": (urlparse(url).hostname or "") if url.startswith(("http://", "https://")) else "",
            }
    return out


def load_ledger() -> dict:
    if LEDGER_PATH.exists():
        led = load_json(LEDGER_PATH)
        led.setdefault("meta", {})
        led.setdefault("links", {})
        return led
    return {"meta": {}, "links": {}}


def blank_entry(info: dict) -> dict:
    return {
        "id": info["id"],
        "title": info["title"],
        "host": info["host"],
        "status": "unchecked",
        "reason": "",
        "final_url": None,
        "last_checked": None,
        "first_flagged": None,
    }


# ── select ──────────────────────────────────────────────────────────────────

def cmd_select(args: argparse.Namespace) -> None:
    cycle = args.cycle
    urls = load_resource_urls()
    ledger = load_ledger()

    shard = todays_shard(cycle)
    print(f"[select] {len(urls)} URLs | cycle={cycle} | tonight's shard={shard}")

    # Tier 0: lint + DNS (cache by host so 1,730 URLs => ~one lookup per host).
    dns_cache: dict[str, bool] = {}
    invalid: list[dict] = []
    dead_domain: list[dict] = []
    resolves: dict[str, bool] = {}

    for url, info in urls.items():
        code = lint(url)
        if code:
            invalid.append({"url": url, "id": info["id"], "title": info["title"], "code": code})
            resolves[url] = False
            continue
        host = info["host"]
        if host not in dns_cache:
            try:
                socket.gethostbyname(host)
                dns_cache[host] = True
            except (socket.gaierror, socket.timeout, UnicodeError, OSError):
                dns_cache[host] = False
        ok = dns_cache[host]
        resolves[url] = ok
        if not ok:
            dead_domain.append({"url": url, "id": info["id"], "title": info["title"], "host": host})

    print(f"[select] tier-0: {len(invalid)} invalid, {len(dead_domain)} dead domain(s)")

    # Browser queue: DNS-resolving URLs that fall in tonight's shard.
    eligible = [u for u in urls if resolves.get(u) and shard_of(u, cycle) == shard]

    def sort_key(u: str) -> tuple[int, str]:
        prev = ledger["links"].get(u, {})
        prio = 0 if prev.get("status") in RECHECK_FIRST else (1 if prev.get("status") in ("unchecked", None) else 2)
        return (prio, prev.get("last_checked") or "")

    eligible.sort(key=sort_key)

    queue: list[dict] = []
    per_host: dict[str, int] = {}
    for u in eligible:
        host = urls[u]["host"]
        if per_host.get(host, 0) >= args.per_host_cap:
            continue
        queue.append({"url": u, "id": urls[u]["id"], "title": urls[u]["title"], "host": host})
        per_host[host] = per_host.get(host, 0) + 1
        if len(queue) >= args.max_budget:
            break

    print(f"[select] {len(eligible)} URLs in tonight's shard; queued {len(queue)} "
          f"for browser check (per-host cap {args.per_host_cap}, budget {args.max_budget})")

    plan = {
        "generated_at": now_iso(),
        "cycle_days": cycle,
        "shard": shard,
        "total_urls": len(urls),
        "tier0": {"invalid": invalid, "dead_domain": dead_domain},
        "queue": queue,
    }
    out_path = Path(args.out)
    write_json(out_path, plan)
    print(f"[select] wrote plan -> {out_path}")


# ── apply ───────────────────────────────────────────────────────────────────

def cmd_apply(args: argparse.Namespace) -> None:
    plan = load_json(Path(args.plan))
    results = load_json(Path(args.results)) if Path(args.results).exists() else []
    if not isinstance(results, list):
        sys.exit("ERROR: results file must be a JSON array")

    urls = load_resource_urls()
    ledger = load_ledger()
    links = ledger["links"]
    stamp = now_iso()

    # Keep the ledger in sync with the current resource set.
    for url, info in urls.items():
        links.setdefault(url, blank_entry(info))
        links[url].update(id=info["id"], title=info["title"], host=info["host"])
    for stale in [u for u in links if u not in urls]:
        del links[stale]

    def set_status(url: str, status: str, reason: str, final_url: str | None = None) -> None:
        e = links.setdefault(url, blank_entry(urls.get(url, {"id": "", "title": "", "host": ""})))
        e["status"] = status
        e["reason"] = reason
        e["final_url"] = final_url
        e["last_checked"] = stamp
        if status in ACTIONABLE or status in ("blocked", "error"):
            e["first_flagged"] = e.get("first_flagged") or stamp
        else:  # recovered / live
            e["first_flagged"] = None

    checked_this_run: list[str] = []

    for it in plan.get("tier0", {}).get("invalid", []):
        set_status(it["url"], "invalid", f"lint: {it['code']}")
        checked_this_run.append(it["url"])
    for it in plan.get("tier0", {}).get("dead_domain", []):
        set_status(it["url"], "dead_domain", "domain does not resolve (DNS)")
        checked_this_run.append(it["url"])

    valid_statuses = {"live", "dead", "moved", "blocked", "error"}
    for r in results:
        url = r.get("url")
        status = r.get("status")
        if url not in urls or status not in valid_statuses:
            continue
        set_status(url, status, (r.get("reason") or "").strip()[:200], r.get("final_url"))
        checked_this_run.append(url)

    # Recompute summary.
    summary: dict[str, int] = {}
    for e in links.values():
        summary[e["status"]] = summary.get(e["status"], 0) + 1
    ledger["meta"] = {
        "last_run": stamp,
        "cycle_days": plan.get("cycle_days"),
        "last_shard": plan.get("shard"),
        "total_urls": len(urls),
        "checked_this_run": len(set(checked_this_run)),
        "summary": dict(sorted(summary.items())),
    }
    write_json(LEDGER_PATH, ledger)

    # Markdown report of what is broken among URLs checked THIS run.
    broken = sorted(
        ({"url": u, **links[u]} for u in set(checked_this_run) if links[u]["status"] in ACTIONABLE),
        key=lambda e: (e["status"], e["host"], e["title"]),
    )
    total_broken = sum(1 for e in links.values() if e["status"] in ACTIONABLE)

    print("=" * 60)
    print(f"LINK CHECK {stamp} — shard {plan.get('shard')} / {plan.get('cycle_days')}")
    print(f"checked this run: {len(set(checked_this_run))} | "
          f"broken this run: {len(broken)} | broken in DB total: {total_broken}")
    print("=" * 60)
    if not broken:
        print("NO_BROKEN_LINKS_THIS_RUN")
        print(f"Wrote ledger -> {LEDGER_PATH}")
        return

    print("\n### Broken links found this run\n")
    print("| Status | Resource | URL | Detail |")
    print("| --- | --- | --- | --- |")
    for e in broken:
        detail = e["reason"] or ""
        if e["final_url"]:
            detail = (detail + f" → {e['final_url']}").strip()
        print(f"| `{e['status']}` | {e['id']} {e['title']} | {e['url']} | {detail} |")
    print(f"\nWrote ledger -> {LEDGER_PATH}")


def main() -> None:
    p = argparse.ArgumentParser(description="Nightly link-health plumbing (DNS + rotation + ledger).")
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("select", help="DNS-sweep all URLs and queue tonight's browser-check shard")
    s.add_argument("--out", required=True, help="path to write the plan JSON")
    s.add_argument("--cycle", type=int, default=9, help="nights for a full sweep (default 9)")
    s.add_argument("--per-host-cap", type=int, default=50,
                   help="max URLs per host per night (keep above max single-host count / cycle "
                        "to avoid permanent coverage gaps on the busiest host)")
    s.add_argument("--max-budget", type=int, default=300, help="hard cap on URLs browser-checked per night")
    s.set_defaults(func=cmd_select)

    a = sub.add_parser("apply", help="merge browser results into the ledger and report")
    a.add_argument("--plan", required=True, help="plan JSON written by `select`")
    a.add_argument("--results", required=True, help="JSON array of {url,status,reason,final_url}")
    a.set_defaults(func=cmd_apply)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
