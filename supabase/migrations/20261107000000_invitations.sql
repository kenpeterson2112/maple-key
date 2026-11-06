-- Accounts: invitations, invite acceptance, and solo-teacher signup.
--
-- How a person gets a profile (profiles has no self-insert policy, by design):
--   * Invited: an admin creates an invitation (RLS-scoped below); api/invitations.ts
--     then has Supabase Auth email them. On first sign-in the app calls
--     accept_pending_invitation(), which matches the signed-in user's verified
--     email to a pending invite and creates their profile with its org and role.
--   * Solo teacher: create_independent_workspace() makes an independent org and a
--     teacher profile. It is the only self-serve path; schools and districts are
--     provisioned by the operator (service role), then their admins invite staff.

-- Role/org-type fit, the same rule private.profiles_guard enforces.
create function private.role_fits_org(p_role text, p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_role
    when 'district_admin' then o.type = 'district'
    when 'school_admin'   then o.type = 'school'
    when 'teacher'        then o.type in ('school', 'independent')
    else false end
  from public.organizations o where o.id = p_org
$$;
revoke all on function private.role_fits_org(text, uuid) from public;
grant execute on function private.role_fits_org(text, uuid) to authenticated;

create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email           text not null check (email = lower(btrim(email)) and email like '%_@_%'),
  role            text not null default 'teacher'
                  check (role in ('district_admin', 'school_admin', 'teacher')),
  invited_by      uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null default now() + interval '14 days',
  accepted_at     timestamptz,
  accepted_by     uuid references auth.users (id) on delete set null
);
create index invitations_organization_id_idx on public.invitations (organization_id);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by);
-- One open invite per person per org; re-inviting replaces it (see the API).
create unique index invitations_pending_uniq on public.invitations (organization_id, email)
  where accepted_at is null;
create index invitations_pending_email_idx on public.invitations (email) where accepted_at is null;

alter table public.invitations enable row level security;
revoke all on public.invitations from anon, public;
grant select, insert, delete on public.invitations to authenticated;

-- Admins see, create and revoke invites for orgs in their scope, never for a
-- role above their own, and the role must fit the org (the profiles guard would
-- refuse it at acceptance anyway; failing here gives the admin a clear error).
create policy invitations_select on public.invitations for select to authenticated
  using ((select private.current_role()) in ('school_admin', 'district_admin')
         and organization_id = any ((select private.visible_org_ids())::uuid[]));

create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    (select private.current_role()) in ('school_admin', 'district_admin')
    and organization_id = any ((select private.visible_org_ids())::uuid[])
    and private.role_rank(role) <= private.role_rank((select private.current_role()))
    and invited_by = (select auth.uid())
    and accepted_at is null and accepted_by is null
    and private.role_fits_org(role, organization_id)
  );

create policy invitations_delete on public.invitations for delete to authenticated
  using ((select private.current_role()) in ('school_admin', 'district_admin')
         and organization_id = any ((select private.visible_org_ids())::uuid[])
         and accepted_at is null);

-- Called by the app right after sign-in. Returns the joined org id, or null when
-- there is nothing to accept (already has a profile, or no matching invite).
-- Matches on auth.users.email, and only once that email is confirmed, so a
-- user cannot claim an invite by signing up with someone else's address.
create function public.accept_pending_invitation()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid   uuid := auth.uid();
  addr  text;
  inv   public.invitations%rowtype;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = uid) then
    return null;
  end if;

  select lower(u.email) into addr
    from auth.users u where u.id = uid and u.email_confirmed_at is not null;
  if addr is null then
    return null;
  end if;

  select * into inv from public.invitations i
   where i.email = addr and i.accepted_at is null and i.expires_at > now()
   order by i.created_at desc
   limit 1
   for update;
  if not found then
    return null;
  end if;

  insert into public.profiles (id, organization_id, role, full_name)
  select uid, inv.organization_id, inv.role,
         nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), '')
    from auth.users u where u.id = uid;

  update public.invitations
     set accepted_at = now(), accepted_by = uid
   where id = inv.id;

  return inv.organization_id;
end
$$;

-- Solo-teacher signup. Refuses when the user already has a profile, or has a
-- pending invite (they should join that school instead of starting alone).
create function public.create_independent_workspace(p_workspace_name text, p_full_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid := auth.uid();
  org_id uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = uid) then
    raise exception 'you already have a workspace' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.invitations i join auth.users u on lower(u.email) = i.email
     where u.id = uid and u.email_confirmed_at is not null
       and i.accepted_at is null and i.expires_at > now()
  ) then
    raise exception 'you have a pending invitation; accept it instead' using errcode = '23505';
  end if;
  if length(btrim(coalesce(p_workspace_name, ''))) = 0 then
    raise exception 'workspace name is required' using errcode = '23514';
  end if;

  insert into public.organizations (name, type)
  values (left(btrim(p_workspace_name), 120), 'independent')
  returning id into org_id;

  insert into public.profiles (id, organization_id, role, full_name)
  values (uid, org_id, 'teacher', nullif(left(btrim(coalesce(p_full_name, '')), 120), ''));

  return org_id;
end
$$;

revoke all on function public.accept_pending_invitation() from public, anon;
revoke all on function public.create_independent_workspace(text, text) from public, anon;
grant execute on function public.accept_pending_invitation() to authenticated;
grant execute on function public.create_independent_workspace(text, text) to authenticated;
