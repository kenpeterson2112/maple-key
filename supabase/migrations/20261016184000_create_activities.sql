-- Applied to the "Maple Key" Supabase project (ca-central-1) on 2026-10-16.
-- Shared student activities (fill-in graphic organizers).
-- Teacher-written content only: no student data is stored here.
create table public.activities (
  id text primary key check (id ~ '^[a-z2-9]{8}$'),
  payload jsonb not null check (pg_column_size(payload) < 16384),
  edit_token_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS on with no policies: the table is unreachable through the public API.
-- api/activities.ts reads and writes it with the secret key.
alter table public.activities enable row level security;

-- Also applied, but unused: a by-id lookup callable with the public key,
-- from an earlier design where students read directly from Supabase. Safe to
-- drop (`drop function public.get_activity(text);`); reads now go through the
-- API so the public key reaches nothing.
create function public.get_activity(p_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select payload from public.activities where id = p_id
$$;

revoke all on function public.get_activity(text) from public;
grant execute on function public.get_activity(text) to anon, authenticated;
