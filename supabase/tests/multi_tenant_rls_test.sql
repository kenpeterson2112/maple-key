-- RLS tests for organizations / profiles / lessons. Run by supabase/tests/run.sh
-- against a freshly migrated scratch database; any failed assertion raises.
\set ON_ERROR_STOP 1

-- Fixture: district D (schools S1, S2), private school P, independent workspace I.
insert into public.organizations (id, name, type, parent_id) values
  ('00000000-0000-0000-0000-0000000000d0', 'District', 'district', null),
  ('00000000-0000-0000-0000-0000000000a1', 'School 1', 'school', '00000000-0000-0000-0000-0000000000d0'),
  ('00000000-0000-0000-0000-0000000000a2', 'School 2', 'school', '00000000-0000-0000-0000-0000000000d0'),
  ('00000000-0000-0000-0000-0000000000b0', 'Private', 'school', null),
  ('00000000-0000-0000-0000-0000000000c0', 'Solo', 'independent', null);

insert into auth.users (id) select ('00000000-0000-0000-0000-00000000001' || n)::uuid from generate_series(0, 6) n;
insert into public.profiles (id, organization_id, role) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-0000000000d0', 'district_admin'), -- da
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000a1', 'school_admin'),   -- sa1
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000a1', 'teacher'),        -- t1
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000a2', 'teacher'),        -- t2
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-0000000000b0', 'school_admin'),   -- pa
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-0000000000b0', 'teacher'),        -- pt
  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-0000000000c0', 'teacher');        -- solo

insert into public.lessons (organization_id, created_by, title)
select o.id, null, o.name || ' lesson' from public.organizations o;

create function pg_temp.act_as(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000' || p_uid)::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.expect(p_label text, p_got bigint, p_want bigint) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL %: got %, want %', p_label, p_got, p_want;
  end if;
end $$;

create function pg_temp.expect_denied(p_label text, p_sql text) returns void language plpgsql as $$
declare n bigint;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
  exception when insufficient_privilege or check_violation then
    return;
  end;
  if n > 0 then raise exception 'FAIL %: % row(s) affected, want denial', p_label, n; end if;
end $$;

-- Lesson visibility per tenant shape.
begin; select pg_temp.act_as('10'); select pg_temp.expect('district admin sees district + 2 schools', (select count(*) from public.lessons), 3); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect('school admin sees own school', (select count(*) from public.lessons), 1); rollback;
begin; select pg_temp.act_as('12'); select pg_temp.expect('district teacher sees own school', (select count(*) from public.lessons), 1); rollback;
begin; select pg_temp.act_as('15'); select pg_temp.expect('private teacher sees own school', (select count(*) from public.lessons), 1); rollback;
begin; select pg_temp.act_as('16'); select pg_temp.expect('solo sees own workspace', (select count(*) from public.lessons), 1); rollback;
begin; select pg_temp.expect('no JWT sees nothing', (select count(*) from public.lessons l where l.organization_id = any (private.visible_org_ids())), 0); rollback;

-- Profile visibility.
begin; select pg_temp.act_as('10'); select pg_temp.expect('district admin sees all district profiles', (select count(*) from public.profiles), 4); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect('school admin sees own school profiles', (select count(*) from public.profiles), 2); rollback;
begin; select pg_temp.act_as('12'); select pg_temp.expect('teacher sees only self', (select count(*) from public.profiles), 1); rollback;
begin; select pg_temp.act_as('14'); select pg_temp.expect('private admin sees own school only', (select count(*) from public.profiles), 2); rollback;

-- Writes inside scope work.
begin; select pg_temp.act_as('12');
  insert into public.lessons (organization_id, title) values ('00000000-0000-0000-0000-0000000000a1', 'mine');
  select pg_temp.expect('created_by defaults to caller', (select count(*) from public.lessons where title = 'mine' and created_by = '00000000-0000-0000-0000-000000000012'), 1);
  update public.profiles set full_name = 'T One' where id = '00000000-0000-0000-0000-000000000012';
rollback;
begin; select pg_temp.act_as('10');
  insert into public.organizations (name, type, parent_id) values ('School 3', 'school', '00000000-0000-0000-0000-0000000000d0');
  update public.lessons set title = 'edited' where organization_id = '00000000-0000-0000-0000-0000000000a2';
  update public.profiles set role = 'school_admin' where id = '00000000-0000-0000-0000-000000000013';
rollback;

-- Cross-tenant and escalation attempts are denied.
begin; select pg_temp.act_as('12'); select pg_temp.expect_denied('teacher writes into sibling school',
  $$insert into public.lessons (organization_id, title) values ('00000000-0000-0000-0000-0000000000a2', 'x')$$); rollback;
begin; select pg_temp.act_as('16'); select pg_temp.expect_denied('solo updates private school lesson',
  $$update public.lessons set title = 'x' where organization_id = '00000000-0000-0000-0000-0000000000b0'$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('school admin deletes sibling school lesson',
  $$delete from public.lessons where organization_id = '00000000-0000-0000-0000-0000000000a2'$$); rollback;
begin; select pg_temp.act_as('12'); select pg_temp.expect_denied('teacher moves lesson out of scope',
  $$update public.lessons set organization_id = '00000000-0000-0000-0000-0000000000a2' where organization_id = '00000000-0000-0000-0000-0000000000a1'$$); rollback;
begin; select pg_temp.act_as('12'); select pg_temp.expect_denied('teacher forges created_by',
  $$insert into public.lessons (organization_id, title, created_by) values ('00000000-0000-0000-0000-0000000000a1', 'x', '00000000-0000-0000-0000-000000000011')$$); rollback;
begin; select pg_temp.act_as('12'); select pg_temp.expect_denied('teacher promotes self',
  $$update public.profiles set role = 'school_admin' where id = '00000000-0000-0000-0000-000000000012'$$); rollback;
begin; select pg_temp.act_as('12'); select pg_temp.expect_denied('teacher changes own org',
  $$update public.profiles set organization_id = '00000000-0000-0000-0000-0000000000a2' where id = '00000000-0000-0000-0000-000000000012'$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('school admin grants district_admin',
  $$update public.profiles set role = 'district_admin' where id = '00000000-0000-0000-0000-000000000012'$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('school admin edits district admin',
  $$update public.profiles set full_name = 'x' where id = '00000000-0000-0000-0000-000000000010'$$); rollback;
begin; select pg_temp.act_as('16'); select pg_temp.expect_denied('solo self-inserts into another org',
  $$insert into public.profiles (id, organization_id, role) values ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-0000000000b0', 'school_admin')$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('school admin creates org',
  $$insert into public.organizations (name, type, parent_id) values ('x', 'school', '00000000-0000-0000-0000-0000000000d0')$$); rollback;
begin; select pg_temp.act_as('14'); select pg_temp.expect_denied('private admin reparents into district',
  $$update public.organizations set parent_id = '00000000-0000-0000-0000-0000000000d0' where id = '00000000-0000-0000-0000-0000000000b0'$$); rollback;

-- Structural rules.
begin; select pg_temp.expect_denied('school under a school',
  $$insert into public.organizations (name, type, parent_id) values ('x', 'school', '00000000-0000-0000-0000-0000000000a1')$$); rollback;
begin; select pg_temp.expect_denied('district with a parent',
  $$insert into public.organizations (name, type, parent_id) values ('x', 'district', '00000000-0000-0000-0000-0000000000d0')$$); rollback;
begin; select pg_temp.expect_denied('teacher placed in a district org',
  $$update public.profiles set organization_id = '00000000-0000-0000-0000-0000000000d0' where id = '00000000-0000-0000-0000-000000000012'$$); rollback;
begin; select pg_temp.expect_denied('district with schools changes type',
  $$update public.organizations set type = 'independent' where id = '00000000-0000-0000-0000-0000000000d0'$$); rollback;

-- anon has no table access at all.
begin; set local role anon; select pg_temp.expect_denied('anon reads lessons', $$select 1 from public.lessons$$); rollback;

select 'OK   multi-tenant RLS tests passed';
