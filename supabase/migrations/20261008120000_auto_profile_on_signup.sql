-- Create the profiles row automatically on signup.
--
-- The app used to insert this from the browser right after signUp(), which is
-- unreliable: when "Confirm email" is enabled Supabase returns a user but no
-- session, so the insert is rejected by RLS and the account ends up with no
-- profile at all. A trigger runs inside the auth transaction with full rights.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, preferred_language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    coalesce(new.raw_user_meta_data ->> 'preferred_language', 'fr')
  )
  on conflict (id) do update
    set full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
        phone      = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
        role       = public.profiles.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill any account that signed up before this trigger existed.
insert into public.profiles (id, full_name, phone, role, preferred_language)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', ''),
  coalesce(u.raw_user_meta_data ->> 'phone', ''),
  coalesce(u.raw_user_meta_data ->> 'role', 'client'),
  coalesce(u.raw_user_meta_data ->> 'preferred_language', 'fr')
from auth.users u
on conflict (id) do nothing;