-- Trigger functions are only ever meant to run as triggers. Supabase grants
-- execute on new functions to its API roles by default, which exposed them as
-- /rest/v1/rpc endpoints (flagged by the security advisor for the security
-- definer one). Guarded so the migration also runs on a plain Postgres.
revoke all on function public.resources_log_revision() from public;
revoke all on function public.resources_touch_updated_at() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.resources_log_revision() from anon, authenticated;
    revoke all on function public.resources_touch_updated_at() from anon, authenticated;
  end if;
end
$$;
