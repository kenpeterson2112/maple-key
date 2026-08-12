#!/usr/bin/env python3
"""
http-probe-ab.py — settle whether a plain server-side HTTP probe can judge these
links, or whether only a browser-grade fetch can.

The question
-----------
`scripts/health-check.py` removed HTTP status probing on the grounds that "96% of
educational/commercial sites return 403 to non-browser clients". That single
number is why the nightly link-health verdict was handed to Claude's WebFetch
(~150-190 fetches a night over a 9-night rotation) instead of a script that could
check all ~1,740 URLs in minutes.

The number has no recorded provenance, and it is exactly what a *broken egress
proxy* produces: a denied CONNECT returns 403 for every host, live or dead. The
same fault demonstrably corrupted the ledger — 580 URLs were recorded `blocked`
across three runs whose own reason strings say the proxy refused every host,
including control domains.

So the 96% may be measuring the environment, not the web. This script measures it
properly. If plain HTTP agrees with the browser tier, the WebFetch verdict tier,
the shard rotation and the nightly subscription cost all collapse into one fast
deterministic check.

The control is the whole point
------------------------------
Every run first fetches known-good control hosts. If those fail, the run
**aborts** — it does not record a single verdict about a single resource. That is
the discipline whose absence produced both bad numbers. A probe that cannot prove
its own egress works has measured nothing.

Usage
-----
    python3 scripts/http-probe-ab.py                      # ~200-URL stratified sample
    python3 scripts/http-probe-ab.py --sample 400
    python3 scripts/http-probe-ab.py --all                # every URL in the catalog
    python3 scripts/http-probe-ab.py --out /tmp/probe.json

Then compare against the browser-tier verdicts already in public/link-health.json
(printed automatically for any sampled URL that has one).

Stdlib only. Requires real outbound network access.
"""

from __future__ import annotations

import argparse
import json
import random
import ssl
import sys
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

REPO_ROOT = Path(__file__).resolve().parent.parent
RESOURCES_PATH = REPO_ROOT / "public" / "resources.json"
LEDGER_PATH = REPO_ROOT / "public" / "link-health.json"

# A real browser UA. The 96% claim is specifically about how these hosts treat
# "non-browser clients", so sending a plausible browser UA is the thing under test.
UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9",
}

# Hosts that are up unless the internet is broken. If ANY of these fails, our own
# egress is the problem and no verdict about a resource is trustworthy.
CONTROL_URLS = [
    "https://example.com/",
    "https://en.wikipedia.org/wiki/Main_Page",
    "https://www.google.com/",
]

TIMEOUT = 12
MAX_WORKERS = 8
PER_HOST_CAP = 6  # keep one big host (tvolearn.com has 250 URLs) from dominating

# Verdicts. The critical distinction: `dead` means the site answered and told us
# the page is gone. `error` means OUR request failed. Never conflate them — that
# conflation is what corrupted the old data.
LIVE, MOVED, DEAD, BLOCKED, ERROR = "live", "moved", "dead", "blocked", "error"


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def classify(status: int) -> str:
    """Map an HTTP status the site actually returned to a verdict."""
    if 200 <= status < 300:
        return LIVE
    if status in (301, 302, 303, 307, 308):
        return MOVED
    if status in (401, 403, 407, 429):
        # A real bot-wall. The page may well be fine for a teacher in a browser,
        # so this routes to human review — it is never an auto-removal.
        return BLOCKED
    if status in (404, 410):
        return DEAD
    if 500 <= status < 600:
        # The server is broken right now, which is not the same as the page being
        # gone. Treated as our-side-unknown so it retries rather than flagging.
        return ERROR
    return ERROR


def fetch(url: str, method: str = "HEAD") -> tuple[str, int | None, str, str | None]:
    """Return (verdict, http_status, detail, final_url)."""
    req = urllib.request.Request(url, method=method, headers=HEADERS)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as resp:
            final = resp.geturl()
            verdict = classify(resp.status)
            # urllib follows redirects, so a 200 at a different URL is a move.
            if verdict == LIVE and final.rstrip("/") != url.rstrip("/"):
                return MOVED, resp.status, f"redirected to {final}", final
            return verdict, resp.status, f"HTTP {resp.status} ({method})", final
    except urllib.error.HTTPError as e:
        # Some hosts reject HEAD outright but serve GET fine.
        if method == "HEAD" and e.code in (400, 403, 405, 406, 501):
            return fetch(url, "GET")
        return classify(e.code), e.code, f"HTTP {e.code} ({method})", None
    except urllib.error.URLError as e:
        return ERROR, None, f"{type(e.reason).__name__}: {e.reason}", None
    except Exception as e:  # noqa: BLE001 - a probe must never crash the run
        return ERROR, None, f"{type(e).__name__}: {e}", None


def probe(url: str) -> dict:
    """Probe one URL, retrying once on `error` so a blip doesn't flood review."""
    verdict, status, detail, final = fetch(url)
    if verdict == ERROR:
        verdict2, status2, detail2, final2 = fetch(url, "GET")
        if verdict2 != ERROR:
            verdict, status, detail, final = verdict2, status2, detail2, final2
            detail += " (after retry)"
        else:
            detail = f"{detail}; retry: {detail2}"
    return {"url": url, "status": verdict, "http_status": status, "detail": detail, "final_url": final}


def check_controls() -> list[dict]:
    print("[control] proving our own egress before judging any resource…")
    results = []
    for url in CONTROL_URLS:
        r = probe(url)
        results.append(r)
        mark = "ok " if r["status"] == LIVE else "FAIL"
        print(f"  {mark} {url} -> {r['status']} ({r['detail']})")
    return results


def stratified_sample(urls: list[str], size: int, seed: int) -> list[str]:
    """Sample across hosts rather than uniformly, capped per host.

    A uniform sample of this catalog is dominated by a few big hosts (tvolearn.com
    alone has 250 URLs), which would tell us about those hosts' bot policy rather
    than about the catalog.
    """
    by_host: dict[str, list[str]] = defaultdict(list)
    for u in urls:
        by_host[urlparse(u).hostname or ""].append(u)

    rng = random.Random(seed)
    for host_urls in by_host.values():
        rng.shuffle(host_urls)

    picked: list[str] = []
    round_no = 0
    hosts = sorted(by_host)
    rng.shuffle(hosts)
    # Round-robin one URL per host per pass, so every host is represented before
    # any host contributes a second URL.
    while len(picked) < size and round_no < PER_HOST_CAP:
        added = False
        for host in hosts:
            if len(picked) >= size:
                break
            if len(by_host[host]) > round_no:
                picked.append(by_host[host][round_no])
                added = True
        if not added:
            break
        round_no += 1
    return picked[:size]


def main() -> int:
    parser = argparse.ArgumentParser(description="A/B a plain HTTP probe against the browser tier.")
    parser.add_argument("--sample", type=int, default=200, help="URLs to probe (default 200)")
    parser.add_argument("--all", action="store_true", help="probe every URL in the catalog")
    parser.add_argument("--seed", type=int, default=1, help="sampling seed (default 1)")
    parser.add_argument("--out", type=str, default="", help="write full results JSON here")
    args = parser.parse_args()

    data = load_json(RESOURCES_PATH)
    all_urls = []
    seen = set()
    for r in data.get("resources", []):
        u = (r.get("url") or "").strip()
        if u.startswith(("http://", "https://")) and u not in seen:
            seen.add(u)
            all_urls.append(u)

    controls = check_controls()
    if any(c["status"] != LIVE for c in controls):
        print()
        print("ABORTED: our own egress is failing, so this environment cannot measure anything.")
        print("A denied CONNECT returns 403 for every host — that is what produced both the")
        print("bogus '96% of sites 403' claim and the 580 phantom `blocked` rows. Run this")
        print("from an environment with open outbound HTTPS (see the egress note in ROUTINES.md).")
        return 2
    print("[control] egress confirmed — proceeding.\n")

    targets = all_urls if args.all else stratified_sample(all_urls, args.sample, args.seed)
    hosts = len({urlparse(u).hostname for u in targets})
    print(f"[probe] {len(targets)} URLs across {hosts} hosts (catalog has {len(all_urls)} URLs)")
    if not args.all:
        print("[probe] sampled round-robin across hosts, so the percentages below are")
        print("        HOST-weighted — the right shape for a claim about what share of")
        print("        *sites* bot-wall a script. For the URL-weighted operational number")
        print("        ('how many of my links can a script check'), run --all.")
    print()

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        results = list(pool.map(probe, targets))

    counts = Counter(r["status"] for r in results)
    total = len(results)

    print("=" * 72)
    print(f"PLAIN HTTP PROBE — {now_iso()}")
    print("=" * 72)
    for status in (LIVE, MOVED, BLOCKED, DEAD, ERROR):
        n = counts.get(status, 0)
        print(f"  {status:<8} {n:>5}  {n / total * 100:5.1f}%")
    print()

    reachable = counts.get(LIVE, 0) + counts.get(MOVED, 0)
    print(f"Reachable by a plain HTTP client: {reachable}/{total} ({reachable / total * 100:.1f}%)")
    print(f"Bot-walled (401/403/429):         {counts.get(BLOCKED, 0)}/{total} "
          f"({counts.get(BLOCKED, 0) / total * 100:.1f}%)")
    print(f"Genuinely broken (404/410):       {counts.get(DEAD, 0)}/{total} "
          f"({counts.get(DEAD, 0) / total * 100:.1f}%)")
    print()
    print("THE VERDICT ON THE 96% CLAIM:")
    blocked_pct = counts.get(BLOCKED, 0) / total * 100
    if blocked_pct >= 50:
        print(f"  {blocked_pct:.1f}% bot-walled — the claim holds for this catalog. Keep the")
        print("  browser-grade WebFetch tier; a plain probe cannot judge these links.")
    else:
        print(f"  {blocked_pct:.1f}% bot-walled, NOT ~96%. A plain HTTP probe is good enough for")
        print("  most of this catalog. The WebFetch verdict tier and its 9-night shard")
        print("  rotation can be replaced by a nightly full sweep, with only the bot-walled")
        print("  tail escalated to a browser check or human review.")
    print()

    # Per-host breakdown for the biggest hosts — bot policy is a host property.
    by_host: dict[str, Counter] = defaultdict(Counter)
    for r in results:
        by_host[urlparse(r["url"]).hostname or ""][r["status"]] += 1
    busiest = sorted(by_host.items(), key=lambda kv: -sum(kv[1].values()))[:12]
    print("Per-host (most-sampled first):")
    for host, c in busiest:
        summary = " ".join(f"{k}={v}" for k, v in sorted(c.items()))
        print(f"  {host:<38} {summary}")
    print()

    # Disagreement with whatever the browser tier already recorded.
    if LEDGER_PATH.exists():
        links = load_json(LEDGER_PATH).get("links", {})
        compared = [(r, links.get(r["url"], {}).get("status")) for r in results]
        overlap = [(r, s) for r, s in compared if s and s not in ("unchecked", "")]
        if overlap:
            agree = sum(1 for r, s in overlap if r["status"] == s)
            print(f"vs. browser tier in link-health.json: {len(overlap)} URLs have both verdicts, "
                  f"{agree} agree ({agree / len(overlap) * 100:.0f}%)")
            for r, s in overlap:
                if r["status"] != s:
                    print(f"  DISAGREE {r['url']}\n    plain={r['status']} ({r['detail']}) ledger={s}")
        else:
            print("vs. browser tier: no overlapping verdicts in link-health.json to compare "
                  "(the ledger is all `unchecked` after the egress repair).")
        print()

    if args.out:
        out = Path(args.out)
        out.write_text(
            json.dumps(
                {
                    "probed_at": now_iso(),
                    "controls": controls,
                    "sample_size": total,
                    "hosts": hosts,
                    "summary": dict(sorted(counts.items())),
                    "results": results,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        print(f"wrote {out}")

    print("Record the bot-walled percentage and today's date in the docstring of")
    print("scripts/health-check.py, replacing the unsourced 96% claim.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
