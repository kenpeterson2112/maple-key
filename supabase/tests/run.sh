#!/usr/bin/env bash
# Applies every migration to a fresh database, then runs the schema tests.
#
#   supabase/tests/run.sh postgres://postgres@localhost:5432/postgres
#
# The URL names an admin connection; the script creates (and drops) its own
# scratch database next to it. Supabase's API roles are created when missing so
# the grants in the migrations run the same way they do on the real project.
set -euo pipefail

ADMIN_URL="${1:?usage: run.sh <admin postgres url>}"
DB="mk_schema_test_$$"
DIR="$(cd "$(dirname "$0")" && pwd)"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" "$ADMIN_URL" -c "create database $DB"
trap '"${PSQL[@]}" "$ADMIN_URL" -c "drop database if exists $DB" >/dev/null' EXIT
TEST_URL="$(python3 -c 'import sys, urllib.parse as u; p = u.urlsplit(sys.argv[1]); print(u.urlunsplit(p._replace(path="/" + sys.argv[2])))' "$ADMIN_URL" "$DB")"

"${PSQL[@]}" "$TEST_URL" <<'SQL'
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end
$$;
grant usage on schema public to anon, authenticated, service_role;
SQL

for migration in "$DIR"/../migrations/*.sql; do
  echo "apply $(basename "$migration")"
  "${PSQL[@]}" "$TEST_URL" -f "$migration"
done

"${PSQL[@]}" "$TEST_URL" -f "$DIR/resource_schema_test.sql"
echo "OK   supabase schema tests passed"
