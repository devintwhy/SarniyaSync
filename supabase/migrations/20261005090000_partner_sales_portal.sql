create table if not exists public.partner_store_inventory (
  id uuid primary key default gen_random_uuid(),
  partner_store_id uuid not null references public.partner_stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_store_id, product_id)
);

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(profiles.role)
  from public.profiles as profiles
  where profiles.id = auth.uid()
  limit 1
$$;

revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

alter table public.profiles enable row level security;
drop policy if exists "Profile owner and admin read" on public.profiles;
create policy "Profile owner and admin read"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or public.current_app_role() in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
);

alter table public.products enable row level security;
drop policy if exists "Allow anon full access to products" on public.products;
drop policy if exists "Authenticated users read products" on public.products;
create policy "Authenticated users read products"
on public.products
for select
to authenticated
using (true);

drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products"
on public.products
for all
to authenticated
using (public.current_app_role() in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner'))
with check (public.current_app_role() in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner'));

revoke all on table public.products from anon;
grant select, insert, update, delete on table public.products to authenticated;

alter table public.partner_stores enable row level security;
drop policy if exists "Partners and admins read stores" on public.partner_stores;
create policy "Partners and admins read stores"
on public.partner_stores
for select
to authenticated
using (
  owner_id = (select auth.uid())
  or public.current_app_role() in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
);

drop policy if exists "Admins manage partner stores" on public.partner_stores;
create policy "Admins manage partner stores"
on public.partner_stores
for all
to authenticated
using (public.current_app_role() in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner'))
with check (public.current_app_role() in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner'));

grant select, insert, update, delete on table public.partner_stores to authenticated;

alter table public.sales_transactions enable row level security;
drop policy if exists "Partners and admins read sales" on public.sales_transactions;
create policy "Partners and admins read sales"
on public.sales_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.partner_stores as stores
    where stores.id = sales_transactions.partner_store_id
      and stores.owner_id = (select auth.uid())
  )
  or public.current_app_role() in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
);
grant select on table public.sales_transactions to authenticated;

alter table public.partner_store_inventory enable row level security;

drop policy if exists "Partners read own store inventory" on public.partner_store_inventory;
create policy "Partners read own store inventory"
on public.partner_store_inventory
for select
to authenticated
using (
  exists (
    select 1
    from public.partner_stores as stores
    where stores.id = partner_store_inventory.partner_store_id
      and stores.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and lower(profiles.role) in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
  )
);

drop policy if exists "Admins manage partner store inventory" on public.partner_store_inventory;
create policy "Admins manage partner store inventory"
on public.partner_store_inventory
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and lower(profiles.role) in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
  )
)
with check (
  exists (
    select 1
    from public.profiles as profiles
    where profiles.id = (select auth.uid())
      and lower(profiles.role) in ('admin', 'administrator', 'pemilik', 'pemilik_toko', 'owner')
  )
);

create or replace function public.record_partner_sale(
  p_partner_store_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_payment_method text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_stock integer;
  v_sku text;
  v_name text;
  v_unit_price numeric;
  v_total numeric;
  v_transaction_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1' using errcode = '22023';
  end if;

  select lower(profiles.role)
  into v_role
  from public.profiles as profiles
  where profiles.id = v_user_id;

  if coalesce(v_role, '') not in ('mitra', 'partner') then
    raise exception 'Only partner users can record store sales' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.partner_stores as stores
    where stores.id = p_partner_store_id
      and stores.owner_id = v_user_id
      and stores.is_active
  ) then
    raise exception 'Store not found or not owned by current user' using errcode = '42501';
  end if;

  select inventory.stock_quantity, products.sku, products.name, products.selling_price
  into v_stock, v_sku, v_name, v_unit_price
  from public.partner_store_inventory as inventory
  join public.products as products on products.id = inventory.product_id
  where inventory.partner_store_id = p_partner_store_id
    and inventory.product_id = p_product_id
    and products.is_active
  for update of inventory;

  if not found then
    raise exception 'Product is not stocked at this store' using errcode = 'P0002';
  end if;

  if v_stock < p_quantity then
    raise exception 'Insufficient store stock' using errcode = 'P0001';
  end if;

  v_total := v_unit_price * p_quantity;

  update public.partner_store_inventory
  set stock_quantity = stock_quantity - p_quantity,
      updated_at = pg_catalog.now()
  where partner_store_id = p_partner_store_id
    and product_id = p_product_id;

  insert into public.sales_transactions (
    transaction_number,
    channel,
    partner_store_id,
    created_by,
    items,
    subtotal,
    discount,
    total,
    payment_method,
    status,
    sold_at
  ) values (
    'MITRA-' || pg_catalog.to_char(pg_catalog.clock_timestamp(), 'YYYYMMDDHH24MISS') || '-' || pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text, '-', ''), 1, 8),
    'partner_store',
    p_partner_store_id,
    v_user_id,
    pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'product_id', p_product_id,
      'sku', v_sku,
      'name', v_name,
      'quantity', p_quantity,
      'unit_price', v_unit_price,
      'line_total', v_total
    )),
    v_total,
    0,
    v_total,
    p_payment_method,
    'completed',
    pg_catalog.now()
  ) returning id into v_transaction_id;

  return v_transaction_id;
end;
$$;

drop policy if exists "Anon uploads product images" on storage.objects;
drop policy if exists "Authenticated users upload product images" on storage.objects;
create policy "Authenticated users upload product images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'products'
  and (storage.foldername(name))[1] = 'product-images'
);

revoke all on function public.record_partner_sale(uuid, uuid, integer, text) from public, anon;
grant execute on function public.record_partner_sale(uuid, uuid, integer, text) to authenticated;
grant select on public.partner_store_inventory to authenticated;