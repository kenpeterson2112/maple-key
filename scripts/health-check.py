#!/usr/bin/env python3
"""
Maple Key Database Health Check
Checks up to 100 resources per run for:
1. URL reachability (HTTP errors)
2. Duplicate detection (URL or title+grade+subject)
3. Content changes since last check (via content hash changelog)
Flags failures with needs_review: "yes"
"""

import json
import hashlib
import urllib.request
import urllib.error
import ssl
import time
import os
import sys
from datetime import datetime, timezone
from collections import Counter

RESOURCES_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'resources.json')
CHANGELOG_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'health-changelog.json')
MAX_RESOURCES_PER_RUN = 100
URL_TIMEOUT = 10

# SSL context that doesn't verify certs (some edu sites have issues)
ssl_ctx = ssl.create_default_context()
ssl_ctx.check_hostname = False
ssl_ctx.verify_mode = ssl.CERT_NONE


def content_hash(resource: dict) -> str:
    """Hash key content fields to detect changes."""
    fields = ['url', 'topic_title', 'description', 'strand', 'grade_level',
              'subject', 'publisher_creator', 'modality', 'curriculum_expectations',
              'year_published', 'is_paid', 'province', 'sub_strand']
    parts = []
    for f in fields:
        val = resource.get(f)
        if isinstance(val, list):
            val = sorted(str(v) for v in val)
        parts.append(f"{f}:{json.dumps(val, sort_keys=True)}")
    raw = '|'.join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def resource_key(resource: dict) -> str:
    """Changelog key — use URL for backward compatibility with existing entries."""
    return resource.get('url', '')


def check_url(url: str) -> tuple[int | None, str]:
    """Return (http_status_code, error_message). Status None = network error."""
    if not url or not url.startswith(('http://', 'https://')):
        return None, 'invalid_url'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (MapleKey HealthCheck/1.0)'})
        with urllib.request.urlopen(req, timeout=URL_TIMEOUT, context=ssl_ctx) as resp:
            return resp.status, ''
    except urllib.error.HTTPError as e:
        return e.code, f'http_error_{e.code}'
    except urllib.error.URLError as e:
        return None, f'url_error: {e.reason}'
    except Exception as e:
        return None, f'error: {str(e)[:80]}'


def build_duplicate_maps(data: list) -> tuple[dict, dict]:
    """Build URL→[indices] and title_key→[indices] maps for dup detection."""
    url_map: dict[str, list[int]] = {}
    title_map: dict[str, list[int]] = {}
    for i, r in enumerate(data):
        url = r.get('url', '').strip().rstrip('/')
        if url:
            url_map.setdefault(url, []).append(i)
        gl = r.get('grade_level', '')
        gl_str = ','.join(sorted(str(x) for x in gl)) if isinstance(gl, list) else str(gl)
        title_key = f"{r.get('topic_title','').strip().lower()}|{r.get('subject','').strip().lower()}|{gl_str.strip().lower()}"
        if r.get('topic_title'):
            title_map.setdefault(title_key, []).append(i)
    return url_map, title_map


def load_changelog() -> dict:
    if os.path.exists(CHANGELOG_PATH):
        with open(CHANGELOG_PATH) as f:
            return json.load(f)
    return {'version': 1, 'last_run': None, 'resources': {}}


def save_changelog(changelog: dict):
    with open(CHANGELOG_PATH, 'w') as f:
        json.dump(changelog, f, indent=2)


def select_resources_to_check(data: list, changelog: dict, limit: int) -> list[int]:
    """
    Priority order:
    1. Resources never checked (not in changelog)
    2. Resources flagged needs_review (re-validate)
    3. Oldest-checked resources
    """
    checked = changelog.get('resources', {})
    never_checked = []
    flagged = []
    by_last_check = []

    for i, r in enumerate(data):
        key = resource_key(r)
        if key not in checked:
            never_checked.append(i)
        elif r.get('needs_review') == 'yes':
            flagged.append(i)
        else:
            last = checked[key].get('last_checked', '2000-01-01')
            by_last_check.append((last, i))

    by_last_check.sort()
    oldest = [i for _, i in by_last_check]

    priority = never_checked + flagged + oldest
    seen = set()
    result = []
    for i in priority:
        if i not in seen:
            seen.add(i)
            result.append(i)
        if len(result) >= limit:
            break
    return result


def main():
    print(f"[{datetime.now().isoformat()}] Maple Key Health Check starting...")
    print(f"Loading resources from {RESOURCES_PATH}")

    with open(RESOURCES_PATH) as f:
        raw = json.load(f)

    # Support both flat-list and {"meta":..., "resources":[...]} formats
    if isinstance(raw, list):
        meta = None
        data = raw
    else:
        meta = raw.get('meta')
        data = raw.get('resources', [])

    changelog = load_changelog()
    print(f"Total resources: {len(data)}")
    print(f"Previously checked: {len(changelog.get('resources', {}))}")

    url_map, title_map = build_duplicate_maps(data)
    indices = select_resources_to_check(data, changelog, MAX_RESOURCES_PER_RUN)
    print(f"Resources selected for this run: {len(indices)}")
    print()

    results_summary = {
        'url_error': [],
        'url_broken': [],
        'duplicate_url': [],
        'duplicate_title': [],
        'content_changed': [],
        'ok': [],
    }

    now_iso = datetime.now(timezone.utc).isoformat()
    checked_resources = changelog.setdefault('resources', {})

    for idx, i in enumerate(indices):
        r = data[i]
        key = resource_key(r)
        url = r.get('url', '')
        title = r.get('topic_title', 'Untitled')
        issues = []

        print(f"[{idx+1:3d}/{len(indices)}] Checking: {title[:60]}")

        # --- Check 1: URL health ---
        status, err = check_url(url)
        if status is None:
            issues.append(f'url_error: {err}')
            results_summary['url_error'].append({'index': i, 'key': key, 'title': title, 'url': url, 'error': err})
            print(f"         URL ERROR: {err}")
        elif status >= 400:
            issues.append(f'http_{status}')
            results_summary['url_broken'].append({'index': i, 'key': key, 'title': title, 'url': url, 'status': status})
            print(f"         BROKEN URL: HTTP {status}")
        else:
            print(f"         URL OK: HTTP {status}")

        # --- Check 2: Duplicate detection ---
        norm_url = url.strip().rstrip('/')
        if norm_url and len(url_map.get(norm_url, [])) > 1:
            dup_indices = [x for x in url_map[norm_url] if x != i]
            issues.append(f'duplicate_url: indices {dup_indices}')
            results_summary['duplicate_url'].append({'index': i, 'key': key, 'title': title, 'url': url, 'dup_indices': dup_indices})
            print(f"         DUPLICATE URL: also at indices {dup_indices}")

        gl = r.get('grade_level', '')
        gl_str = ','.join(sorted(str(x) for x in gl)) if isinstance(gl, list) else str(gl)
        title_key = f"{r.get('topic_title','').strip().lower()}|{r.get('subject','').strip().lower()}|{gl_str.strip().lower()}"
        if r.get('topic_title') and len(title_map.get(title_key, [])) > 1:
            dup_indices = [x for x in title_map[title_key] if x != i]
            # Only flag if URLs are also different (pure title dup)
            dup_urls_same = all(data[x].get('url','').strip().rstrip('/') == norm_url for x in dup_indices)
            if not dup_urls_same:
                issues.append(f'duplicate_title: indices {dup_indices}')
                results_summary['duplicate_title'].append({'index': i, 'key': key, 'title': title, 'url': url, 'dup_indices': dup_indices})
                print(f"         DUPLICATE TITLE: also at indices {dup_indices}")

        # --- Check 3: Content change detection ---
        current_hash = content_hash(r)
        prev = checked_resources.get(key, {})
        prev_hash = prev.get('content_hash')

        if prev_hash and prev_hash != current_hash:
            issues.append(f'content_changed: was {prev_hash}, now {current_hash}')
            results_summary['content_changed'].append({'index': i, 'key': key, 'title': title, 'url': url,
                                                        'old_hash': prev_hash, 'new_hash': current_hash})
            print(f"         CONTENT CHANGED: {prev_hash} → {current_hash}")

        # --- Apply needs_review flag ---
        if issues:
            data[i]['needs_review'] = 'yes'
        else:
            results_summary['ok'].append({'index': i, 'key': key, 'title': title})
            # Clear flag if previously set and now clean
            if data[i].get('needs_review') == 'yes':
                del data[i]['needs_review']

        # --- Update changelog entry ---
        checked_resources[key] = {
            'index': i,
            'title': title,
            'url': url,
            'content_hash': current_hash,
            'last_checked': now_iso,
            'last_http_status': status,
            'issues': issues,
        }

        # Polite rate limiting
        time.sleep(0.3)

    # --- Save updated resources.json ---
    with open(RESOURCES_PATH, 'w') as f:
        if meta is not None:
            json.dump({'meta': meta, 'resources': data}, f, indent=2)
        else:
            json.dump(data, f, indent=2)

    # --- Save updated changelog ---
    changelog['last_run'] = now_iso
    changelog['last_run_count'] = len(indices)
    save_changelog(changelog)

    # --- Print summary ---
    print()
    print("=" * 60)
    print(f"HEALTH CHECK COMPLETE — {now_iso}")
    print("=" * 60)
    print(f"Resources checked this run: {len(indices)}")
    print(f"OK:                         {len(results_summary['ok'])}")
    print(f"URL unreachable:            {len(results_summary['url_error'])}")
    print(f"URL broken (4xx/5xx):       {len(results_summary['url_broken'])}")
    print(f"Duplicate URLs:             {len(results_summary['duplicate_url'])}")
    print(f"Duplicate titles:           {len(results_summary['duplicate_title'])}")
    print(f"Content changed:            {len(results_summary['content_changed'])}")
    print()

    total_flagged = (len(results_summary['url_error']) + len(results_summary['url_broken']) +
                     len(results_summary['duplicate_url']) + len(results_summary['duplicate_title']) +
                     len(results_summary['content_changed']))
    print(f"Total resources flagged needs_review: {total_flagged}")

    if results_summary['url_broken'] or results_summary['url_error']:
        print()
        print("--- BROKEN / UNREACHABLE URLs ---")
        for item in results_summary['url_broken']:
            print(f"  [{item['key']}] HTTP {item['status']} — {item['title']}")
            print(f"    {item['url']}")
        for item in results_summary['url_error']:
            print(f"  [{item['key']}] ERROR — {item['title']}")
            print(f"    {item['url']} ({item['error']})")

    if results_summary['duplicate_url'] or results_summary['duplicate_title']:
        print()
        print("--- DUPLICATES ---")
        for item in results_summary['duplicate_url']:
            print(f"  [{item['key']}] DUPLICATE URL — {item['title']}")
            print(f"    {item['url']}")
        for item in results_summary['duplicate_title']:
            print(f"  [{item['key']}] DUPLICATE TITLE — {item['title']}")
            print(f"    {item['url']}")

    if results_summary['content_changed']:
        print()
        print("--- CONTENT CHANGES ---")
        for item in results_summary['content_changed']:
            print(f"  [{item['key']}] {item['title']}")
            print(f"    {item['url']}")

    return results_summary


if __name__ == '__main__':
    main()
