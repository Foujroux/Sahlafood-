-- handle_new_user() is a trigger function. The trigger on auth.users invokes it
-- inside the auth transaction as the table owner, so it never needs to be
-- callable over PostgREST.
--
-- Without this revoke, SECURITY DEFINER + default EXECUTE grants exposed the
-- function to anon and authenticated roles at /rest/v1/rpc/handle_new_user,
-- which the Supabase linter flags as anon_security_definer_function_executable
-- and authenticated_security_definer_function_executable.
--
-- Matching the versions already applied to the live project
-- (revoke_handle_new_user_execute, 20261008160307).

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;