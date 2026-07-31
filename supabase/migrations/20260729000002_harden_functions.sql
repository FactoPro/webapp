-- Pin search_path on set_updated_at (was mutable).
alter function public.set_updated_at() set search_path = public;

-- handle_new_user is only meant to be invoked by the on_auth_user_created
-- trigger, never called directly over the REST/RPC API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
