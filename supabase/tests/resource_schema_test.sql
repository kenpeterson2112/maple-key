-- Schema tests for the resource tables. Run by supabase/tests/run.sh against a
-- freshly migrated scratch database; any failed assertion raises and stops it.
\set ON_ERROR_STOP 1
\pset tuples_only on

-- A record shaped exactly like one from the old resources.json.
create temp table good as
select jsonb_build_object(
  'id', 'r-1',
  'topic_title', 'Mathies Data Tools',
  'description', 'Interactive data tools.',
  'url', 'https://www.mathies.ca/activities.php',
  'publisher_creator', 'Ontario Ministry of Education',
  'grade_level', jsonb_build_array(6, 'K'),
  'grade_band', 'intermediate',
  'subject', 'Math',
  'strand', jsonb_build_array('Data Literacy'),
  'curriculum_expectations', jsonb_build_array('D1.1'),
  'province', 'ON',
  'jurisdiction', 'ontario',
  'modality', jsonb_build_array('Interactive', 'Online'),
  'resource_type', 'interactive',
  'access_type', 'free',
  'is_paid', false,
  'accessibility', jsonb_build_array('No Concerns'),
  'metadata', jsonb_build_object('added_at', '2025-11-10', 'added_by', 'maple_key_team', 'verified', false, 'needs_review', true),
  'instructional_modes', jsonb_build_array('individual'),
  'usage_notes', null
) as rec;

-- Inserts only the keys the record carries, so column defaults still apply.
create function pg_temp.insert_rec(p jsonb) returns void language plpgsql as $$
declare v_cols text;
begin
  select string_agg(format('%I', k), ', ') into v_cols from jsonb_object_keys(p) k;
  execute format(
    'insert into public.resources (%1$s) select %1$s from jsonb_populate_record(null::public.resources, $1)',
    v_cols
  ) using p;
end
$$;

-- Expects the record (good, patched with p_patch, minus p_drop) to be rejected.
create function pg_temp.expect_reject(p_label text, p_patch jsonb, p_drop text default null) returns void
language plpgsql as $$
declare
  v jsonb := (select rec from good) || jsonb_build_object('id', 'reject-test') || p_patch;
begin
  if p_drop is not null then v := v - p_drop; end if;
  begin
    perform pg_temp.insert_rec(v);
  exception when check_violation then
    raise notice 'ok   rejects %', p_label;
    return;
  end;
  raise exception 'FAIL accepted %', p_label;
end
$$;

-- ── Constraints ──────────────────────────────────────────────────────────────
select pg_temp.insert_rec(rec) from good;

select pg_temp.expect_reject('off-vocabulary subject', '{"subject": "Astrology"}');
select pg_temp.expect_reject('off-vocabulary strand element', '{"strand": ["Data Literacy", "Juggling"]}');
select pg_temp.expect_reject('grade 13', '{"grade_level": ["13"]}');
select pg_temp.expect_reject('is_paid out of step with access_type', '{"is_paid": true}');
select pg_temp.expect_reject('jurisdiction out of step with province', '{"jurisdiction": "quebec"}');
select pg_temp.expect_reject('a flag written as false', '{"suppressed": false}');
select pg_temp.expect_reject('missing required field', '{}', 'publisher_creator');
select pg_temp.expect_reject('metadata missing a required key', '{"metadata": {"added_at": "x", "added_by": "y", "verified": true}}');
select pg_temp.expect_reject('unknown metadata key', '{"metadata": {"added_at": "x", "added_by": "y", "verified": true, "needs_review": false, "mood": "sunny"}}');
select pg_temp.expect_reject('off-vocabulary metadata.link_status', '{"metadata": {"added_at": "x", "added_by": "y", "verified": true, "needs_review": false, "link_status": "unchecked"}}');
select pg_temp.expect_reject('bad id', '{"id": "has spaces"}');

do $$
begin
  insert into public.link_checks (resource_id, url, method, link_status) values ('r-1', 'https://x', 'http', 'gone');
  raise exception 'FAIL accepted off-vocabulary link_checks.link_status';
exception when check_violation then
  raise notice 'ok   rejects off-vocabulary link_checks.link_status';
end
$$;

-- ── Audit log + revert ───────────────────────────────────────────────────────
do $$
declare
  v_batch uuid := gen_random_uuid();
  v_n integer;
  v_row public.resources;
begin
  perform set_config('mk.actor', 'test', true);
  perform set_config('mk.batch_id', v_batch::text, true);

  -- Partial metadata patch: provenance has to survive the merge.
  update public.resources
     set topic_title = 'Renamed',
         metadata = metadata || '{"verified": true, "needs_review": false}'
   where id = 'r-1';
  -- A no-op write is not a revision.
  update public.resources set topic_title = 'Renamed' where id = 'r-1';
  perform pg_temp.insert_rec((select rec from good) || '{"id": "r-2"}');
  delete from public.resources where id = 'r-2';

  select * into v_row from public.resources where id = 'r-1';
  assert v_row.metadata->>'added_by' = 'maple_key_team', 'metadata merge clobbered provenance';

  select count(*) into v_n from public.resource_revisions where batch_id = v_batch and actor = 'test';
  assert v_n = 3, format('expected 3 revisions in batch, got %s', v_n);

  v_n := public.revert_batch(v_batch);
  assert v_n = 3, format('revert_batch reverted %s, expected 3', v_n);
  select * into v_row from public.resources where id = 'r-1';
  assert v_row.topic_title = 'Mathies Data Tools', 'revert did not restore topic_title';
  assert (v_row.metadata->>'verified')::boolean = false, 'revert did not restore metadata';
  assert not exists (select 1 from public.resources where id = 'r-2'), 'revert left the inserted row';
  raise notice 'ok   revisions logged and batch reverted';
end
$$;

do $$
declare
  v_first uuid := gen_random_uuid();
begin
  perform set_config('mk.batch_id', v_first::text, true);
  update public.resources set topic_title = 'First' where id = 'r-1';
  perform set_config('mk.batch_id', gen_random_uuid()::text, true);
  update public.resources set topic_title = 'Second' where id = 'r-1';
  begin
    perform public.revert_batch(v_first);
  exception when raise_exception then
    raise notice 'ok   revert_batch refuses to clobber later work';
    return;
  end;
  raise exception 'FAIL revert_batch clobbered a later change';
end
$$;

-- ── Access ───────────────────────────────────────────────────────────────────
update public.resources set status = 'proposed' where id = 'r-1';
select pg_temp.insert_rec((select rec from good) || '{"id": "r-3"}');

set role anon;
do $$
begin
  assert (select count(*) from public.published_resources) = 1, 'anon should see only the live row in the view';
  assert (select count(*) from public.resources) = 1, 'anon should not see proposed rows';
  begin
    update public.resources set topic_title = 'vandal' where id = 'r-3';
    raise exception 'FAIL anon could update resources';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.resource_revisions;
    raise exception 'FAIL anon could read resource_revisions';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.revert_batch(gen_random_uuid());
    raise exception 'FAIL anon could call revert_batch';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok   anon reads live rows only and cannot write';
end
$$;
reset role;
