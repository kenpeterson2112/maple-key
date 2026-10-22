-- Loading the library from the resources.json-era files.
--
-- While public/resources.json is still the source of truth, these are how the
-- database is (re)synced from it: scripts/seed-supabase.py calls them with the
-- files from a checkout. Both are idempotent, and every row change they make is
-- an ordinary logged revision, so a sync can be reverted like any other batch.

-- The link-check ledger also records lint verdicts (link_status 'invalid').
alter table public.link_checks drop constraint link_checks_method_check;
alter table public.link_checks
  add constraint link_checks_method_check check (method in ('dns', 'http', 'webfetch', 'content', 'lint'));

-- Upserts every record of a {meta, resources} document by id. New rows go live
-- and are numbered in document order; an unchanged record is not written at
-- all. Unknown fields and duplicate ids are refused up front, because
-- jsonb_populate_record would otherwise drop the former silently. With
-- p_prune, live rows the document no longer carries are archived to
-- removed_resources and deleted. Returns counts.
create function public.import_resources(p_doc jsonb, p_prune boolean default false)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_fields text[];
  v_bad text;
  v_cols text;
  v_set text;
  v_changed text;
  v_inserted integer;
  v_updated integer;
  v_pruned integer := 0;
begin
  if jsonb_typeof(p_doc->'resources') is distinct from 'array' then
    raise exception 'import_resources: expected a {"resources": [...]} document';
  end if;

  select array_agg(column_name::text order by ordinal_position) into v_fields
  from information_schema.columns
  where table_schema = 'public' and table_name = 'resources'
    and column_name not in ('seq', 'status', 'created_at', 'updated_at');

  select string_agg(distinct format('%s.%s', r->>'id', k), ', ') into v_bad
  from jsonb_array_elements(p_doc->'resources') r, jsonb_object_keys(r) k
  where k <> all (v_fields);
  if v_bad is not null then
    raise exception 'import_resources: fields not in the schema: %', v_bad;
  end if;

  select string_agg(id, ', ') into v_bad
  from (
    select r->>'id' as id from jsonb_array_elements(p_doc->'resources') r
    group by 1 having count(*) > 1
  ) d;
  if v_bad is not null then
    raise exception 'import_resources: duplicate ids: %', v_bad;
  end if;

  if coalesce(current_setting('mk.actor', true), '') = '' then
    perform set_config('mk.actor', 'import', true);
  end if;
  if coalesce(current_setting('mk.batch_id', true), '') = '' then
    perform set_config('mk.batch_id', gen_random_uuid()::text, true);
  end if;

  select
    string_agg(format('%I', f), ', '),
    string_agg(format('%1$I = excluded.%1$I', f), ', ') filter (where f <> 'id'),
    format('(%s) is distinct from (%s)',
      string_agg(format('t.%I', f), ', ') filter (where f <> 'id'),
      string_agg(format('excluded.%I', f), ', ') filter (where f <> 'id'))
  into v_cols, v_set, v_changed
  from unnest(v_fields) f;

  execute format(
    $sql$
      with written as (
        insert into public.resources as t (%1$s)
        select %1$s
        from jsonb_array_elements($1) with ordinality src(rec, n)
        cross join lateral jsonb_populate_record(null::public.resources, src.rec)
        order by src.n
        on conflict (id) do update set %2$s
        where %3$s
        returning (xmax = 0) as inserted
      )
      select count(*) filter (where inserted), count(*) filter (where not inserted) from written
    $sql$,
    v_cols, v_set, v_changed
  ) into v_inserted, v_updated using p_doc->'resources';

  if p_prune then
    with gone as (
      delete from public.resources t
      where t.status = 'live'
        and not exists (
          select 1 from jsonb_array_elements(p_doc->'resources') r where r->>'id' = t.id
        )
      returning t
    ), archived as (
      insert into public.removed_resources (resource_id, record, reason, removed_by, batch_id)
      select (g.t).id, public.resource_json(g.t), 'absent from imported resources.json',
             current_setting('mk.actor', true), nullif(current_setting('mk.batch_id', true), '')::uuid
      from gone g
      returning 1
    )
    select count(*) into v_pruned from archived;
  end if;

  return jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'unchanged', jsonb_array_length(p_doc->'resources') - v_inserted - v_updated,
    'pruned', v_pruned,
    'batch_id', current_setting('mk.batch_id', true)
  );
end
$$;

-- Loads the old link-health files into the link_checks ledger, once. Each file
-- only ever held the latest verdict per URL, so that is the history there is:
-- one row per checked URL from link-health.json (unchecked entries are just
-- absent), one 'content' row per URL from health-changelog.json. URLs are
-- matched to resources by url, since the changelog never stored ids. Refuses to
-- run twice, which would double the history.
create function public.import_link_health(p_ledger jsonb, p_changelog jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_verdicts integer;
  v_content integer;
begin
  if exists (select 1 from public.link_checks where actor = 'import:link-health') then
    raise exception 'import_link_health: already imported';
  end if;

  insert into public.link_checks (resource_id, url, checked_at, method, link_status, final_url, reason, actor)
  select
    e.value->>'id',
    e.key,
    (e.value->>'last_checked')::timestamptz,
    case e.value->>'status'
      when 'dead_domain' then 'dns'
      when 'invalid' then 'lint'
      else 'webfetch'
    end,
    e.value->>'status',
    e.value->>'final_url',
    nullif(e.value->>'reason', ''),
    'import:link-health'
  from jsonb_each(p_ledger->'links') e
  where e.value->>'status' <> 'unchecked' and e.value->>'last_checked' is not null;
  get diagnostics v_verdicts = row_count;

  insert into public.link_checks (resource_id, url, checked_at, method, dns_ok, content_hash, reason, actor)
  select
    r.id,
    e.key,
    (e.value->>'last_checked')::timestamptz,
    'content',
    (e.value->>'last_dns_ok')::boolean,
    e.value->>'content_hash',
    nullif(array_to_string(array(select jsonb_array_elements_text(e.value->'issues')), '; '), ''),
    'import:link-health'
  from jsonb_each(p_changelog->'resources') e
  join public.resources r on r.url = e.key
  where e.value->>'last_checked' is not null;
  get diagnostics v_content = row_count;

  return jsonb_build_object('verdicts', v_verdicts, 'content_checks', v_content);
end
$$;

do $$
begin
  revoke all on function public.import_resources(jsonb, boolean) from public;
  revoke all on function public.import_link_health(jsonb, jsonb) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.import_resources(jsonb, boolean) from anon, authenticated;
    revoke all on function public.import_link_health(jsonb, jsonb) from anon, authenticated;
  end if;
end
$$;
