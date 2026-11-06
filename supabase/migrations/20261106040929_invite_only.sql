-- Invite-only accounts: remove self-serve solo signup.
--
-- Every account now starts from an invitation (accept_pending_invitation).
-- Existing independent workspaces keep working; new solo teachers are set up by
-- the operator (an independent org plus an invite; see supabase/README.md).
drop function public.create_independent_workspace(text, text);
