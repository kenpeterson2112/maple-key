#!/usr/bin/env python3
"""
Maple Key Database Health Check

Runs four high-signal, no-false-positive checks across every resource:
1. Invalid URL lint (missing http(s):// scheme)
2. DNS resolution (catches genuinely defunct domains; ignores bot blocks)
3. Duplicate URL detection
4. Duplicate title/subject/grade detection

Resources that fail any check get needs_review: "yes". A content-hash changelog
tracks metadata drift between runs.

HTTP status probing was removed: 96% of educational/commercial sites return 403
to non-browser clients regardless of whether the page is live, which made
needs_review meaningless. DNS failure is the only network signal worth trusting
without a full headless browser.
"""

import json
import hashlib
import socket
import os
from datetime import datetime, timezone
from urllib.parse import urlparse

RESOURCES_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'resources.json')
CHANGELOG_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'health-changelog.json')
DNS_TIMEOUT = 5

socket.setdefaulttimeout(DNS_TIMEOUT)


def content_hash(resource: dict) -> str:
    fields = ['url', 'topic_title', 'description', 'strand', 'grade_level',
              'subject', 'publisher_creator', 'modality', 'curriculum_expectations',
              'year_published', 'is_paid', 'province', 'sub_strand']
    parts = []
    for f in fields:
        val = resource.get(f)
        if isinstance(val, list):
            val = sorted(str(v) for v in val)
        parts.append(f"{f}:{json.dumps(val, sort_keys=True)}")
    return hashlib.sha256('|'.join(parts).encode()).hexdigest()[:16]


def resource_key(resource: dict) -> str:
    return resource.get('url', '')


def check_url_lint(url: str) -> str | None:
    """Return an issue code if the URL is structurally invalid, else None."""
    if not url:
        return 'missing_url'
    if not url.startswith(('http://', 'https://')):
        return 'missing_scheme'
    try:
        parsed = urlparse(url)
        if not parsed.netloc:
            return 'malformed_url'
    except ValueError:
        return 'malformed_url'
    return None


def check_dns(url: str) -> tuple[bool, str]:
    """Return (ok, detail). Only fails for genuine resolution errors."""
    try:
        host = urlparse(url).hostname
        if not host:
            return False, 'no_hostname'
        socket.gethostbyname(host)
        return True, ''
    except socket.gaierror as e:
        return False, f'dns_error: {e}'
    except socket.timeout:
        return False, 'dns_timeout'


def build_duplicate_maps(data: list) -> tuple[dict, dict]:
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
    return {'version': 2, 'last_run': None, 'resources': {}}


def save_changelog(changelog: dict):
    with open(CHANGELOG_PATH, 'w') as f:
        json.dump(changelog, f, indent=2)


def main():
    print(f"[{datetime.now().isoformat()}] Maple Key Health Check starting...")

    with open(RESOURCES_PATH) as f:
        raw = json.load(f)
    if isinstance(raw, list):
        meta, data = None, raw
    else:
        meta, data = raw.get('meta'), raw.get('resources', [])

    changelog = load_changelog()
    print(f"Total resources: {len(data)}")

    url_map, title_map = build_duplicate_maps(data)

    summary = {'invalid_url': [], 'dns_failure': [], 'duplicate_url': [],
               'duplicate_title': [], 'ok': []}
    now_iso = datetime.now(timezone.utc).isoformat()
    checked = changelog.setdefault('resources', {})

    for i, r in enumerate(data):
        url = r.get('url', '')
        title = r.get('topic_title', 'Untitled')
        issues = []
        dns_ok = None

        lint_issue = check_url_lint(url)
        if lint_issue:
            issues.append(lint_issue)
            summary['invalid_url'].append({'index': i, 'title': title, 'url': url, 'code': lint_issue})
        else:
            dns_ok, dns_detail = check_dns(url)
            if not dns_ok:
                issues.append(dns_detail)
                summary['dns_failure'].append({'index': i, 'title': title, 'url': url, 'error': dns_detail})

        norm_url = url.strip().rstrip('/')
        if norm_url and len(url_map.get(norm_url, [])) > 1:
            dups = [x for x in url_map[norm_url] if x != i]
            issues.append(f'duplicate_url: {dups}')
            summary['duplicate_url'].append({'index': i, 'title': title, 'url': url, 'dup_indices': dups})

        gl = r.get('grade_level', '')
        gl_str = ','.join(sorted(str(x) for x in gl)) if isinstance(gl, list) else str(gl)
        title_key = f"{r.get('topic_title','').strip().lower()}|{r.get('subject','').strip().lower()}|{gl_str.strip().lower()}"
        if r.get('topic_title') and len(title_map.get(title_key, [])) > 1:
            dups = [x for x in title_map[title_key] if x != i]
            if not all(data[x].get('url','').strip().rstrip('/') == norm_url for x in dups):
                issues.append(f'duplicate_title: {dups}')
                summary['duplicate_title'].append({'index': i, 'title': title, 'url': url, 'dup_indices': dups})

        if issues:
            data[i]['needs_review'] = 'yes'
        else:
            summary['ok'].append(i)
            if data[i].get('needs_review') == 'yes':
                del data[i]['needs_review']

        checked[resource_key(r)] = {
            'index': i,
            'title': title,
            'url': url,
            'content_hash': content_hash(r),
            'last_checked': now_iso,
            'last_dns_ok': dns_ok,
            'issues': issues,
        }

    with open(RESOURCES_PATH, 'w') as f:
        if meta is not None:
            json.dump({'meta': meta, 'resources': data}, f, indent=2)
        else:
            json.dump(data, f, indent=2)

    changelog['last_run'] = now_iso
    changelog['last_run_count'] = len(data)
    save_changelog(changelog)

    print()
    print("=" * 60)
    print(f"HEALTH CHECK COMPLETE — {now_iso}")
    print("=" * 60)
    print(f"Resources checked:    {len(data)}")
    print(f"OK:                   {len(summary['ok'])}")
    print(f"Invalid URL:          {len(summary['invalid_url'])}")
    print(f"DNS failure:          {len(summary['dns_failure'])}")
    print(f"Duplicate URL:        {len(summary['duplicate_url'])}")
    print(f"Duplicate title:      {len(summary['duplicate_title'])}")

    for label, items in [('INVALID URLs', summary['invalid_url']),
                          ('DNS FAILURES', summary['dns_failure']),
                          ('DUPLICATE URLs', summary['duplicate_url']),
                          ('DUPLICATE TITLES', summary['duplicate_title'])]:
        if items:
            print(f"\n--- {label} ---")
            for it in items:
                extra = it.get('code') or it.get('error') or f"dups at {it.get('dup_indices')}"
                print(f"  [{it['index']}] {it['title']}\n    {it['url']} ({extra})")

    return summary


if __name__ == '__main__':
    main()
