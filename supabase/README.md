# supabase/

Schema for the Supabase project **Maple Key** (`jlsqyywvboqplvscwxbb`), which is
taking over the resource library from `public/resources.json`. Migration is
phased; until the read path flips, the JSON in git is still what the app serves.

## Layout

- `migrations/` — applied in filename order. Each file is named with the
  version the project recorded for it, so local and remote history match.
  Never edit an applied migration; add a new one.
- `migrations/*_resource_constraints.sql` — **generated** by
  `scripts/gen-supabase-constraints.py` from `schema/resource-schema.json`.
  Vocabularies, required fields and invariants live only in the JSON.
- `tests/` — `run.sh` applies every migration to a scratch database and runs
  `resource_schema_test.sql`. CI runs it against a throwaway Postgres
  (`.github/workflows/validate-schema.yml`); it never touches the real project.

## Changing a vocabulary

1. Edit `schema/resource-schema.json` (and the TypeScript union, as before).
2. `python3 scripts/gen-supabase-constraints.py` — writes a new
   `*_resource_constraints.sql`.
3. `supabase/tests/run.sh <admin postgres url>` locally.
4. Apply it to the project, then rename the file to the version the project
   assigned. `pnpm validate:schema` fails while the newest constraints file is
   stale.

## Writing to `resources`

Every insert, update and delete is logged to `resource_revisions` by trigger.
Tag a write so it can be undone as a unit:

```sql
select set_config('mk.actor', 'enrich-routine', true);
select set_config('mk.batch_id', gen_random_uuid()::text, true);
-- ...writes...
-- later: select public.revert_batch('<batch uuid>');
```

`anon` can read live rows (the `published_resources` view) and nothing else;
every write goes through the service role.
