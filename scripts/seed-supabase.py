#!/usr/bin/env python3
"""
seed-supabase.py
Loads the committed resource files into Supabase.

    SUPABASE_DB_URL=postgres://... python3 scripts/seed-supabase.py
    python3 scripts/seed-supabase.py --prune          # also archive+delete rows the JSON dropped
    python3 scripts/seed-supabase.py --link-history   # one-time: link-health.json + health-changelog.json
    python3 scripts/seed-supabase.py --print > seed.sql  # emit the SQL instead of running it

Until the read path flips, public/resources.json is the source of truth and
this is how the database catches up with it. The upsert itself is
public.import_resources() in the database, so it is idempotent: an unchanged
record is not written, and every change is a logged revision under one batch
(public.revert_batch undoes it). Follow with

    node scripts/export-resources.mjs --check public/resources.json

to prove the two agree. Needs psql on PATH; no Python dependencies.
"""

import argparse
import json
import os
import secrets
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _schema  # noqa: E402

PUBLIC = _schema.REPO_ROOT / "public"


def dollar_quote(text: str) -> str:
    """A dollar-quoted SQL literal whose tag cannot occur in the text."""
    while True:
        tag = f"$mk{secrets.token_hex(4)}$"
        if tag not in text:
            return f"{tag}{text}{tag}"


def jsonb_literal(path: Path) -> str:
    # Round-trip through json to fail on a malformed file before touching the database.
    data = json.loads(path.read_text(encoding="utf-8"))
    return dollar_quote(json.dumps(data, ensure_ascii=False)) + "::jsonb"


def build_sql(prune: bool, link_history: bool) -> str:
    lines = [
        "\\set ON_ERROR_STOP 1",
        "\\pset tuples_only on",
        "begin;",
        "select set_config('mk.actor', 'seed-supabase', true);",
        f"select public.import_resources({jsonb_literal(PUBLIC / 'resources.json')}, {str(prune).lower()});",
    ]
    if link_history:
        lines.append(
            "select public.import_link_health("
            f"{jsonb_literal(PUBLIC / 'link-health.json')}, {jsonb_literal(PUBLIC / 'health-changelog.json')});"
        )
    lines.append("commit;")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db-url", default=os.environ.get("SUPABASE_DB_URL"), help="defaults to $SUPABASE_DB_URL")
    parser.add_argument("--prune", action="store_true", help="archive and delete live rows absent from resources.json")
    parser.add_argument("--link-history", action="store_true", help="also import the link-health files (once)")
    parser.add_argument("--print", action="store_true", help="print the SQL instead of running it")
    args = parser.parse_args()

    sql = build_sql(args.prune, args.link_history)
    if args.print:
        sys.stdout.write(sql)
        return 0
    if not args.db_url:
        parser.error("set SUPABASE_DB_URL or pass --db-url")

    result = subprocess.run(["psql", "-X", "-q", args.db_url], input=sql, text=True)
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
