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

  select products.stock_quantity, products.sku, products.name, products.selling_price
  into v_stock, v_sku, v_name, v_unit_price
  from public.products as products
  where products.id = p_product_id
    and products.is_active
  for update;

  if not found then
    raise exception 'Product not found or inactive' using errcode = 'P0002';
  end if;

  if v_stock < p_quantity then
    raise exception 'Insufficient stock for this sale' using errcode = 'P0001';
  end if;

  v_total := v_unit_price * p_quantity;

  update public.products
  set stock_quantity = stock_quantity - p_quantity,
      updated_at = pg_catalog.now()
  where id = p_product_id;

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

revoke all on function public.record_partner_sale(uuid, uuid, integer, text) from public, anon;
grant execute on function public.record_partner_sale(uuid, uuid, integer, text) to authenticated;