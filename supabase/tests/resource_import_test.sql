-- Import/export tests. Run by supabase/tests/run.sh after resource_schema_test.sql,
-- on a scratch database; any failed assertion raises and stops it.
\set ON_ERROR_STOP 1
\pset tuples_only on

-- resource_schema_test.sql leaves rows behind; start clean.
truncate public.resources, public.resource_revisions, public.removed_resources, public.link_checks;

-- Records covering every storage edge: a named grade, an explicit null
-- (nullable) usage_notes, a flag, an empty array, an absent optional field,
-- optional numeric fields, and metadata with optional keys.
create temp table doc as select $json$
{"meta": {"generated_at": "2026-09-01T03:46:07Z", "total_count": 3, "schema_version": "3.0"},
 "resources": [
  {"id": "r-10", "topic_title": "B", "description": "d", "url": "https://b.example/", "publisher_creator": "p",
   "grade_level": [7, 8], "grade_band": "intermediate", "subject": "Science", "strand": ["Life Systems"],
   "province": "ON", "jurisdiction": "ontario", "modality": ["Online"], "resource_type": "digital",
   "access_type": "free", "is_paid": false, "curriculum_expectations": ["A1.1"], "accessibility": ["No Concerns"],
   "instructional_modes": [], "usage_notes": null,
   "metadata": {"added_at": "2025-11-10", "added_by": "maple_key_team", "verified": false, "needs_review": true}},
  {"id": "r-2", "topic_title": "A", "description": "d", "url": "https://a.example/", "publisher_creator": "p",
   "grade_level": ["K", 1], "grade_band": "primary", "subject": "Math", "strand": ["Number", "Algebra"],
   "province": "BC", "jurisdiction": "british_columbia", "modality": ["Video"], "resource_type": "video",
   "access_type": "purchase", "is_paid": true, "curriculum_expectations": [], "accessibility": ["Some Concerns"],
   "instructional_modes": ["whole-class"], "usage_notes": "Use it.", "language": "fr", "is_collection": true,
   "estimated_minutes": 20, "year_published": 2019, "pedagogical_function": "hook", "tags": ["x"],
   "metadata": {"added_at": "2025-11-10", "added_by": "Ken", "verified": true, "needs_review": false,
                "link_status": "dead_domain", "link_checked_at": "2026-09-12T07:11:28Z", "review_priority": 2}},
  {"id": "r-3", "topic_title": "C", "description": "d", "url": "https://c.example/", "publisher_creator": "p",
   "grade_level": [12], "grade_band": "senior", "subject": "History", "strand": ["Heritage and Identity"],
   "province": "CANADA", "jurisdiction": "canada", "modality": ["Field Trip"], "resource_type": "physical",
   "access_type": "licensed", "is_paid": false, "curriculum_expectations": ["B2.3"], "accessibility": ["Not Accessible"],
   "instructional_modes": ["small-group"], "usage_notes": "x", "suppressed": true, "decomposed": true,
   "metadata": {"added_at": "2025-11-10", "added_by": "Sav", "verified": false, "needs_review": false}}
 ]}
$json$::jsonb as d;

do $$
declare
  v_doc jsonb := (select d from doc);
  v_out jsonb;
  v_res jsonb;
begin
  v_res := public.import_resources(v_doc);
  assert (v_res->>'inserted')::int = 3, format('first import: %s', v_res);

  -- Round trip: every record comes back exactly, in document order.
  v_out := public.export_published_resources();
  assert v_out->'resources' = v_doc->'resources', format('round trip differs: %s', v_out->'resources');
  assert (v_out->'meta'->>'total_count')::int = 3 and v_out->'meta'->>'schema_version' = '3.0', format('bad meta: %s', v_out->'meta');
  raise notice 'ok   export round-trips every record in document order';

  -- Re-importing the same document writes nothing.
  v_res := public.import_resources(v_doc);
  assert (v_res->>'unchanged')::int = 3, format('re-import: %s', v_res);
  assert (select count(*) from public.resource_revisions) = 3, 'a no-op re-import wrote revisions';
  raise notice 'ok   re-import of an unchanged document is a no-op';

  -- A changed record updates; a dropped one is archived only with p_prune.
  v_doc := jsonb_set(v_doc, '{resources}',
    jsonb_build_array(jsonb_set(v_doc->'resources'->0, '{topic_title}', '"B2"'), v_doc->'resources'->1));
  v_res := public.import_resources(v_doc);
  assert (v_res->>'updated')::int = 1 and (v_res->>'pruned')::int = 0, format('update import: %s', v_res);
  assert exists (select 1 from public.resources where id = 'r-3'), 'dropped row deleted without p_prune';
  v_res := public.import_resources(v_doc, true);
  assert (v_res->>'pruned')::int = 1, format('prune import: %s', v_res);
  assert not exists (select 1 from public.resources where id = 'r-3'), 'prune left the row';
  assert (select record->>'decomposed' from public.removed_resources where resource_id = 'r-3') = 'true',
    'pruned row not archived whole';
  raise notice 'ok   updates in place and archives pruned rows';

  -- Proposed rows never leave through the export.
  update public.resources set status = 'proposed' where id = 'r-2';
  assert jsonb_array_length(public.export_published_resources()->'resources') = 1, 'export leaked a proposed row';
  raise notice 'ok   export skips proposed rows';
end
$$;

do $$
begin
  perform public.import_resources('{"resources": [{"id": "r-99", "mood": "sunny"}]}');
  raise exception 'FAIL accepted an unknown field';
exception when raise_exception then
  if sqlerrm not like '%fields not in the schema%' then raise; end if;
  raise notice 'ok   import refuses unknown fields';
end
$$;

do $$
declare
  v_doc jsonb := (select d from doc);
begin
  perform public.import_resources(jsonb_set(v_doc, '{resources}', (v_doc->'resources') || (v_doc->'resources'->0)));
  raise exception 'FAIL accepted duplicate ids';
exception when raise_exception then
  if sqlerrm not like '%duplicate ids%' then raise; end if;
  raise notice 'ok   import refuses duplicate ids';
end
$$;

-- ── Link-health history ──────────────────────────────────────────────────────
do $$
declare
  v_res jsonb;
begin
  v_res := public.import_link_health(
    '{"links": {
        "https://a.example/": {"id": "r-2", "status": "dead_domain", "reason": "domain does not resolve (DNS)", "final_url": null, "last_checked": "2026-09-12T07:11:28Z"},
        "https://b.example/": {"id": "r-10", "status": "blocked", "reason": "proxy 403", "final_url": null, "last_checked": "2026-07-25T07:13:51Z"},
        "https://c.example/": {"id": "r-3", "status": "unchecked", "reason": "", "final_url": null, "last_checked": null}}}',
    '{"resources": {
        "https://a.example/": {"url": "https://a.example/", "content_hash": "abc", "last_checked": "2026-07-08T02:52:07+00:00", "last_dns_ok": false, "issues": ["dns_error"]},
        "https://b.example/": {"url": "https://b.example/", "content_hash": "def", "last_checked": "2026-07-08T02:52:07+00:00", "last_dns_ok": true, "issues": []}}}'
  );
  assert (v_res->>'verdicts')::int = 2 and (v_res->>'content_checks')::int = 2, format('link import: %s', v_res);
  assert (select method from public.link_checks where url = 'https://a.example/' and link_status is not null) = 'dns',
    'dead_domain verdict should be a dns check';
  assert (select reason from public.link_checks where url = 'https://a.example/' and method = 'content') = 'dns_error',
    'changelog issues not carried';
  begin
    perform public.import_link_health('{"links": {}}', '{"resources": {}}');
    raise exception 'FAIL link history imported twice';
  exception when raise_exception then
    if sqlerrm not like '%already imported%' then raise; end if;
  end;
  raise notice 'ok   link-health history imported once';
end
$$;
