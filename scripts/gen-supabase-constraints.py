#!/usr/bin/env python3
"""
gen-supabase-constraints.py
Renders schema/resource-schema.json into the CHECK constraints on the Supabase
resource tables, so the JSON stays the one home of every vocabulary.

    python3 scripts/gen-supabase-constraints.py          # write a new migration if the schema changed
    python3 scripts/gen-supabase-constraints.py --check  # exit 1 if the latest one is stale (CI)

Migrations are append-only once applied, so a vocabulary change lands as a
*new* supabase/migrations/<timestamp>_resource_constraints.sql. The rendered
SQL drops every constraint it owns (the mk_ prefix) and re-adds them, so it is
idempotent and a removed vocabulary value or renamed field cannot leave a stale
constraint behind. It also asserts that public.resources has exactly the
schema's fields as columns, so adding a field to the JSON without a column
fails the migration instead of silently dropping data on export.
"""

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import _schema  # noqa: E402

MIGRATIONS_DIR = _schema.REPO_ROOT / "supabase" / "migrations"
SUFFIX = "_resource_constraints.sql"

# Columns that exist for the database's own bookkeeping, not as record fields.
BOOKKEEPING_COLUMNS = ["seq", "status", "created_at", "updated_at"]

# Fields stored as text[]; every other vocabulary field is a scalar text column.
ARRAY_FIELDS = {"grade_level", "strand", "modality", "accessibility", "instructional_modes", "curriculum_expectations", "tags"}


def q(value: str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def text_array(values) -> str:
    return "array[" + ", ".join(q(v) for v in values) + "]::text[]"


def vocab_check(field: str, values) -> str:
    if field in ARRAY_FIELDS:
        return f"{field} is null or {field} <@ {text_array(values)}"
    return f"{field} is null or {field} = any ({text_array(values)})"


def resource_constraints() -> list:
    """(name, expression) pairs for public.resources."""
    out = [("mk_id_pattern", f"id ~ {q(_schema.ADMIN['limits']['id_pattern'])}")]

    for field in _schema.REQUIRED_FIELDS:
        if field != "id":
            out.append((f"mk_required_{field}", f"{field} is not null"))

    grades = [str(g) for g in range(_schema.GRADE_LEVEL_RANGE["numeric_min"], _schema.GRADE_LEVEL_RANGE["numeric_max"] + 1)]
    out.append(("mk_vocab_grade_level", vocab_check("grade_level", grades + _schema.GRADE_LEVEL_RANGE["named"])))
    for field, values in _schema.VOCABULARY_BY_FIELD.items():
        out.append((f"mk_vocab_{field}", vocab_check(field, values)))

    for name in _schema.ADMIN["vocabulary_checked_keys"]:
        if name != "grade_level" and name not in _schema.VOCABULARY_BY_FIELD:
            raise SystemExit(f"admin.vocabulary_checked_keys names {name!r}, which has no vocabulary")

    metadata_keys = _schema.ALL_METADATA_FIELDS
    out.append(("mk_metadata_object", "metadata is null or jsonb_typeof(metadata) = 'object'"))
    out.append(("mk_metadata_required", f"metadata is null or metadata ?& {text_array(_schema.REQUIRED_METADATA_FIELDS)}"))
    out.append(("mk_metadata_known_keys", f"metadata is null or (metadata - {text_array(metadata_keys)}) = '{{}}'::jsonb"))
    out.append((
        "mk_metadata_link_status",
        f"metadata is null or metadata->>'link_status' is null or metadata->>'link_status' = any ({text_array(_schema.LINK_STATUSES)})",
    ))

    # Invariants, by name. An invariant this script does not know how to render
    # fails loudly rather than being skipped.
    for inv in _schema.INVARIANTS:
        name = inv["name"]
        if name == "is_paid_matches_access_type":
            out.append((f"mk_inv_{name}", "is_paid is null or access_type is null or is_paid = (access_type = 'purchase')"))
        elif name == "jurisdiction_matches_province":
            cases = " ".join(f"when {q(p)} then {q(j)}" for p, j in _schema.JURISDICTION_BY_PROVINCE.items())
            out.append((f"mk_inv_{name}", f"province is null or jurisdiction is not distinct from (case province {cases} end)"))
        elif name == "unique_ids":
            pass  # the primary key
        elif name == "flags_never_false":
            for flag in _schema.FLAG_FIELDS:
                out.append((f"mk_inv_{name}_{flag}", f"{flag} is null or {flag}"))
        else:
            raise SystemExit(f"invariant {name!r} has no SQL rendering in {Path(__file__).name}")
    return out


def link_check_constraints() -> list:
    return [("mk_vocab_link_status", f"link_status is null or link_status = any ({text_array(_schema.LINK_STATUSES)})")]


def drop_owned(table: str) -> str:
    return f"""do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.{table}'::regclass and conname like 'mk\\_%'
  loop
    execute format('alter table public.{table} drop constraint %I', c.conname);
  end loop;
end
$$;"""


def add_constraints(table: str, constraints: list) -> str:
    lines = [f"alter table public.{table}"]
    lines.append(",\n".join(f"  add constraint {name} check ({expr})" for name, expr in constraints) + ";")
    return "\n".join(lines)


def render() -> str:
    fields = _schema.ALL_FIELDS
    return f"""-- GENERATED by scripts/gen-supabase-constraints.py from schema/resource-schema.json
-- (schema_version {_schema.SCHEMA_VERSION}). Do not hand-edit: change the JSON and
-- re-run the script, which writes a new migration.

-- public.resources must carry exactly the schema's fields (plus bookkeeping).
do $$
declare
  v_missing text;
  v_extra text;
begin
  select string_agg(f, ', ') into v_missing
  from unnest({text_array(fields)}) f
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'resources' and column_name = f
  );
  select string_agg(column_name, ', ') into v_extra
  from information_schema.columns
  where table_schema = 'public' and table_name = 'resources'
    and column_name <> all ({text_array(fields + BOOKKEEPING_COLUMNS)});
  if v_missing is not null or v_extra is not null then
    raise exception 'public.resources is out of step with schema/resource-schema.json: missing [%] extra [%]',
      coalesce(v_missing, ''), coalesce(v_extra, '');
  end if;
end
$$;

{drop_owned("resources")}

{add_constraints("resources", resource_constraints())}

{drop_owned("link_checks")}

{add_constraints("link_checks", link_check_constraints())}
"""


def latest_migration():
    files = sorted(MIGRATIONS_DIR.glob(f"*{SUFFIX}"))
    return files[-1] if files else None


def is_current() -> bool:
    latest = latest_migration()
    return latest is not None and latest.read_text(encoding="utf-8") == render()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="exit 1 if the latest constraints migration is stale")
    args = parser.parse_args()

    if is_current():
        print(f"OK   {latest_migration().relative_to(_schema.REPO_ROOT)} matches schema/resource-schema.json")
        return 0
    if args.check:
        print("FAIL supabase constraints are stale: run python3 scripts/gen-supabase-constraints.py")
        return 1

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    path = MIGRATIONS_DIR / f"{stamp}{SUFFIX}"
    path.write_text(render(), encoding="utf-8")
    print(f"wrote {path.relative_to(_schema.REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
