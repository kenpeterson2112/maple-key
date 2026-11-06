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
-- Writes go through the Vercel function with the secret key; reads go
-- through get_activity, which returns one activity by id (no listing).
alter table public.activities enable row level security;

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
