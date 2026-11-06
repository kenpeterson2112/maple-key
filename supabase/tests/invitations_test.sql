-- Tests for invitations, accept_pending_invitation() and
-- create_independent_workspace(). Runs after multi_tenant_rls_test.sql and
-- reuses its fixture: district D0 (schools A1, A2), private school B0, solo C0;
-- users 10 = district admin, 11 = school admin A1, 12 = teacher A1, 16 = solo.
\set ON_ERROR_STOP 1

create function pg_temp.act_as(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000' || p_uid)::text, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.expect(p_label text, p_got bigint, p_want bigint) returns void language plpgsql as $$
begin
  if p_got is distinct from p_want then raise exception 'FAIL %: got %, want %', p_label, p_got, p_want; end if;
end $$;

create function pg_temp.expect_denied(p_label text, p_sql text) returns void language plpgsql as $$
declare n bigint;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
  exception when insufficient_privilege or check_violation or unique_violation then
    return;
  end;
  if n > 0 then raise exception 'FAIL %: % row(s) affected, want denial', p_label, n; end if;
end $$;

-- New, profile-less auth users: 20 confirmed, 21 unconfirmed, 22 confirmed (solo).
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000020', 'new.teacher@school.test', now(), '{"full_name": "New Teacher"}'),
  ('00000000-0000-0000-0000-000000000021', 'unconfirmed@school.test', null, '{}'),
  ('00000000-0000-0000-0000-000000000022', 'solo@home.test', now(), '{"name": "Solo Person"}');

-- Admins create invites in scope.
begin; select pg_temp.act_as('11');
  insert into public.invitations (organization_id, email, role)
  values ('00000000-0000-0000-0000-0000000000a1', 'new.teacher@school.test', 'teacher'),
         ('00000000-0000-0000-0000-0000000000a1', 'unconfirmed@school.test', 'teacher');
commit;

begin; select pg_temp.act_as('10');
  select pg_temp.expect('district admin sees school invites', (select count(*) from public.invitations), 2);
rollback;
begin; select pg_temp.act_as('12');
  select pg_temp.expect('teacher sees no invites', (select count(*) from public.invitations), 0);
rollback;
begin; select pg_temp.act_as('14');
  select pg_temp.expect('other school admin sees none', (select count(*) from public.invitations), 0);
rollback;

-- Invite authorization.
begin; select pg_temp.act_as('12'); select pg_temp.expect_denied('teacher invites',
  $$insert into public.invitations (organization_id, email) values ('00000000-0000-0000-0000-0000000000a1', 'x@y.test')$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('school admin invites into sibling school',
  $$insert into public.invitations (organization_id, email) values ('00000000-0000-0000-0000-0000000000a2', 'x@y.test')$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('school admin invites a district admin',
  $$insert into public.invitations (organization_id, email, role) values ('00000000-0000-0000-0000-0000000000a1', 'x@y.test', 'district_admin')$$); rollback;
begin; select pg_temp.act_as('10'); select pg_temp.expect_denied('teacher invited into a district org',
  $$insert into public.invitations (organization_id, email, role) values ('00000000-0000-0000-0000-0000000000d0', 'x@y.test', 'teacher')$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('forged invited_by',
  $$insert into public.invitations (organization_id, email, invited_by) values ('00000000-0000-0000-0000-0000000000a1', 'x@y.test', '00000000-0000-0000-0000-000000000010')$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('pre-accepted invite',
  $$insert into public.invitations (organization_id, email, accepted_at) values ('00000000-0000-0000-0000-0000000000a1', 'x@y.test', now())$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('mixed-case email',
  $$insert into public.invitations (organization_id, email) values ('00000000-0000-0000-0000-0000000000a1', 'X@Y.test')$$); rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('duplicate pending invite',
  $$insert into public.invitations (organization_id, email) values ('00000000-0000-0000-0000-0000000000a1', 'new.teacher@school.test')$$); rollback;
begin; set local role anon; select pg_temp.expect_denied('anon reads invites', $$select 1 from public.invitations$$); rollback;

-- Unconfirmed email cannot claim an invite.
begin; select pg_temp.act_as('21');
  select pg_temp.expect('unconfirmed email accepts nothing', (select count(*) from (select public.accept_pending_invitation() as o) x where o is not null), 0);
rollback;

-- Invited, confirmed user joins the school as a teacher.
begin; select pg_temp.act_as('20');
  select pg_temp.expect('accept returns the org', (select count(*) from (select public.accept_pending_invitation() as o) x where o = '00000000-0000-0000-0000-0000000000a1'), 1);
commit;
select pg_temp.expect('profile created with invite role and name',
  (select count(*) from public.profiles where id = '00000000-0000-0000-0000-000000000020'
     and organization_id = '00000000-0000-0000-0000-0000000000a1' and role = 'teacher' and full_name = 'New Teacher'), 1);
select pg_temp.expect('invite marked accepted',
  (select count(*) from public.invitations where email = 'new.teacher@school.test' and accepted_by = '00000000-0000-0000-0000-000000000020'), 1);
begin; select pg_temp.act_as('20');
  select pg_temp.expect('second accept is a no-op', (select count(*) from (select public.accept_pending_invitation() as o) x where o is not null), 0);
  select pg_temp.expect('new teacher sees school lessons', (select count(*) from public.lessons), 1);
rollback;
begin; select pg_temp.act_as('11'); select pg_temp.expect_denied('accepted invite cannot be revoked',
  $$delete from public.invitations where email = 'new.teacher@school.test'$$); rollback;

-- Expired invites are ignored.
update public.invitations set expires_at = now() - interval '1 day' where email = 'unconfirmed@school.test';
update auth.users set email_confirmed_at = now() where id = '00000000-0000-0000-0000-000000000021';
begin; select pg_temp.act_as('21');
  select pg_temp.expect('expired invite accepts nothing', (select count(*) from (select public.accept_pending_invitation() as o) x where o is not null), 0);
rollback;

-- Solo signup.
begin; select pg_temp.act_as('22');
  select public.create_independent_workspace('Solo Studio', 'Solo Person');
commit;
select pg_temp.expect('solo workspace created',
  (select count(*) from public.profiles p join public.organizations o on o.id = p.organization_id
    where p.id = '00000000-0000-0000-0000-000000000022' and o.type = 'independent' and p.role = 'teacher'), 1);
begin; select pg_temp.act_as('22'); select pg_temp.expect_denied('second workspace refused',
  $$select public.create_independent_workspace('Again')$$); rollback;
begin; select pg_temp.act_as('22');
  select pg_temp.expect('solo sees only own org', (select count(*) from public.organizations), 1);
rollback;

-- A user with a pending invite is pointed at it instead of starting alone.
insert into auth.users (id, email, email_confirmed_at) values ('00000000-0000-0000-0000-000000000023', 'pending@school.test', now());
begin; select pg_temp.act_as('11');
  insert into public.invitations (organization_id, email) values ('00000000-0000-0000-0000-0000000000a1', 'pending@school.test');
commit;
begin; select pg_temp.act_as('23'); select pg_temp.expect_denied('solo signup with pending invite',
  $$select public.create_independent_workspace('Mine')$$); rollback;

-- Revoking a pending invite works; anon cannot call the functions.
begin; select pg_temp.act_as('11');
  delete from public.invitations where email = 'pending@school.test';
  select pg_temp.expect('pending invite revoked', (select count(*) from public.invitations where email = 'pending@school.test'), 0);
rollback;
begin; set local role anon; select pg_temp.expect_denied('anon accepts', $$select public.accept_pending_invitation()$$); rollback;

select 'OK   invitation tests passed';
