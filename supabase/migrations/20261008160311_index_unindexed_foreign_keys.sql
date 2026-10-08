-- Foreign keys without a covering index force a sequential scan on the
-- referencing side whenever a parent row is updated or deleted, and slow
-- joins. Reported by the Supabase linter as unindexed_foreign_keys.
--
-- Matching the version already applied to the live project
-- (index_unindexed_foreign_keys, 20261008160311).

create index if not exists menu_items_restaurant_id_idx on public.menu_items (restaurant_id);
create index if not exists orders_restaurant_id_idx on public.orders (restaurant_id);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists restaurants_owner_id_idx on public.restaurants (owner_id);