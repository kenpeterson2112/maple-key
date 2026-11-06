-- Hierarchical multi-tenancy: organizations → profiles → lessons.
--
-- Three tenant shapes share these tables:
--   independent           a solo teacher's workspace (no parent, teachers only)
--   school, no parent     a standalone private school
--   district → school     a public district; each school's parent_id is the district
--
-- The tree is at most two levels deep (enforced below), so "everything a user may
-- see" is always: their own org, plus that org's direct children when they are a
-- district admin. private.visible_org_ids() computes that set once per statement;
-- every policy is a flat `organization_id = any(<set>)` over an indexed column.
-- No policy reads profiles/organizations directly, so there is no RLS recursion.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) > 0),
  type       text not null check (type in ('district', 'school', 'independent')),
  parent_id  uuid references public.organizations (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_id is null or type = 'school'),
  check (parent_id is distinct from id)
);
create index organizations_parent_id_idx on public.organizations (parent_id);

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete restrict,
  role            text not null default 'teacher'
                  check (role in ('district_admin', 'school_admin', 'teacher')),
  full_name       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index profiles_organization_id_idx on public.profiles (organization_id);

create table public.lessons (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  title           text not null,
  content         jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index lessons_organization_id_idx on public.lessons (organization_id);
create index lessons_created_by_idx on public.lessons (created_by);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers. SECURITY DEFINER so they read profiles/organizations without
-- re-entering RLS; STABLE so the planner can evaluate them once per statement
-- when a policy wraps them in a scalar subquery: `(select private.fn())`.
-- ---------------------------------------------------------------------------

create function private.current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

create function private.role_rank(p_role text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case p_role when 'teacher' then 1 when 'school_admin' then 2 when 'district_admin' then 3 else 0 end
$$;

-- Own org, plus direct children for a district admin. Empty for a user with no
-- profile or no org. One index lookup on profiles, one on organizations.parent_id.
create function private.visible_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select array_agg(o.id)
       from public.profiles p
       join public.organizations o
         on o.id = p.organization_id
         or (p.role = 'district_admin' and o.parent_id = p.organization_id)
      where p.id = auth.uid()),
    '{}'::uuid[])
$$;

revoke all on function private.current_role(), private.role_rank(text), private.visible_org_ids() from public;
grant execute on function private.current_role(), private.role_rank(text), private.visible_org_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Integrity guards (rules a CHECK cannot express because they span rows)
-- ---------------------------------------------------------------------------

-- Org tree: a school's parent must be a district; a district with schools cannot
-- change type. Keeps the tree two levels deep, which visible_org_ids relies on.
create function private.organizations_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.organizations d where d.id = new.parent_id and d.type = 'district'
  ) then
    raise exception 'a school''s parent must be a district' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.type = 'district' and new.type <> 'district' and exists (
    select 1 from public.organizations c where c.parent_id = old.id
  ) then
    raise exception 'district % still has schools', old.id using errcode = '23514';
  end if;
  return new;
end
$$;

create trigger organizations_guard before insert or update of type, parent_id on public.organizations
  for each row execute function private.organizations_guard();

-- Profiles: role must fit the org type, and nobody can raise their own access.
-- Requests with no JWT (service role, migrations, auth hooks) are trusted.
create function private.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org_type text;
begin
  if new.organization_id is not null then
    select o.type into org_type from public.organizations o where o.id = new.organization_id;
    if (new.role = 'district_admin' and org_type <> 'district')
       or (new.role = 'school_admin' and org_type <> 'school')
       or (new.role = 'teacher' and org_type = 'district') then
      raise exception 'role % does not fit a % organization', new.role, org_type using errcode = '23514';
    end if;
  end if;

  if auth.uid() is not null and tg_op = 'UPDATE' then
    if new.id <> old.id then
      raise exception 'profile id is immutable' using errcode = '42501';
    end if;
    if new.id = auth.uid()
       and (new.role is distinct from old.role or new.organization_id is distinct from old.organization_id) then
      raise exception 'you cannot change your own role or organization' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;

create trigger profiles_guard before insert or update on public.profiles
  for each row execute function private.profiles_guard();

create function private.lessons_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by and auth.uid() is not null then
    raise exception 'created_by is immutable' using errcode = '42501';
  end if;
  return new;
end
$$;

create trigger lessons_guard before update of created_by on public.lessons
  for each row execute function private.lessons_guard();

-- ---------------------------------------------------------------------------
-- Grants: authenticated only; anon gets nothing. RLS below narrows rows.
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.lessons       enable row level security;

revoke all on public.organizations, public.profiles, public.lessons from anon, public;
grant select, insert, update, delete on public.organizations, public.profiles, public.lessons to authenticated;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create policy organizations_select on public.organizations for select to authenticated
  using (id = any ((select private.visible_org_ids())::uuid[]));

-- District admins create schools under their own district.
create policy organizations_insert on public.organizations for insert to authenticated
  with check (
    (select private.current_role()) = 'district_admin'
    and type = 'school'
    and parent_id = any ((select private.visible_org_ids())::uuid[])
  );

-- Admins rename orgs in scope; they cannot re-parent a school out of it.
create policy organizations_update on public.organizations for update to authenticated
  using ((select private.current_role()) in ('school_admin', 'district_admin')
         and id = any ((select private.visible_org_ids())::uuid[]))
  with check (id = any ((select private.visible_org_ids())::uuid[])
              and (parent_id is null or parent_id = any ((select private.visible_org_ids())::uuid[])));

-- District admins remove their schools (blocked while profiles still point at them).
create policy organizations_delete on public.organizations for delete to authenticated
  using ((select private.current_role()) = 'district_admin'
         and parent_id = any ((select private.visible_org_ids())::uuid[]));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_admin on public.profiles for select to authenticated
  using ((select private.current_role()) in ('school_admin', 'district_admin')
         and organization_id = any ((select private.visible_org_ids())::uuid[]));

-- Own row: full_name etc. The guard trigger forbids self role/org changes.
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Admins manage people in scope, never granting a role above their own.
create policy profiles_update_admin on public.profiles for update to authenticated
  using ((select private.current_role()) in ('school_admin', 'district_admin')
         and organization_id = any ((select private.visible_org_ids())::uuid[])
         and private.role_rank(role) <= private.role_rank((select private.current_role())))
  with check (organization_id = any ((select private.visible_org_ids())::uuid[])
              and private.role_rank(role) <= private.role_rank((select private.current_role())));

-- Self-insert is deliberately absent: it would let a new user pick any org and
-- role. Profiles are provisioned by an admin (below) or server-side (service role).
create policy profiles_insert_admin on public.profiles for insert to authenticated
  with check ((select private.current_role()) in ('school_admin', 'district_admin')
              and organization_id = any ((select private.visible_org_ids())::uuid[])
              and private.role_rank(role) <= private.role_rank((select private.current_role())));

create policy profiles_delete_admin on public.profiles for delete to authenticated
  using ((select private.current_role()) in ('school_admin', 'district_admin')
         and id <> (select auth.uid())
         and organization_id = any ((select private.visible_org_ids())::uuid[])
         and private.role_rank(role) <= private.role_rank((select private.current_role())));

-- ---------------------------------------------------------------------------
-- lessons — the template for every future tenant-scoped resource table:
-- teachers/independents see exactly their org, school admins their school,
-- district admins the district plus every child school. All of it is the one set.
-- ---------------------------------------------------------------------------

create policy lessons_select on public.lessons for select to authenticated
  using (organization_id = any ((select private.visible_org_ids())::uuid[]));

create policy lessons_insert on public.lessons for insert to authenticated
  with check (organization_id = any ((select private.visible_org_ids())::uuid[])
              and created_by = (select auth.uid()));

create policy lessons_update on public.lessons for update to authenticated
  using (organization_id = any ((select private.visible_org_ids())::uuid[]))
  with check (organization_id = any ((select private.visible_org_ids())::uuid[]));

create policy lessons_delete on public.lessons for delete to authenticated
  using (organization_id = any ((select private.visible_org_ids())::uuid[]));
