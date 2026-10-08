-- Recreates the Sahlafood schema and reference data in a fresh Neon project.
--
-- Written for a region move: Neon cannot change a project's region in place, so
-- the target project starts empty and this script rebuilds it, including the
-- auth users (with their original UUIDs, so profiles/owner_id keep matching).
--
-- Usage: run each numbered block separately; Neon rejects multiple commands in
-- one prepared statement.

-- ---------------------------------------------------------------------------
-- 1. Roles
-- ---------------------------------------------------------------------------
-- Neon ships no anon/authenticated roles, so RLS policies would have nothing to
-- apply to. app_user is what the app connects as.
-- Role creation needs the app password, and it must not live in this file.
-- Pass it as a session GUC so it never appears in shell history or in a diff:
--
--   psql "$ADMIN_DATABASE_URL" \
--     -c "set app.bootstrap_password = '...'" \
--     -f scripts/neon-bootstrap.sql
--
-- Rotate the app password from the Neon console, not by editing this file.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    -- nosuperuser matters: with it this role would bypass the RLS policies
    -- below and could read every user's rows.
    declare pw text := current_setting('app.bootstrap_password', true);
    begin
      if pw is null or pw = '' then
        raise exception
          'app.bootstrap_password is not set; see the header of this file';
      end if;
      -- format with %L quotes the value, so a password containing a quote
      -- cannot break out of the statement.
      execute format(
        'create role app_user login password %L nosuperuser nocreatedb nocreaterole noinherit',
        pw
      );
    end;
  end if;
  -- No ALTER here on purpose: changing an existing role's password requires
  -- being the role's owner, which the database owner is not. Rotate the app
  -- password from the Neon console instead.
end $$;

-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------
-- Foreign keys target neon_auth."user" rather than Supabase's auth.users.
create table if not exists public.profiles (
  id uuid primary key references neon_auth."user"(id) on delete cascade,
  full_name text, phone text, wilaya text, commune text, address text,
  role text default 'client',
  vehicle_type text, vehicle_brand text, vehicle_model text, vehicle_plate text,
  vehicle_year integer, vehicle_color text,
  preferred_language text default 'fr',
  created_at timestamptz default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name_fr text not null, name_ar text not null, type text not null,
  category_fr text, category_ar text, phone text, address text,
  wilaya text, commune text, lat double precision, lng double precision,
  rating numeric default 4.0, is_open boolean default true,
  avg_delivery_min integer default 30, image text,
  created_at timestamptz default now(),
  owner_id uuid references neon_auth."user"(id)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name_fr text not null, name_ar text not null, price numeric not null,
  category_fr text, category_ar text, image text
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references neon_auth."user"(id),
  restaurant_id uuid references public.restaurants(id),
  items jsonb, delivery_vehicle text, delivery_fee numeric default 0,
  total numeric not null, status text default 'pending', address text,
  lat double precision, lng double precision,
  payment_method text default 'cash_on_delivery',
  created_at timestamptz default now()
);

create index if not exists menu_items_restaurant_id_idx on public.menu_items (restaurant_id);
create index if not exists orders_restaurant_id_idx on public.orders (restaurant_id);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists restaurants_owner_id_idx on public.restaurants (owner_id);

-- ---------------------------------------------------------------------------
-- 3. Row level security
-- ---------------------------------------------------------------------------
-- Supabase's auth.uid() has no Neon equivalent, so identity is read from
-- neon_auth.user_id, which the server sets per transaction with
-- `set local`. Policies therefore enforce isolation in the database rather
-- than trusting the application layer.
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;

create or replace function public.current_user_id() returns uuid
language sql stable as $$
  select nullif(current_setting('neon_auth.user_id', true), '')::uuid
$$;

revoke execute on function public.current_user_id() from public;
grant execute on function public.current_user_id() to anon, authenticated, app_user;

-- Policies don't support IF NOT EXISTS, so each is dropped first. This keeps the
-- whole file re-runnable against a project that was partially set up.
drop policy if exists "public read restaurants" on public.restaurants;
drop policy if exists "owner insert restaurants" on public.restaurants;
drop policy if exists "owner update restaurants" on public.restaurants;
drop policy if exists "public read menu" on public.menu_items;
drop policy if exists "owner insert menu" on public.menu_items;
drop policy if exists "owner update menu" on public.menu_items;
drop policy if exists "owner delete menu" on public.menu_items;
drop policy if exists "own profile" on public.profiles;
drop policy if exists "own orders insert" on public.orders;
drop policy if exists "own orders read" on public.orders;
drop policy if exists "own orders update" on public.orders;

create policy "public read restaurants" on public.restaurants
  for select using (true);
create policy "owner insert restaurants" on public.restaurants
  for insert with check (public.current_user_id() = owner_id);
create policy "owner update restaurants" on public.restaurants
  for update using (public.current_user_id() = owner_id)
  with check (public.current_user_id() = owner_id);

create policy "public read menu" on public.menu_items
  for select using (true);
create policy "owner insert menu" on public.menu_items
  for insert with check (exists (select 1 from restaurants r
    where r.id = menu_items.restaurant_id and r.owner_id = public.current_user_id()));
create policy "owner update menu" on public.menu_items
  for update using (exists (select 1 from restaurants r
    where r.id = menu_items.restaurant_id and r.owner_id = public.current_user_id()));
create policy "owner delete menu" on public.menu_items
  for delete using (exists (select 1 from restaurants r
    where r.id = menu_items.restaurant_id and r.owner_id = public.current_user_id()));

create policy "own profile" on public.profiles
  for all using (public.current_user_id() = id)
  with check (public.current_user_id() = id);

create policy "own orders insert" on public.orders
  for insert with check (public.current_user_id() = user_id);
create policy "own orders read" on public.orders
  for select using (public.current_user_id() = user_id);
create policy "own orders update" on public.orders
  for update using (public.current_user_id() = user_id)
  with check (public.current_user_id() = user_id);

-- ---------------------------------------------------------------------------
-- 4. Grants
-- ---------------------------------------------------------------------------
-- Least privilege: the public catalogue is readable, writes are limited to the
-- tables the app actually mutates.
grant usage on schema public to anon, authenticated, app_user;
grant usage on schema neon_auth to app_user;

grant select on public.restaurants, public.menu_items to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.restaurants to authenticated;
grant select, insert, update, delete on public.menu_items to authenticated;
grant select, insert, update on public.orders to authenticated;

grant select on public.restaurants, public.menu_items to app_user;
grant select, insert, update on public.profiles to app_user;
grant select, insert, update on public.restaurants to app_user;
grant select, insert, update, delete on public.menu_items to app_user;
grant select, insert, update on public.orders to app_user;

grant connect on database neondb to app_user;