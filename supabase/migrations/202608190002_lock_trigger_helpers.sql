-- NCTB Kids release hardening
-- Trigger helper functions are invoked by database triggers and should not be
-- directly executable from mobile/web client roles.

begin;

revoke all
on function public.handle_new_auth_user()
from public, anon, authenticated;

revoke all
on function public.apply_approved_parent_child_name()
from public, anon, authenticated;

commit;
